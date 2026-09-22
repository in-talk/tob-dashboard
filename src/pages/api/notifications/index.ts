import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import db from "@/lib/db";

// Recent notifications + unread count for the header bell. Content is global
// (every user sees all call-error notifications) but read state is PER-USER
// via the notification_reads table. Polled by the bell via SWR.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Admin-only feature.
  if (session?.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);

  try {
    const result = await db.query(`SELECT * from get_notifications($1, $2::int) AS data`, [
      userId,
      limit,
    ]);
    const data = result.rows[0]?.data ?? { notifications: [], unread: 0 };
    res.status(200).json(data);
  } catch (error) {
    // Function/tables not created yet — behave as "no notifications" instead
    // of 500ing the bell. 42P01 = undefined table, 42883 = undefined function.
    const code = (error as { code?: string }).code;
    if (code === "42P01" || code === "42883") {
      return res.status(200).json({ notifications: [], unread: 0 });
    }
    console.error("Error fetching notifications:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
