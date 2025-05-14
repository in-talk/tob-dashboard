import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import db from "@/lib/db"; // Use our database utility instead of Prisma

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { email, password, name, role, client_id } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUserResult = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await db.query(
      `INSERT INTO users (email, password, name, role, client_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [email.toLowerCase(), hashedPassword, name, role, client_id || null]
    );

    const userId = insertResult.rows[0].id;

    res.status(201).json({
      message: "User created successfully",
      userId: userId,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    
    if (error instanceof Error) {
      console.error(error.message);
      if ('code' in error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error(`Database error code: ${(error as any).code}`);
      }
    }
    
    res.status(500).json({ error: "Failed to create user" });
  }
}