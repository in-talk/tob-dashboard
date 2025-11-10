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
    // Get user_id from query parameters
    const { user_id } = req.query;

    // Validate user_id is provided
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    // Convert to number and validate
    const userId = parseInt(user_id as string);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "user_id must be a valid number" });
    }

    const result = await db.query(
      `SELECT c.name, c.client_id
          FROM clients c
          INNER JOIN clients_by_users cbu ON c.client_id = cbu.client_id
          WHERE cbu.user_id = $1`,
      [userId]
    );

    console.log("Fetched clients for user_id:", userId, result.rows);

    res.status(200).json({
      clients: result.rows,
    });
  } catch (error) {
    console.error("Error getting clients:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
