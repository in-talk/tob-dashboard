import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db"; // Adjust based on your actual DB wrapper

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { call_Id } = req.body;

  if (!call_Id) {
    return res.status(400).json({ error: "call_Id is required" });
  }

  try {
    const result = await db.query(
      `select * from get_call_details_by_call_id($1)`,
      [call_Id]
    );
    res.status(200).json({
      callDetails: result.rows,
    });
  } catch (error) {
    console.error("Error getting call details:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
