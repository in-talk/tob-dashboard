import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db"; // Adjust based on your actual DB wrapper

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { client_id, page = 1, caller_id = null, num_of_records = 0 } = req.body;

    if (!client_id) {
        return res.status(400).json({ error: "client_id is required" });
    }

    try {
        const result = await db.query(
            `SELECT * FROM get_client_data_paginated($1, $2, $3, $4);`,
            [client_id, caller_id, page, num_of_records]
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