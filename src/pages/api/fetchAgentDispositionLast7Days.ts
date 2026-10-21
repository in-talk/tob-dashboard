import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { AuthedUser, requireClientAccess, withApiAuth } from "@/lib/auth/guard";

async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
    user: AuthedUser
) {

    const { client_id } = req.body ?? {};

    const clientIdInt = await requireClientAccess(user, client_id, res);
    if (clientIdInt === null) return;

    try {

        const result = await db.query(
            `SELECT * FROM public.get_agent_disposition_last_7_days($1);`,
            [clientIdInt]
        );

        // removed debug log for DB result count

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

export default withApiAuth(handler, { roles: { POST: ["admin", "user"] } });
