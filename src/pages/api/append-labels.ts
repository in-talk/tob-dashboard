import type { NextApiRequest, NextApiResponse } from "next";
import { Agent } from "undici";

// Vercel hobby plan caps serverless functions at 300 s. Keep the proxy
// timeout at 290 s so undici gives up before Vercel kills us — that way
// the user sees our error instead of Vercel's opaque 504.
// For big files, chunk on the client (see bulk_keyword_finder.tsx).
const BRAIN_TIMEOUT_MS = Number(
  process.env.KEYWORD_API_TIMEOUT_MS ?? 290 * 1000,
);
const longTimeoutAgent = new Agent({
  headersTimeout: BRAIN_TIMEOUT_MS,
  bodyTimeout:    BRAIN_TIMEOUT_MS,
  connectTimeout: 30_000,
});

export const config = {
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: "10mb" },
  },
  // Vercel hobby plan max. Bump to 900 on Pro, 3600 on Enterprise.
  maxDuration: 300,
};

interface AppendLabelsRequest {
  transcripts: string[];
  turn: number;
  campaign_id: string;
  excluded_labels: string[];
  search_mode: "keyword" | "embedding";
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
          search_mode: body.search_mode
        }),
        // Long-running bulk call — opt out of undici's 5-minute
        // headersTimeout for THIS request only by passing our custom
        // Agent. (Node's `fetch` accepts `dispatcher` even though the
        // TS lib type doesn't list it.)
        // @ts-expect-error undici-specific option not in lib.dom
        dispatcher: longTimeoutAgent,
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