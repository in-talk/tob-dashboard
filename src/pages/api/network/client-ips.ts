import db from "@/lib/db";
import { parseIpList } from "@/lib/network/ip";
import {
  ValidationError,
  crudHandler,
  insertClientIps,
  parseId,
  parseIp,
  parseProvider,
} from "@/lib/network/server";

const DUPLICATE = "This client already has that IP";

export default crudHandler({
  table: "client_ips",
  listSql: `
    SELECT ci.id, ci.client_id, c.name AS client_name, host(ci.ip) AS ip,
           ci.provider, ci.created_at, ci.updated_at, ci.updated_by
    FROM client_ips ci
    LEFT JOIN clients c ON c.client_id = ci.client_id
    ORDER BY c.name NULLS LAST, ci.ip`,
  parse: (body) => ({
    client_id: parseId(body.client_id, "Client", false),
    ip: parseIp(body.ip),
    provider: parseProvider(body.provider, false),
  }),
  // POST accepts a comma-separated list so several IPs can be added at once.
  create: async (body, actor) => {
    const clientId = parseId(body.client_id, "Client", false);
    const provider = parseProvider(body.provider, false);
    const { valid, invalid } = parseIpList(String(body.ips ?? body.ip ?? ""));
    if (invalid.length) {
      throw new ValidationError(`Invalid IP address(es): ${invalid.join(", ")}`);
    }
    if (!valid.length) throw new ValidationError("At least one IP address is required");

    const { inserted, skipped } = await insertClientIps(db, clientId, valid, provider, actor);
    if (!inserted.length) throw new ValidationError(`${DUPLICATE}: ${skipped.join(", ")}`);
    return {
      inserted,
      skipped,
      message:
        `Added ${inserted.length} IP(s)` +
        (skipped.length ? `; skipped existing: ${skipped.join(", ")}` : ""),
    };
  },
  constraintMessages: {
    client_ips_client_ip_key: DUPLICATE,
    client_ips_unassigned_ip_key: "This IP is already registered without a client",
    client_ips_client_id_fkey: "Selected client no longer exists",
  },
});
