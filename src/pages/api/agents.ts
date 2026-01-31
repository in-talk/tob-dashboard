import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db"; // adjust to your db connection
import { Agent } from "@/types/agent";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return getAgents(req, res);
    case "POST":
      return createAgent(req, res);
    case "PUT":
      return updateAgent(req, res);
    case "DELETE":
      return deleteAgent(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

async function getAgents(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await db.query(`
      SELECT a.*, c.campaign_name 
      FROM agents a
      LEFT JOIN campaigns c ON a.campaign_id = c.campaign_id
      ORDER BY a.agent_id ASC;
    `);
    const agents = result.rows.map((agent: Agent) => ({
      ...agent,
      agent_id: agent.agent_id ? agent.agent_id.toString() : null,
      campaign_id: agent.campaign_id ? agent.campaign_id.toString() : null,
    }));
    return res.status(200).json(agents);
  } catch (error: unknown) {
    console.error("Failed to fetch agents:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(500).json({ error: "Failed to fetch agents" });
  }
}

async function createAgent(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { is_active, agent_name, campaign_id } = req.body;

    if (!agent_name) {
      return res.status(400).json({
        error: "Missing required fields (agent_name)",
      });
    }

    const insertResult = await db.query(
      `INSERT INTO agents (
       is_active, agent_name, campaign_id
      ) VALUES (
        $1, $2, $3
      ) RETURNING agent_id`,
      [is_active, agent_name, campaign_id]
    );

    const newAgentId = insertResult.rows[0].agent_id;

    return res.status(201).json({
      ok: true,
      message: "Agent created successfully",
      clientId: newAgentId,
    });
  } catch (error: unknown) {
    console.error("Error creating agent:", error);
    if (error instanceof Error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(500).json({ ok: false, error: "An unknown error occurred" });
  }
}

async function updateAgent(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { is_active, agent_id, agent_name, campaign_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ error: "Agent ID is required" });
    }

    const updateResult = await db.query(
      `
  UPDATE agents 
  SET 
    agent_name = $1,
    is_active = $2,
    campaign_id = $3
  WHERE agent_id = $4
  RETURNING *;
  `,
      [agent_name, is_active, campaign_id, agent_id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Agent not found" });
    }

    return res.status(200).json({
      ok: true,
      message: "Agent updated successfully",
      client: updateResult.rows[0],
    });
  } catch (error: unknown) {
    console.error("Error updating Agent:", error);

    if (error instanceof Error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(500).json({ ok: false, error: "An unknown error occurred" });
  }
}

async function deleteAgent(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ error: "Agent ID is required" });
    }

    const deleteResult = await db.query(
      "DELETE from agents where agent_id = $1 RETURNING *",
      [agent_id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Agent not found" });
    }

    return res.status(200).json({ ok: true, message: "Agent deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting agent:", error);
    if (error instanceof Error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(500).json({ ok: false, error: "An unknown error occurred" });
  }
}
