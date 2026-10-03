// Server-only: keep GCP firewall rules' source ranges equal to client_ips.
//
// Configuration (.env):
//   GCP_FIREWALL_PROJECT      default project for rules listed without one
//   GCP_FIREWALL_RULES        comma-separated rule names; "other-project/rule"
//                             targets a different project
//   GCP_FIREWALL_KEEP_RANGES  optional IPs/CIDRs that aren't client IPs but
//                             must stay in every rule (office, VPN, monitoring)
//
// Every rule ends up containing exactly: all client IPs + KEEP_RANGES — as
// source ranges for INGRESS rules, destination ranges for EGRESS rules.

import db from "@/lib/db";
import { getFirewall, rangeField, setFirewallRanges } from "./gcp";
import { parseCidrList } from "./ip";
import { ValidationError } from "./server";
import { FirewallSyncPlan } from "./types";

type RuleRef = { key: string; project_id: string; rule_name: string };

const RULE_RE = /^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$/;
const PROJECT_RE = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

/** Parse GCP_FIREWALL_RULES; throws a ValidationError naming any bad entry. */
export function configuredRules(): RuleRef[] {
  const defaultProject = process.env.GCP_FIREWALL_PROJECT?.trim() ?? "";
  const rules: RuleRef[] = [];
  for (const entry of (process.env.GCP_FIREWALL_RULES ?? "").split(",")) {
    const raw = entry.trim();
    if (!raw) continue;
    const [project_id, rule_name] = raw.includes("/") ? raw.split("/", 2) : [defaultProject, raw];
    if (!PROJECT_RE.test(project_id)) {
      throw new ValidationError(
        `GCP_FIREWALL_RULES entry "${raw}" has no valid project — set GCP_FIREWALL_PROJECT or write it as project/rule`
      );
    }
    if (!RULE_RE.test(rule_name)) {
      throw new ValidationError(`GCP_FIREWALL_RULES entry "${raw}" is not a valid firewall rule name`);
    }
    const key = `${project_id}/${rule_name}`;
    if (!rules.some((r) => r.key === key)) rules.push({ key, project_id, rule_name });
  }
  return rules;
}

function keepRanges(): string[] {
  const { valid, invalid } = parseCidrList(process.env.GCP_FIREWALL_KEEP_RANGES);
  if (invalid.length) {
    throw new ValidationError(`GCP_FIREWALL_KEEP_RANGES has invalid range(s): ${invalid.join(", ")}`);
  }
  return valid;
}

/** Canonical, sorted, de-duplicated form so GCP and DB values compare equal
 *  ("1.2.3.4/32" == "1.2.3.4", IPv6 spelling differences, host bits). */
async function canonical(ranges: string[]): Promise<string[]> {
  if (!ranges.length) return [];
  const result = await db.query(
    `SELECT DISTINCT
            CASE WHEN masklen(i) = CASE family(i) WHEN 4 THEN 32 ELSE 128 END
                 THEN host(i) ELSE text(network(i)) END AS r
     FROM unnest($1::inet[]) AS i
     ORDER BY 1`,
    [ranges]
  );
  return result.rows.map((row) => row.r as string);
}

/** What every rule should contain: all client IPs + the keep-list. */
async function desiredRanges(): Promise<string[]> {
  const result = await db.query("SELECT DISTINCT host(ip) AS ip FROM client_ips");
  return canonical([...result.rows.map((r) => r.ip as string), ...keepRanges()]);
}

async function planRule(rule: RuleRef, desired: string[]): Promise<FirewallSyncPlan> {
  try {
    const firewall = await getFirewall(rule.project_id, rule.rule_name);
    const current = await canonical(firewall[rangeField(firewall.direction)] ?? []);
    const currentSet = new Set(current);
    const desiredSet = new Set(desired);

    // GCP treats an empty range list as 0.0.0.0/0: an ingress rule with no
    // source (and no source tags/service accounts) applies to every source,
    // an egress rule with no destination to every destination.
    let blocked: string | undefined;
    if (desired.length === 0) {
      if (firewall.direction === "EGRESS") {
        blocked = "No client IPs — syncing would make the rule apply to every destination";
      } else if (!firewall.sourceTags?.length && !firewall.sourceServiceAccounts?.length) {
        blocked = "No client IPs — syncing would make the rule apply to every source";
      }
    }

    return {
      ...rule,
      direction: firewall.direction,
      network: firewall.network.split("/").pop() ?? firewall.network,
      disabled: !!firewall.disabled,
      desired,
      to_add: desired.filter((r) => !currentSet.has(r)),
      to_remove: current.filter((r) => !desiredSet.has(r)),
      unchanged: desired.filter((r) => currentSet.has(r)).length,
      blocked,
    };
  } catch (error) {
    return {
      ...rule,
      desired: [],
      to_add: [],
      to_remove: [],
      unchanged: 0,
      error: error instanceof Error ? error.message : "Failed to read rule",
    };
  }
}

/** Read-only: what would change in GCP for each configured rule. */
export async function previewFirewallSync(): Promise<FirewallSyncPlan[]> {
  const rules = configuredRules();
  if (!rules.length) return [];
  const desired = await desiredRanges();
  return Promise.all(rules.map((rule) => planRule(rule, desired)));
}

/**
 * Re-plan against live GCP state (never trusts a stale preview) and push each
 * rule that has changes. Rules are independent: one failure doesn't stop the
 * others.
 */
export async function applyFirewallSync(): Promise<FirewallSyncPlan[]> {
  const plans = await previewFirewallSync();
  return Promise.all(
    plans.map(async (plan) => {
      if (plan.error || plan.blocked) {
        return { ...plan, applied: false, error: plan.error ?? plan.blocked };
      }
      if (!plan.to_add.length && !plan.to_remove.length) {
        return { ...plan, applied: true, result: "Already in sync" };
      }
      try {
        await setFirewallRanges(plan.project_id, plan.rule_name, plan.direction!, plan.desired);
        return { ...plan, applied: true, result: `+${plan.to_add.length} / −${plan.to_remove.length}` };
      } catch (error) {
        return { ...plan, applied: false, error: error instanceof Error ? error.message : "Sync failed" };
      }
    })
  );
}
