import db from "@/lib/db";
import {
  ValidationError,
  crudHandler,
  findOrCreateClientIp,
  parseId,
  parseIp,
  parseProvider,
} from "@/lib/network/server";

export default crudHandler({
  table: "kamailio_client_ip_map",
  listSql: `
    SELECT m.id, m.kamailio_id, host(k.ip) AS kamailio_ip,
           m.client_ip_id, host(ci.ip) AS client_ip,
           ci.client_id, c.name AS client_name,
           m.created_at, m.updated_at, m.updated_by
    FROM kamailio_client_ip_map m
    JOIN kamailio_config k ON k.id = m.kamailio_id
    JOIN client_ips ci     ON ci.id = m.client_ip_id
    LEFT JOIN clients c    ON c.client_id = ci.client_id
    ORDER BY k.ip, c.name NULLS LAST, ci.ip`,
  parse: (body) => ({
    kamailio_id: parseId(body.kamailio_id, "Kamailio server"),
    client_ip_id: parseId(body.client_ip_id, "Client IP"),
  }),
  // Either map an existing client IP (client_ip_id) or type a new IP
  // (new_ip), which is registered in client_ips first — optionally under the
  // selected client — in the same transaction.
  create: async (body, actor) => {
    const kamailioId = parseId(body.kamailio_id, "Kamailio server");
    const hasNewIp = typeof body.new_ip === "string" && body.new_ip.trim() !== "";
    if (!hasNewIp && !body.client_ip_id) {
      throw new ValidationError("Select a client IP or enter a new IP");
    }

    const id = await db.withTransaction(async (tx) => {
      const clientIpId = hasNewIp
        ? await findOrCreateClientIp(
            tx,
            parseId(body.client_id, "Client", false),
            parseIp(body.new_ip),
            parseProvider(body.provider, false),
            actor
          )
        : parseId(body.client_ip_id, "Client IP");

      const result = await tx.query(
        `INSERT INTO kamailio_client_ip_map (kamailio_id, client_ip_id, updated_by)
         VALUES ($1, $2, $3) RETURNING id`,
        [kamailioId, clientIpId, actor]
      );
      return result.rows[0].id;
    });
    return { id, message: "Mapping created" };
  },
  constraintMessages: {
    kamailio_client_ip_map_key: "This IP is already mapped to that Kamailio server",
    kamailio_client_ip_map_kamailio_id_fkey: "Selected Kamailio server no longer exists",
    kamailio_client_ip_map_client_ip_id_fkey: "Selected client IP no longer exists",
    client_ips_client_id_fkey: "Selected client no longer exists",
  },
});
