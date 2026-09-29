import { crudHandler, parseIp, parseProvider } from "@/lib/network/server";

export default crudHandler({
  table: "asterisk_machines",
  listSql: `
    SELECT id, host(ip) AS ip, provider, created_at, updated_at, updated_by
    FROM asterisk_machines
    ORDER BY ip`,
  parse: (body) => ({
    ip: parseIp(body.ip),
    provider: parseProvider(body.provider, true),
  }),
  constraintMessages: {
    asterisk_machines_ip_key: "An Asterisk machine with this IP already exists",
  },
});
