// Server-only: diff and push client IPs to GCP firewall rules.

import db from "@/lib/db";
import { GcpError, getFirewall, setFirewallSourceRanges } from "./gcp";
import { FirewallScope, FirewallSyncPlan } from "./types";

type RuleRow = {
  id: string;
  project_id: string;
  rule_name: string;
  scope: FirewallScope;
  client_id: string | null;
  client_name: string | null;
  kamailio_id: string | null;
  kamailio_ip: string | null;
  static_ranges: string[];
};

const RULE_SQL = `
  SELECT r.id, r.project_id, r.rule_name, r.scope, r.client_id, c.name AS client_name,
         r.kamailio_id, host(k.ip) AS kamailio_ip,
         ARRAY(SELECT text(s) FROM unnest(r.static_ranges) s) AS static_ranges
  FROM gcp_firewall_rules r
  LEFT JOIN clients c         ON c.client_id = r.client_id
  LEFT JOIN kamailio_config k ON k.id = r.kamailio_id`;

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

/** The ranges a rule *should* contain according to the database. */
async function desiredRanges(rule: RuleRow): Promise<string[]> {
  const where =
    rule.scope === "client"
      ? { sql: "WHERE ci.client_id = $1", params: [rule.client_id] }
      : rule.scope === "kamailio"
        ? {
            sql: "JOIN kamailio_client_ip_map m ON m.client_ip_id = ci.id WHERE m.kamailio_id = $1",
            params: [rule.kamailio_id],
          }
        : { sql: "", params: [] };
  const result = await db.query(
    `SELECT DISTINCT host(ci.ip) AS ip FROM client_ips ci ${where.sql}`,
    where.params
  );
  return canonical([...result.rows.map((r) => r.ip as string), ...rule.static_ranges]);
}

function scopeLabel(rule: RuleRow): string {
  if (rule.scope === "client") return `Client: ${rule.client_name ?? rule.client_id}`;
  if (rule.scope === "kamailio") return `Kamailio: ${rule.kamailio_ip ?? rule.kamailio_id}`;
  return "All client IPs";
}

async function planRule(rule: RuleRow): Promise<FirewallSyncPlan> {
  const base = {
    id: rule.id,
    project_id: rule.project_id,
    rule_name: rule.rule_name,
    scope_label: scopeLabel(rule),
  };
  try {
    const [desired, firewall] = await Promise.all([
      desiredRanges(rule),
      getFirewall(rule.project_id, rule.rule_name),
    ]);
    const current = await canonical(firewall.sourceRanges ?? []);
    const currentSet = new Set(current);
    const desiredSet = new Set(desired);

    let blocked: string | undefined;
    if (firewall.direction !== "INGRESS") {
      blocked = "Only INGRESS rules can be synced";
    } else if (
      desired.length === 0 &&
      !firewall.sourceTags?.length &&
      !firewall.sourceServiceAccounts?.length
    ) {
      // GCP treats an ingress rule with no source at all as 0.0.0.0/0.
      blocked = "No IPs to whitelist — syncing would leave the rule open to every source";
    }

    return {
      ...base,
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
      ...base,
      desired: [],
      to_add: [],
      to_remove: [],
      unchanged: 0,
      error: error instanceof Error ? error.message : "Failed to read rule",
    };
  }
}

async function loadRules(ruleIds?: string[]): Promise<RuleRow[]> {
  const result = ruleIds?.length
    ? await db.query(`${RULE_SQL} WHERE r.id = ANY($1::bigint[]) ORDER BY r.project_id, r.rule_name`, [ruleIds])
    : await db.query(`${RULE_SQL} ORDER BY r.project_id, r.rule_name`);
  return result.rows;
}

/** Read-only: what would change in GCP for each rule. */
export async function previewFirewallSync(ruleIds?: string[]): Promise<FirewallSyncPlan[]> {
  const rules = await loadRules(ruleIds);
  return Promise.all(rules.map(planRule));
}

/**
 * Re-plan against live GCP state (never trusts a stale preview) and push each
 * rule that has changes. Rules are independent: one failure doesn't stop the
 * others. Outcome is recorded on the rule row.
 */
export async function applyFirewallSync(actor: string, ruleIds?: string[]): Promise<FirewallSyncPlan[]> {
  const plans = await previewFirewallSync(ruleIds);

  return Promise.all(
    plans.map(async (plan) => {
      let status: "ok" | "error" = "ok";
      let message: string;

      if (plan.error || plan.blocked) {
        status = "error";
        message = (plan.error ?? plan.blocked)!;
      } else if (!plan.to_add.length && !plan.to_remove.length) {
        message = "Already in sync";
      } else {
        try {
          await setFirewallSourceRanges(plan.project_id, plan.rule_name, plan.desired);
          message = `+${plan.to_add.length} / -${plan.to_remove.length}`;
        } catch (error) {
          status = "error";
          message = error instanceof GcpError || error instanceof Error ? error.message : "Sync failed";
        }
      }

      await db.query(
        `UPDATE gcp_firewall_rules
         SET last_synced_at = now(), last_synced_by = $2,
             last_sync_status = $3, last_sync_message = $4
         WHERE id = $1`,
        [plan.id, actor, status, message]
      );
      return { ...plan, applied: status === "ok", result: message, error: status === "error" ? message : undefined };
    })
  );
}
