import { crudHandler, parseIp, parseOptionalIp, parseProvider } from "@/lib/network/server";

export default crudHandler({
  table: "asterisk_machines",
  listSql: `
    SELECT id, host(ip) AS ip, host(private_ip) AS private_ip, provider,
           created_at, updated_at, updated_by
    FROM asterisk_machines
    ORDER BY ip`,
  parse: (body) => ({
    ip: parseIp(body.ip, "Public IP"),
    private_ip: parseOptionalIp(body.private_ip, "Private IP"),
    provider: parseProvider(body.provider, true),
  }),
  constraintMessages: {
    asterisk_machines_ip_key: "An Asterisk machine with this public IP already exists",
    asterisk_machines_private_ip_key:
      "Another Asterisk machine on this provider already has that private IP",
  },
});
