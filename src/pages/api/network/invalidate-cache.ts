import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { invalidateOnMachine } from "@/lib/network/cacheAgent";
import { ValidationError, parseId, requireAdmin, sendError } from "@/lib/network/server";

// POST { ids: string[], client_id?: string }
//   client_id set   → GET http://<public ip>:3000/invalidate-cache?clientId=<id>
//   client_id empty → GET http://<public ip>:3000/invalidate-cache (all clients)
// on each selected Asterisk machine, in parallel. IPs are looked up by id so
// this route can't be used to call arbitrary hosts.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }
  const actor = await requireAdmin(req, res);
  if (!actor) return;

  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || !ids.length || !ids.every((id) => /^\d+$/.test(String(id)))) {
      throw new ValidationError("Select at least one Asterisk machine");
    }
    const clientId = parseId(req.body?.client_id, "Client", false);

    if (clientId) {
      const client = await db.query("SELECT 1 FROM clients WHERE client_id = $1", [clientId]);
      if (!client.rowCount) throw new ValidationError("Client not found");
    }

    const { rows } = await db.query(
      `SELECT id::text AS id, name, host(ip) AS ip FROM asterisk_machines
       WHERE id = ANY($1::bigint[]) ORDER BY name NULLS LAST, ip`,
      [ids.map(String)]
    );
    if (!rows.length) throw new ValidationError("None of the selected machines exist anymore");

    const results = await Promise.all(rows.map((m) => invalidateOnMachine(m, clientId)));
    const failed = results.filter((r) => !r.success).length;
    const scope = clientId ? `client ${clientId}` : "all clients";
    console.info(
      `[invalidate-cache] ${scope} by ${actor}:`,
      results.map((r) => `${r.name ?? r.ip} ${r.success ? "OK" : `FAILED ${r.message}`}`).join("; ")
    );
    return res.status(200).json({
      ok: true,
      results,
      message: failed
        ? `Cache reset for ${scope} failed on ${failed} of ${results.length} machine(s)`
        : `Cache reset for ${scope} on ${results.length} machine(s)`,
    });
  } catch (error) {
    return sendError(res, error);
  }
}
