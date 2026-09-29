import { parseCidrList } from "@/lib/network/ip";
import { ValidationError, crudHandler, parseId } from "@/lib/network/server";
import { FIREWALL_SCOPES, FirewallScope } from "@/lib/network/types";

// GCP naming rules for projects and firewall resources.
const PROJECT_RE = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const RULE_RE = /^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$/;

export default crudHandler({
  table: "gcp_firewall_rules",
  listSql: `
    SELECT r.id, r.project_id, r.rule_name, r.scope,
           r.client_id, c.name AS client_name, r.kamailio_id, host(k.ip) AS kamailio_ip,
           ARRAY(SELECT CASE WHEN masklen(s) = CASE family(s) WHEN 4 THEN 32 ELSE 128 END
                        THEN host(s) ELSE text(s) END
                  FROM unnest(r.static_ranges) s) AS static_ranges,
           r.last_synced_at, r.last_synced_by, r.last_sync_status, r.last_sync_message,
           r.created_at, r.updated_at, r.updated_by
    FROM gcp_firewall_rules r
    LEFT JOIN clients c         ON c.client_id = r.client_id
    LEFT JOIN kamailio_config k ON k.id = r.kamailio_id
    ORDER BY r.project_id, r.rule_name`,
  parse: (body) => {
    const project = String(body.project_id ?? "").trim();
    const rule = String(body.rule_name ?? "").trim();
    if (!PROJECT_RE.test(project)) throw new ValidationError("Enter a valid GCP project ID");
    if (!RULE_RE.test(rule)) throw new ValidationError("Enter a valid firewall rule name");

    const scope = body.scope as FirewallScope;
    if (!FIREWALL_SCOPES.includes(scope)) throw new ValidationError("Choose what the rule should contain");

    const staticInput = Array.isArray(body.static_ranges)
      ? body.static_ranges.join(",")
      : String(body.static_ranges ?? "");
    const { valid, invalid } = parseCidrList(staticInput);
    if (invalid.length) throw new ValidationError(`Invalid range(s): ${invalid.join(", ")}`);

    return {
      project_id: project,
      rule_name: rule,
      scope,
      client_id: scope === "client" ? parseId(body.client_id, "Client") : null,
      kamailio_id: scope === "kamailio" ? parseId(body.kamailio_id, "Kamailio server") : null,
      static_ranges: valid,
    };
  },
  constraintMessages: {
    gcp_firewall_rules_rule_key: "This firewall rule is already registered",
    gcp_firewall_rules_client_id_fkey: "Selected client no longer exists",
    gcp_firewall_rules_kamailio_id_fkey: "Selected Kamailio server no longer exists",
  },
});
