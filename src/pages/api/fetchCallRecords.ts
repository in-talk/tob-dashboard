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
  const defaultToDate = new Date().toISOString().split("T")[0];

  const {
    client_id,
    from_date = defaultToDate,
    to_date = `${defaultToDate} 23:59:59`,
    caller_id = null,
    page = 1,
    num_of_records = null,
  } = req.body;

  console.log('fetchCallRecords==>',client_id,formatDateForDB(from_date),formatDateForDB(to_date))
  
  if (!client_id) {
    return res.status(400).json({ error: "client_id is required" });
  }
  try {
    const result = await db.query(
      `SELECT * FROM get_client_data_paginated($1, $2, $3, $4, $5, $6);`,
      [client_id, formatDateForDB(from_date), formatDateForDB(to_date), caller_id, page, num_of_records]
    );
    res.status(200).json({
      callRecords: result.rows || result,
    });
  } catch (error) {
    console.error("Error getting records:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
