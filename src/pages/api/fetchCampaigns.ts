import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db"; // Adjust based on your actual DB wrapper

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await db.query(
      `select campaign_id, campaign_name, campaign_description, isactive, campaign_code from public.campaigns`
    );
    res.status(200).json({
      campaigns: result.rows,
    });
  } catch (error) {
    console.error("Error getting campaigns:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
