import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { AuthedUser, withApiAuth } from "@/lib/auth/guard";
import { isGlobalRole } from "@/lib/auth/roles";

async function handler(req: NextApiRequest, res: NextApiResponse, user: AuthedUser) {
  // Non-admins can only list their own clients, whatever user_id they send.
  let userId = user.id;
  if (isGlobalRole(user.role) && req.query.user_id !== undefined) {
    const requested = String(req.query.user_id);
    if (!/^\d+$/.test(requested)) {
      return res.status(400).json({ error: "user_id must be a valid number" });
    }
    userId = requested;
  }

  const result = await db.query(
    `SELECT c.name, c.client_id
       FROM clients c
       INNER JOIN clients_by_users cbu ON c.client_id = cbu.client_id
      WHERE cbu.user_id = $1`,
    [userId]
  );

  res.status(200).json({ clients: result.rows });
}

export default withApiAuth(handler, { roles: { GET: ["admin", "user"] } });
