import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { requireAdmin, sendError } from "@/lib/network/server";

// Lightweight client list for the searchable client pickers.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }
  if (!(await requireAdmin(req, res))) return;

  try {
    const result = await db.query(
      "SELECT client_id::text AS client_id, name FROM clients ORDER BY name"
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    return sendError(res, error);
  }
}
