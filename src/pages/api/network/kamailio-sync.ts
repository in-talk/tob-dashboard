import type { NextApiRequest, NextApiResponse } from "next";
import { ValidationError, requireAdmin, sendError } from "@/lib/network/server";
import { buildPreview, listKamailios, syncKamailio } from "@/lib/network/kamailioSync";

// GET  → for every Kamailio: the body that would be sent + anything blocking it.
// POST { ids: string[] } → sync the selected Kamailio servers (in parallel,
//      each independent) and report each server's result.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }
  const actor = await requireAdmin(req, res);
  if (!actor) return;

  try {
    if (req.method === "GET") {
      const servers = await listKamailios();
      const previews = await Promise.all(servers.map(buildPreview));
      return res.status(200).json(previews);
    }

    const ids = req.body?.ids;
    if (!Array.isArray(ids) || !ids.length || !ids.every((id) => /^\d+$/.test(String(id)))) {
      throw new ValidationError("Select at least one Kamailio server");
    }
    const servers = await listKamailios(ids.map(String));
    if (!servers.length) throw new ValidationError("None of the selected Kamailio servers exist anymore");

    const results = await Promise.all(servers.map(syncKamailio));
    // Logged without the API key; request_id lets the Kamailio admin find the audit entry.
    console.info(
      `[kamailio-sync] by ${actor}:`,
      results
        .map((r) => `${r.ip} ${r.status.toUpperCase()} ${r.http_status ?? "-"} ${r.code ?? ""} req=${r.request_id ?? "-"} ${r.status === "success" ? "" : r.message}`.trim())
        .join("; ")
    );
    const ok = results.filter((r) => r.status === "success").length;
    return res.status(200).json({
      ok: true,
      results,
      message:
        ok === results.length
          ? `Synced ${ok} Kamailio server(s)`
          : `Synced ${ok} of ${results.length} Kamailio server(s)`,
    });
  } catch (error) {
    return sendError(res, error);
  }
}
