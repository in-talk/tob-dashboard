import type { NextApiRequest, NextApiResponse } from "next";
import { applyFirewallSync, previewFirewallSync } from "@/lib/network/firewall";
import { requireAdmin, sendError } from "@/lib/network/server";

// GET  → preview (read-only diff of every GCP_FIREWALL_RULES rule vs client_ips)
// POST → apply; re-reads GCP first, so a stale preview can't be pushed
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const actor = await requireAdmin(req, res);
  if (!actor) return;

  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, rules: await previewFirewallSync() });
    }
    if (req.method === "POST") {
      const rules = await applyFirewallSync();
      const failed = rules.filter((r) => r.error).length;
      console.info(
        `[firewall-sync] by ${actor}:`,
        rules.map((r) => `${r.key} ${r.error ? `ERROR ${r.error}` : r.result}`).join("; ")
      );
      return res.status(200).json({
        ok: true,
        rules,
        message: failed
          ? `Firewall sync finished with ${failed} error(s)`
          : "Firewall rules are in sync",
      });
    }
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    return sendError(res, error);
  }
}
