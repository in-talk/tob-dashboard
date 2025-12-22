import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { client_id } = req.body;

    if (!client_id) {
        return res.status(400).json({ error: "client_id is required" });
    }

    try {
        // Ensure client_id is an integer if it's a numeric string
        const clientIdInt = typeof client_id === 'string' && /^\d+$/.test(client_id)
            ? parseInt(client_id, 10)
            : client_id;


        const result = await db.query(
            `SELECT * FROM public.get_agent_disposition_last_7_days($1);`,
            [clientIdInt]
        );

        console.log("DB Result rows count:", result.rows.length);

        // Robust extraction: handle both single-row JSON array and multi-row results
        let data = [];
        if (result.rows.length > 0) {
            const firstRow = result.rows[0];
            // If the first row has a column named after the function, it's likely the JSON array
            if (firstRow.get_agent_disposition_last_7_days) {
                data = firstRow.get_agent_disposition_last_7_days;
            } else {
                data = result.rows;
            }
        }

        res.status(200).json({
            last7DaysData: data,
        });
    } catch (error) {
        console.error("Error getting last 7 days records:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
}
