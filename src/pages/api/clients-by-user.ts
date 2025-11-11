import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db"; // same DB connection

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return getAgentsByCampaign(req, res);
    case "POST":
      return createAgentByCampaign(req, res);
    case "PUT":
      return updateAgentByCampaign(req, res);
    case "DELETE":
      return deleteAgentByCampaign(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

async function getAgentsByCampaign(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await db.query(`
      SELECT c.name as client_name,
          c.client_id, u.name as user_name,
          u.id as user_id, cbu.updated_at
          FROM clients c
          INNER JOIN clients_by_users cbu ON c.client_id = cbu.client_id
          INNER JOIN users u on u.id = cbu.user_id order by cbu.updated_at;
    `);

    return res.status(200).json(result.rows);
  } catch (error: unknown) {
    console.error("Failed to fetch agents by campaign:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res
      .status(500)
      .json({ error: "Failed to fetch agents by campaign" });
  }
}

async function createAgentByCampaign(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { is_active = false, agent_id, campaign_id } = req.body;

    if (!agent_id || !campaign_id) {
      return res.status(400).json({
        error: "Missing required fields (agent_id, campaign_id)",
      });
    }

    const insertResult = await db.query(
      `
        INSERT INTO agents_by_campaign (isactive, agent_id, campaign_id)
        VALUES ($1, $2, $3)
        RETURNING id;
      `,
      [is_active, agent_id, campaign_id]
    );

    const newId = insertResult.rows[0].id;

    return res.status(201).json({
      message: "Agent-Campaign relation created successfully",
      id: newId,
    });
  } catch (error: unknown) {
    console.error("Error creating agent-campaign relation:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res
      .status(500)
      .json({ error: "An unknown error occurred while creating relation" });
  }
}

async function updateAgentByCampaign(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id, agent_id, campaign_id, is_active } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Record ID is required" });
    }

    const updateResult = await db.query(
      `
        UPDATE agents_by_campaign
        SET agent_id = $1, campaign_id = $2, isactive = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *;
      `,
      [agent_id, campaign_id, is_active, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    return res.status(200).json({
      message: "Agent-Campaign relation updated successfully",
      record: updateResult.rows[0],
    });
  } catch (error: unknown) {
    console.error("Error updating agent-campaign relation:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
}

async function deleteAgentByCampaign(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Record ID is required" });
    }

    const deleteResult = await db.query(
      "DELETE FROM agents_by_campaign WHERE id = $1 RETURNING *;",
      [id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    return res
      .status(200)
      .json({ message: "Agent-Campaign relation deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting agent-campaign relation:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
}
