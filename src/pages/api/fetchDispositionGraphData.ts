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
    timezone = "UTC",
  } = req.body;

  const fromDate = new Date(from_date);
  const toDate = new Date(to_date);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return res.status(400).json({ error: "Invalid date format" });
  }

  // Normalize both to UTC start of day
  fromDate.setUTCHours(0, 0, 0, 0);
  toDate.setUTCHours(0, 0, 0, 0);

  const isSameDay =
    fromDate.getUTCFullYear() === toDate.getUTCFullYear() &&
    fromDate.getUTCMonth() === toDate.getUTCMonth() &&
    fromDate.getUTCDate() === toDate.getUTCDate();

  let main_interval: number;
  let small_interval: number = 5;

  function roundUpToNext30(num: number) {
    return Math.ceil(num / 30) * 30;
  }

  const diffInMs = toDate.getTime() - fromDate.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  if (isSameDay) {
    main_interval = 60;
    small_interval = 5;
  } else {
    const rawInterval = (diffInHours / 24) * 60;
    main_interval = roundUpToNext30(rawInterval);

    // Scale small interval to keep data points manageable (around 300-500 points)
    if (diffInHours <= 48) {
      small_interval = 10;
    } else if (diffInHours <= 24 * 7) {
      small_interval = 30;
    } else if (diffInHours <= 24 * 14) {
      small_interval = 60;
    } else {
      small_interval = 120; // 2 hours
    }
  }

  console.log(
    "fetchDispositionGraphData==>",
    main_interval,
    small_interval,
    client_id,
    formatDateForDB(from_date),
    formatDateForDB(to_date)
  );

  if (!client_id) {
    return res.status(400).json({ error: "client_id is required" });
  }

  try {
    const result = await db.query(
      `SELECT * FROM get_disposition_intervals($1, $2, $3, $4, $5, $6);`,
      [
        formatDateForDB(from_date),
        formatDateForDB(to_date),
        small_interval,
        main_interval,
        client_id,
        timezone,
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
