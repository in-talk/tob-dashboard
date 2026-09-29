import { crudHandler, parseIp, parseProvider } from "@/lib/network/server";

export default crudHandler({
  table: "kamailio_config",
  listSql: `
    SELECT id, host(ip) AS ip, provider, created_at, updated_at, updated_by
    FROM kamailio_config
    ORDER BY ip`,
  parse: (body) => ({
    ip: parseIp(body.ip),
    provider: parseProvider(body.provider, true),
  }),
  constraintMessages: {
    kamailio_config_ip_key: "A Kamailio server with this IP already exists",
  },
});
