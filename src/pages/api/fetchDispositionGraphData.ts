import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
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
  } = req.body;

  const fromDate = new Date(from_date);
  const toDate = new Date(to_date);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return res.status(400).json({ error: "Invalid date format" });
  }

  const isSameDay =
    fromDate.getFullYear() === toDate.getFullYear() &&
    fromDate.getMonth() === toDate.getMonth() &&
    fromDate.getDate() === toDate.getDate();

  let main_interval: number;
  function roundUpToNext30(num: number) {
    return Math.ceil(num / 30) * 30;
  }

  if (isSameDay) {
    main_interval = 60;
  } else {
    const diffInMs = toDate.getTime() - fromDate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const rawInterval = (diffInHours / 24) * 60;

    main_interval = roundUpToNext30(rawInterval);
  }

  if (!client_id) {
    return res.status(400).json({ error: "client_id is required" });
  }

  try {
    const result = await db.query(
      `SELECT * FROM get_disposition_by_intervals_enhanced($1, $2, $3, $4, $5);`,
      [
        client_id,
        formatDateForDB(from_date),
        formatDateForDB(to_date),
        main_interval,
        5,
      ]
    );
    res.status(200).json({
      graphData: result.rows,
    });
  } catch (error) {
    console.error("Error getting graphData:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
