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

  const limit = Math.min(Number(req.query.limit) || 50, 200);

  try {
    const [list, count] = await Promise.all([
      db.query(
        `SELECT n.id, n.type, n.call_id, n.client_id, n.title, n.body,
                n.severity, n.created_at,
                (r.notification_id IS NOT NULL) AS is_read
         FROM notifications n
         LEFT JOIN notification_reads r
                ON r.notification_id = n.id AND r.user_id = $1
         ORDER BY n.created_at DESC
         LIMIT $2`,
        [userId, limit]
      ),
      db.query(
        `SELECT COUNT(*)::int AS unread
         FROM notifications n
         LEFT JOIN notification_reads r
                ON r.notification_id = n.id AND r.user_id = $1
         WHERE r.notification_id IS NULL`,
        [userId]
      ),
    ]);

    res.status(200).json({
      notifications: list.rows,
      unread: count.rows[0]?.unread ?? 0,
    });
  } catch (error) {
    // Tables not created yet (cron hasn't run) — behave as "no notifications"
    // instead of 500ing the bell.
    if ((error as { code?: string }).code === "42P01") {
      return res.status(200).json({ notifications: [], unread: 0 });
    }
    console.error("Error fetching notifications:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
