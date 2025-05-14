import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Using the db utility to query all users
    const result = await db.query(`
      SELECT id, name, email, role, client_id, created_at 
      FROM users
      ORDER BY id
    `);
    
    const users = result.rows.map(user => ({
      ...user,
      id: user.id.toString(),
      client_id: user.client_id ? user.client_id.toString() : null,
    }));
    res.status(200).json(users);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ error: `Failed to fetch users: ${error.message}` });
  }
}