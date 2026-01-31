import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case "GET":
            return getUsers(req, res);
        case "POST":
            return createUser(req, res);
        case "PUT":
            return updateUser(req, res);
        case "DELETE":
            return deleteUser(req, res);
        default:
            res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
            return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
    }
}

async function getUsers(req: NextApiRequest, res: NextApiResponse) {
    try {
        const result = await db.query(`
      SELECT id, name, email, role, created_at 
      FROM users
      ORDER BY id ASC
    `);

        const users = result.rows.map(user => ({
            ...user,
            id: user.id.toString(),
        }));

        return res.status(200).json(users);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("Failed to fetch users:", error);
        return res.status(500).json({ ok: false, error: `Failed to fetch users: ${error.message}` });
    }
}

async function createUser(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password || !name || !role) {
            return res.status(400).json({ ok: false, error: "Missing required fields" });
        }

        const existingUserResult = await db.query(
            "SELECT id FROM users WHERE email = $1",
            [email.toLowerCase()]
        );

        if (existingUserResult.rows.length > 0) {
            return res.status(409).json({ ok: false, error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const insertResult = await db.query(
            `INSERT INTO users (email, password, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
            [email.toLowerCase(), hashedPassword, name, role]
        );

        return res.status(201).json({
            ok: true,
            message: "User created successfully",
            userId: insertResult.rows[0].id,
        });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("Error creating user:", error);
        return res.status(500).json({ ok: false, error: error.message });
    }
}

async function updateUser(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { id, email, password, name, role } = req.body;

        if (!id || !email || !name || !role) {
            return res.status(400).json({ ok: false, error: "Missing required fields" });
        }

        let query = "UPDATE users SET email = $1, name = $2, role = $3";
        let params = [email.toLowerCase(), name, role, id];

        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ", password = $4 WHERE id = $5";
            params = [email.toLowerCase(), name, role, hashedPassword, id];
        } else {
            query += " WHERE id = $4";
        }

        const updateResult = await db.query(query + " RETURNING *", params);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: "User not found" });
        }

        return res.status(200).json({
            ok: true,
            message: "User updated successfully",
        });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("Error updating user:", error);
        return res.status(500).json({ ok: false, error: error.message });
    }
}

async function deleteUser(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ ok: false, error: "User ID is required" });
        }

        const deleteResult = await db.query(
            "DELETE FROM users WHERE id = $1 RETURNING *",
            [id]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: "User not found" });
        }

        return res.status(200).json({ ok: true, message: "User deleted successfully" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ ok: false, error: error.message });
    }
}
