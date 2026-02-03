import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { formatDateForDB } from "@/utils/formatDateTime";
import * as XLSX from "xlsx";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const {
        client_id,
        from_date,
        to_date,
        caller_id = null,
        call_id = null,
        search_term = null,
    } = req.body;

    if (!client_id) {
        return res.status(400).json({ error: "client_id is required" });
    }

    try {
        // Call the postgres function
        const result = await db.query(
            `SELECT * FROM get_interactions_report($1, $2, $3, $4, $5, $6);`,
            [
                client_id,
                from_date ? formatDateForDB(from_date) : null,
                to_date ? formatDateForDB(to_date) : null,
                call_id ? parseInt(call_id.toString()) : null,
                caller_id || null,
                search_term || null,
            ]
        );

        // Extraction logic for JSONB return { total_records: ..., data: [...] }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any[] = [];
        if (result.rows.length > 0) {
            const functionResult = result.rows[0].get_interactions_report;
            // The function returns an object like { total_records: 123, data: [...] }
            if (functionResult && functionResult.data) {
                data = functionResult.data;
            }
        }

        if (!data || data.length === 0) {
            // Return empty excel or valid excel with no data
        }

        // Create Excel
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Interactions Report");

        const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Interactions_Report_${new Date().toISOString().split('T')[0]}.xlsx`
        );

        res.send(buf);

    } catch (error) {
        console.error("Error generating report:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
}
