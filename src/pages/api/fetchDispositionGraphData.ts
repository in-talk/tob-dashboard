import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

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
    } = req.body;

  const fromDate = new Date(from_date);
  const toDate = new Date(to_date);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new Error("Invalid date format");
  }

  const diffInHours =
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60);

  const main_interval = (diffInHours / 24) * 60;

  if (!client_id) {
    return res.status(400).json({ error: "client_id is required" });
  }
  try {
    const result = await db.query(
      `SELECT * FROM get_disposition_by_intervals_enhanced($1, $2, $3, $4, $5);`,
      [client_id, from_date, to_date, main_interval, 60]
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
