import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db"; // Adjust based on your actual DB wrapper

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { client_id } = req.body;

    if (!client_id) {
        return res.status(400).json({ error: "client_id is required" });
    }

    try {
        const result = await db.query(
            `SELECT * FROM get_agent_disposition_report($1);`,
            [client_id]
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