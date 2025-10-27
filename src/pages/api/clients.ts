import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db"; // adjust to your db connection
import { Client } from "@/types/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return getClients(req, res);
    case "POST":
      return createClient(req, res);
    case "PUT":
      return updateClient(req, res);
    case "DELETE":
      return deleteClient(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

async function getClients(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await db.query(`
    SELECT 
    c.client_id,
    c.user_id,
    u.name AS user_name,
    u.email AS user_email,
	cm.campaign_name,
	cm.campaign_code,
    c.campaign_id,
      c.name,
    c.model,
    c.is_active,
    c.metadata,
    c.number_of_lines,
    c.version,
    c.vicidial_address,
    c.vicidial_api_user,
    c.vicidial_api_password,
    c.transfer_group_name,
    c.vicidial_transfer_address,
    c.vicidial_transfer_api_user,
    c.vicidial_transfer_api_pass,
    c.vicidial_transfer_user,
    c.description,
    c.updated_by,
    c.created_at
FROM clients c
INNER JOIN users u ON c.user_id = u.id
INNER JOIN campaigns cm ON c.campaign_id = cm.campaign_id
ORDER BY c.client_id DESC;
    `);

    const clients = result.rows.map((client: Client) => ({
      ...client,
      client_id: client.client_id ? client.client_id.toString() : null,
    }));

    return res.status(200).json(clients);
  } catch (error: unknown) {
    console.error("Failed to fetch clients:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(500).json({ error: "Failed to fetch clients" });
  }
}

async function createClient(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      user_id,
      campaign_id,
      model,
      is_active,
      metadata,
      number_of_lines,
      version,
      vicidial_address,
      vicidial_api_user,
      vicidial_api_password,
      transfer_group_name,
      vicidial_transfer_address,
      vicidial_transfer_api_user,
      vicidial_transfer_api_pass,
      vicidial_transfer_user,
      name,
      description,
      updated_by,
    } = req.body;

    if (!name || !user_id || !campaign_id) {
      return res.status(400).json({
        error: "Missing required fields (name, user_id, campaign_id)",
      });
    }

    const insertResult = await db.query(
      `INSERT INTO clients (
        user_id, campaign_id, model, is_active, metadata, number_of_lines, version,
        vicidial_address, vicidial_api_user, vicidial_api_password, transfer_group_name,
        vicidial_transfer_address, vicidial_transfer_api_user, vicidial_transfer_api_pass,
        vicidial_transfer_user, name, description, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18
      ) RETURNING client_id`,
      [
        user_id,
        campaign_id,
        model,
        is_active,
        metadata,
        number_of_lines,
        version,
        vicidial_address,
        vicidial_api_user,
        vicidial_api_password,
        transfer_group_name,
        vicidial_transfer_address,
        vicidial_transfer_api_user,
        vicidial_transfer_api_pass,
        vicidial_transfer_user,
        name,
        description,
        updated_by,
      ]
    );

    const newClientId = insertResult.rows[0].client_id;

    return res.status(201).json({
      message: "Client created successfully",
      clientId: newClientId,
    });
  } catch (error: unknown) {
    console.error("Error creating client:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(500).json({ error: "An unknown error occurred" });
  }
}

async function updateClient(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      user_id,
      client_id,
      campaign_id,
      model,
      is_active,
      metadata,
      number_of_lines,
      version,
      vicidial_address,
      vicidial_api_user,
      vicidial_api_password,
      transfer_group_name,
      vicidial_transfer_address,
      vicidial_transfer_api_user,
      vicidial_transfer_api_pass,
      vicidial_transfer_user,
      name,
      description,
      updated_by,
    } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: "Client ID is required" });
    }

    const updateResult = await db.query(
      `UPDATE clients SET
    user_id = $1,
    campaign_id = $2,
    model = $3,
    is_active = $4,
    metadata = $5,
    number_of_lines = $6,
    version = $7,
    vicidial_address = $8,
    vicidial_api_user = $9,
    vicidial_api_password = $10,
    transfer_group_name = $11,
    vicidial_transfer_address = $12,
    vicidial_transfer_api_user = $13,
    vicidial_transfer_api_pass = $14,
    vicidial_transfer_user = $15,
    name = $16,
    description = $17,
    updated_by = $18,
    updated_at = CURRENT_TIMESTAMP
  WHERE client_id = $19
  RETURNING *`,
      [
        user_id,
        campaign_id,
        model,
        is_active,
        metadata,
        number_of_lines,
        version,
        vicidial_address,
        vicidial_api_user,
        vicidial_api_password,
        transfer_group_name,
        vicidial_transfer_address,
        vicidial_transfer_api_user,
        vicidial_transfer_api_pass,
        vicidial_transfer_user,
        name,
        description,
        updated_by,
        client_id,
      ]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    return res.status(200).json({
      message: "Client updated successfully",
      client: updateResult.rows[0],
    });
  } catch (error: unknown) {
    console.error("Error updating client:", error);

    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(500).json({ error: "An unknown error occurred" });
  }
}

async function deleteClient(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { client_id } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: "Client ID is required" });
    }

    const deleteResult = await db.query(
      "DELETE from clients where client_id = $1 RETURNING *",
      [client_id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    return res.status(200).json({ message: "Client deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting client:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(500).json({ error: "An unknown error occurred" });
  }
}
