import { crudHandler, parseId } from "@/lib/network/server";

export default crudHandler({
  table: "kamailio_asterisk_map",
  listSql: `
    SELECT m.id, m.kamailio_id, host(k.ip) AS kamailio_ip,
           m.asterisk_id, a.name AS asterisk_name, host(a.ip) AS asterisk_ip, host(a.private_ip) AS asterisk_private_ip,
           a.provider AS asterisk_provider,
           m.created_at, m.updated_at, m.updated_by
    FROM kamailio_asterisk_map m
    JOIN kamailio_config k   ON k.id = m.kamailio_id
    JOIN asterisk_machines a ON a.id = m.asterisk_id
    ORDER BY k.ip, a.ip`,
  parse: (body) => ({
    kamailio_id: parseId(body.kamailio_id, "Kamailio server"),
    asterisk_id: parseId(body.asterisk_id, "Asterisk machine"),
  }),
  constraintMessages: {
    kamailio_asterisk_map_key: "This Asterisk machine is already mapped to that Kamailio server",
    kamailio_asterisk_map_kamailio_id_fkey: "Selected Kamailio server no longer exists",
    kamailio_asterisk_map_asterisk_id_fkey: "Selected Asterisk machine no longer exists",
  },
});
