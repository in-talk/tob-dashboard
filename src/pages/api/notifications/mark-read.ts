import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import db from "@/lib/db";

// Mark one notification read ({ id }) or all of them ({ all: true }) for the
// current user. Read state is per-user (notification_reads), so this never
// affects what other users see.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id, all } = req.body ?? {};
  if (!all && (id === undefined || id === null)) {
    return res.status(400).json({ error: "Provide `id` or `all: true`." });
  }

  try {
    if (all) {
      // Insert a read row for every notification this user hasn't read yet.
      await db.query(
        `INSERT INTO notification_reads (notification_id, user_id)
         SELECT n.id, $1
         FROM notifications n
         LEFT JOIN notification_reads r
                ON r.notification_id = n.id AND r.user_id = $1
         WHERE r.notification_id IS NULL`,
        [userId]
      );
    } else {
      await db.query(
        `INSERT INTO notification_reads (notification_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (notification_id, user_id) DO NOTHING`,
        [id, userId]
      );
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    // Tables not created yet — nothing to mark.
    if ((error as { code?: string }).code === "42P01") {
      return res.status(200).json({ ok: true });
    }
    console.error("Error marking notification read:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
