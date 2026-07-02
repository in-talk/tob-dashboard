import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return getCampaigns(req, res);
    case "POST":
      return createCampaign(req, res);
    case "PUT":
      return updateCampaign(req, res);
    case "DELETE":
      return deleteCampaign(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
  }
}

async function getCampaigns(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await db.query(`
      SELECT
        campaign_id,
        campaign_name,
        campaign_description,
        greeting_label,
        no_transcription_label,
        isactive,
        campaign_code,
        extension,
        created_at,
        updated_at
      FROM public.campaigns
      ORDER BY campaign_id DESC;
    `);

    const campaigns = result.rows.map((row) => ({
      ...row,
      campaign_id: row.campaign_id?.toString(),
    }));

    return res.status(200).json(campaigns);
  } catch (error: unknown) {
    console.error("Failed to fetch campaigns:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to fetch campaigns" });
  }
}

async function createCampaign(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      campaign_name,
      campaign_description,
      greeting_label,
      no_transcription_label,
      isactive,
      campaign_code,
      extension,
    } = req.body;

    if (!campaign_name) {
      return res.status(400).json({
        ok: false,
        error: "Missing required field (campaign_name)",
      });
    }

    const insertResult = await db.query(
      `
      INSERT INTO campaigns (
        campaign_name,
        campaign_description,
        greeting_label,
        no_transcription_label,
        isactive,
        campaign_code,
        extension
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING campaign_id;
      `,
      [
        campaign_name,
        campaign_description,
        greeting_label,
        no_transcription_label,
        isactive ?? true,
        campaign_code,
        extension,
      ]
    );

    const newCampaignId = insertResult.rows[0].campaign_id;

    return res.status(201).json({
      ok: true,
      message: "Campaign created successfully",
      campaignId: newCampaignId,
    });
  } catch (error: unknown) {
    console.error("Error creating campaign:", error);
    if (error instanceof Error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res
      .status(500)
      .json({ ok: false, error: "An unknown error occurred" });
  }
}

async function updateCampaign(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      campaign_id,
      campaign_name,
      campaign_description,
      greeting_label,
      no_transcription_label,
      isactive,
      campaign_code,
      extension,
    } = req.body;

    if (!campaign_id) {
      return res
        .status(400)
        .json({ ok: false, error: "Campaign ID is required" });
    }

    const updateResult = await db.query(
      `
      UPDATE campaigns SET
        campaign_name = $1,
        campaign_description = $2,
        greeting_label = $3,
        no_transcription_label = $4,
        isactive = $5,
        campaign_code = $6,
        extension = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE campaign_id = $8
      RETURNING *;
      `,
      [
        campaign_name,
        campaign_description,
        greeting_label,
        no_transcription_label,
        isactive,
        campaign_code,
        extension,
        campaign_id,
      ]
    );

    if (updateResult.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Campaign not found" });
    }

    return res.status(200).json({
      ok: true,
      message: "Campaign updated successfully",
      campaign: updateResult.rows[0],
    });
  } catch (error: unknown) {
    console.error("Error updating campaign:", error);
    if (error instanceof Error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res
      .status(500)
      .json({ ok: false, error: "An unknown error occurred" });
  }
}

async function deleteCampaign(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { campaign_id } = req.body;

    if (!campaign_id) {
      return res
        .status(400)
        .json({ ok: false, error: "Campaign ID is required" });
    }

    const deleteResult = await db.query(
      `DELETE FROM campaigns WHERE campaign_id = $1 RETURNING *;`,
      [campaign_id]
    );

    if (deleteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Campaign not found" });
    }

    return res
      .status(200)
      .json({ ok: true, message: "Campaign deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting campaign:", error);
    if (error instanceof Error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res
      .status(500)
      .json({ ok: false, error: "An unknown error occurred" });
  }
}
