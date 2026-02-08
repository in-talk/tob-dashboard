import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return getClientAgents(req, res);
    case "POST":
      return assignAgents(req, res);
    case "DELETE":
      return unassignAgent(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

async function getClientAgents(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { client_id } = req.query;

    if (!client_id) {
      return res.status(400).json({ error: "client_id is required" });
    }

    const result = await db.query(
      `SELECT ca.client_id, ca.agent_id, a.agent_name, a.is_active
       FROM client_agents ca
       INNER JOIN agents a ON ca.agent_id = a.agent_id
       WHERE ca.client_id = $1
       ORDER BY a.agent_name ASC`,
      [client_id]
    );

    return res.status(200).json(result.rows);
  } catch (error: unknown) {
    console.error("Failed to fetch client agents:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to fetch client agents" });
  }
}

async function assignAgents(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { client_id, agent_ids } = req.body;

    if (!client_id || !agent_ids || !Array.isArray(agent_ids) || agent_ids.length === 0) {
      return res.status(400).json({
        error: "client_id and agent_ids (non-empty array) are required",
      });
    }

    const values: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    for (const agentId of agent_ids) {
      values.push(`($${paramIndex}, $${paramIndex + 1})`);
      params.push(client_id, agentId);
      paramIndex += 2;
    }

    await db.query(
      `INSERT INTO client_agents (client_id, agent_id)
       VALUES ${values.join(", ")}
       ON CONFLICT (client_id, agent_id) DO NOTHING`,
      params
    );

    return res.status(201).json({
      ok: true,
      message: `${agent_ids.length} agent(s) assigned successfully`,
    });
  } catch (error: unknown) {
    console.error("Error assigning agents:", error);
    if (error instanceof Error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(500).json({ ok: false, error: "An unknown error occurred" });
  }
}

async function unassignAgent(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { client_id, agent_id } = req.body;

    if (!client_id || !agent_id) {
      return res.status(400).json({
        error: "client_id and agent_id are required",
      });
    }

    const result = await db.query(
      "DELETE FROM client_agents WHERE client_id = $1 AND agent_id = $2 RETURNING *",
      [client_id, agent_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Assignment not found" });
    }

    return res.status(200).json({
      ok: true,
      message: "Agent unassigned successfully",
    });
  } catch (error: unknown) {
    console.error("Error unassigning agent:", error);
    if (error instanceof Error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(500).json({ ok: false, error: "An unknown error occurred" });
  }
}
