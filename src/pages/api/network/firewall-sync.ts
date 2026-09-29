import type { NextApiRequest, NextApiResponse } from "next";
import { applyFirewallSync, previewFirewallSync } from "@/lib/network/firewall";
import { parseId, requireAdmin, sendError } from "@/lib/network/server";

// GET  ?rule_id=…  → preview (read-only diff against live GCP rules)
// POST { rule_ids } → apply; re-reads GCP first, so a stale preview can't be pushed
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const actor = await requireAdmin(req, res);
  if (!actor) return;

  try {
    if (req.method === "GET") {
      const ruleId = parseId(req.query.rule_id, "rule_id", false);
      const rules = await previewFirewallSync(ruleId ? [ruleId] : undefined);
      return res.status(200).json({ ok: true, rules });
    }
    if (req.method === "POST") {
      const ids: unknown[] = Array.isArray(req.body?.rule_ids) ? req.body.rule_ids : [];
      const ruleIds = ids.map((id) => parseId(id, "rule_id")!);
      const rules = await applyFirewallSync(actor, ruleIds.length ? ruleIds : undefined);
      const failed = rules.filter((r) => r.error).length;
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
