import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db"; // same DB connection

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return getClientsByUser(req, res);
    case "POST":
      return createClientByUser(req, res);
    case "PUT":
      return updateClientByUser(req, res);
    case "DELETE":
      return deleteClientByUser(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

async function getClientsByUser(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await db.query(`
      SELECT cbu.id, c.name as client_name,
          c.client_id, u.name as user_name,
          u.id as user_id, cbu.updated_at
          FROM clients c
          INNER JOIN clients_by_users cbu ON c.client_id = cbu.client_id
          INNER JOIN users u on u.id = cbu.user_id order by cbu.updated_at;
    `);

    return res.status(200).json(result.rows);
  } catch (error: unknown) {
    console.error("Failed to fetch clients by user:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res
      .status(500)
      .json({ error: "Failed to fetch clients by user" });
  }
}

async function createClientByUser(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { client_id, user_id } = req.body;

    if (!client_id || !user_id) {
      return res.status(400).json({
        error: "Missing required fields (client_id, user_id)",
      });
    }

    const insertResult = await db.query(
      `
        INSERT INTO clients_by_users (client_id, user_id)
        VALUES ($1, $2)
        RETURNING id;
      `,
      [client_id, user_id]
    );

    const newId = insertResult.rows[0].id;

    return res.status(201).json({
      ok: true,
      message: "Client-User relation created successfully",
      id: newId,
    });
  } catch (error: unknown) {
    console.error("Error creating client-user relation:", error);
    if (error instanceof Error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res
      .status(500)
      .json({ ok: false, error: "An unknown error occurred while creating relation" });
  }
}

async function updateClientByUser(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id, client_id, user_id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Record ID is required" });
    }

    const updateResult = await db.query(
      `
        UPDATE clients_by_users
        SET client_id = $1, user_id = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *;
      `,
      [client_id, user_id, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Record not found" });
    }

    return res.status(200).json({
      ok: true,
      message: "Client-User relation updated successfully",
      record: updateResult.rows[0],
    });
  } catch (error: unknown) {
    console.error("Error updating client-user relation:", error);
    if (error instanceof Error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(500).json({ ok: false, error: "An unknown error occurred" });
  }
}

async function deleteClientByUser(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Record ID is required" });
    }

    const deleteResult = await db.query(
      "DELETE FROM clients_by_users WHERE id = $1 RETURNING *;",
      [id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Record not found" });
    }

    return res
      .status(200)
      .json({ ok: true, message: "Client-User relation deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting client-user relation:", error);
    if (error instanceof Error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(500).json({ ok: false, error: "An unknown error occurred" });
  }
}
