import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db"; // Adjust based on your actual DB wrapper

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const defaultToData = new Date().toISOString().split("T")[0];

  const {
    client_id,
    from_date = defaultToData,
    to_date = `${defaultToData} 23:59:59`,
  } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: "client_id is required" });
  }

  try {
    const result = await db.query(
      `SELECT * FROM get_agent_disposition_report($1,$2, $3);`,
      [client_id, from_date, to_date]
    );

    res.status(200).json({
      agentRecords: result.rows,
    });
  } catch (error) {
    console.error("Error getting records:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
