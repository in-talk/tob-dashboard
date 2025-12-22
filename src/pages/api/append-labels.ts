import type { NextApiRequest, NextApiResponse } from "next";

interface AppendLabelsRequest {
  transcripts: string[];
  turn: number;
  campaign_id: string;
  excluded_labels: string[];
}

interface ProcessResult {
  transcript: string;
  selected_label: string | null;
  match_info: {
    matched_keyword?: string;
    total_score?: number;
    file_name?: string;
    is_exact_match?: boolean;
    message?: string;
  } | null;
  error?: string;
}

interface ApiResponse {
  processed_count: number;
  results: ProcessResult[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse | { error: string; message?: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body: AppendLabelsRequest = req.body;

    // Validate request body
    if (!body.transcripts || !Array.isArray(body.transcripts)) {
      return res.status(400).json({
        error: "Invalid request: transcripts must be an array",
      });
    }

    if (!body.turn || typeof body.turn !== "number") {
      return res.status(400).json({
        error: "Invalid request: turn must be a number",
      });
    }

    const response = await fetch(
      `${process.env.KEYWORD_API_URL}/append-labels`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcripts: body.transcripts,
          turn: body.turn,
          campaign_id: body.campaign_id,
          excluded_labels: body.excluded_labels || [],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Backend API error:", data);
      return res.status(response.status).json({
        error: data.detail || "Backend API error",
        message: data.message,
      });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      error: "Failed to proxy request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}