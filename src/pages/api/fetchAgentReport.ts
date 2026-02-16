import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db"; // Adjust based on your actual DB wrapper
import { formatDateForDB } from "@/utils/formatDateTime";

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
    client_ids,
    from_date = defaultToData,
    to_date = `${defaultToData} 23:59:59`,
  } = req.body;

  // Handle both single client_id and multiple client_ids
  let targetClientIds: number[] = [];

  if (client_ids && Array.isArray(client_ids) && client_ids.length > 0) {
    targetClientIds = client_ids.map((id) => Number(id));
  } else if (client_id) {
    targetClientIds = [Number(client_id)];
  } else {
    return res.status(400).json({ error: "client_id or client_ids is required" });
  }

  try {
    let queryText = "";
    let queryParams: any[] = [];

    if (targetClientIds.length > 1) {
      // Multiple clients: use the new function that accepts an array
      queryText = `SELECT * FROM get_agent_disposition_report1($1::bigint[], $2, $3);`;
      queryParams = [targetClientIds, formatDateForDB(from_date), formatDateForDB(to_date)];
    } else {
      // Single client: use the original function that accepts a scalar ID
      queryText = `SELECT * FROM get_agent_disposition_report($1::bigint, $2, $3);`;
      queryParams = [targetClientIds[0], formatDateForDB(from_date), formatDateForDB(to_date)];
    }

    const result = await db.query(queryText, queryParams);

    res.status(200).json({
      agentRecords: result.rows,
    });
  } catch (error) {
    console.error("Error getting records:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
