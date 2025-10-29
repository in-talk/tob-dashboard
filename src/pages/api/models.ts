import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return getModels(req, res);
    case "POST":
      return createModel(req, res);
    case "PUT":
      return updateModel(req, res);
    case "DELETE":
      return deleteModel(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

async function getModels(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await db.query(`
      SELECT 
        m.model_id, 
        m.model_name, 
        c.campaign_name, 
        m.description, 
        m.model_number
      FROM models m
      INNER JOIN campaigns c 
      ON c.campaign_id = m.campaign_id
      ORDER BY m.model_id ASC;
    `);

    const models = result.rows.map((row) => ({
      ...row,
      model_id: row.model_id?.toString(),
    }));

    return res.status(200).json(models);
  } catch (error: unknown) {
    console.error("Failed to fetch models:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to fetch models" });
  }
}

async function createModel(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { model_name, description, campaign_id, model_number } = req.body;

    if (!model_name || !campaign_id || !model_number) {
      return res.status(400).json({
        error:
          "Missing required fields (model_name, campaign_id, model_number)",
      });
    }

    const insertResult = await db.query(
      `
      INSERT INTO models (model_name, description, campaign_id, model_number)
      VALUES ($1, $2, $3, $4)
      RETURNING model_id;
      `,
      [model_name, description, campaign_id, model_number]
    );

    const newModelId = insertResult.rows[0].model_id;

    return res.status(201).json({
      message: "Model created successfully",
      modelId: newModelId,
    });
  } catch (error: unknown) {
    console.error("Error creating model:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
}

async function updateModel(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { model_id, model_name, description, campaign_id, model_number } =
      req.body;

    if (!model_id) {
      return res.status(400).json({ error: "Model ID is required" });
    }

    const updateResult = await db.query(
      `
      UPDATE models
      SET 
        model_name = $1,
        description = $2,
        campaign_id = $3,
        model_number = $4
      WHERE model_id = $5
      RETURNING *;
      `,
      [model_name, description, campaign_id, model_number, model_id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    return res.status(200).json({
      message: "Model updated successfully",
      model: updateResult.rows[0],
    });
  } catch (error: unknown) {
    console.error("Error updating model:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
}

async function deleteModel(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { model_id } = req.body;

    if (!model_id) {
      return res.status(400).json({ error: "Model ID is required" });
    }

    const deleteResult = await db.query(
      `DELETE FROM models WHERE model_id = $1 RETURNING *;`,
      [model_id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Model not found" });
    }

    return res.status(200).json({ message: "Model deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting model:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
}
