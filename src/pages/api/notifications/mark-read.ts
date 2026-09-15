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
  // Admin-only feature.
  if (session?.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { id, all } = req.body ?? {};
  if (!all && (id === undefined || id === null)) {
    return res.status(400).json({ error: "Provide `id` or `all: true`." });
  }

  try {
    await db.query(`SELECT mark_notifications_read($1, $2::bigint, $3::boolean)`, [
      userId,
      all ? null : id,
      Boolean(all),
    ]);
    res.status(200).json({ ok: true });
  } catch (error) {
    // Function/tables not created yet — nothing to mark.
    const code = (error as { code?: string }).code;
    if (code === "42P01" || code === "42883") {
      return res.status(200).json({ ok: true });
    }
    console.error("Error marking notification read:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
