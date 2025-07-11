import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    client_id,
    from_date = "2025-06-20",
    to_date = "2025-07-04",
    interval = 120,
  } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: "client_id is required" });
  }
  try {
    const result = await db.query(
      `SELECT * FROM get_disposition_by_intervals($1, $2, $3, $4);`,
      [client_id, from_date, to_date, interval]
    );
    res.status(200).json({
      graphData: result.rows || result,
    });
  } catch (error) {
    console.error("Error getting graphData:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
