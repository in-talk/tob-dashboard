import type { NextApiRequest, NextApiResponse } from "next";
import { Agent } from "undici";

// Bulk classification on the brain takes ~30-50 ms per transcript on CPU
// (embedding mode). 500 transcripts ≈ 15-25 s; 5000 ≈ 2.5-4 min. Undici's
// default headersTimeout is 5 min, which we were hitting on big files.
// Bump it to 15 min so the proxy outlives the brain's bulk loop.
const BRAIN_TIMEOUT_MS = Number(
  process.env.KEYWORD_API_TIMEOUT_MS ?? 15 * 60 * 1000,
);
const longTimeoutAgent = new Agent({
  headersTimeout: BRAIN_TIMEOUT_MS,
  bodyTimeout:    BRAIN_TIMEOUT_MS,
  connectTimeout: 30_000,
});

// Tell Next.js the API route itself shouldn't kill us first.
export const config = {
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: "10mb" },
  },
  // Vercel-only hint (no effect in self-hosted dev, harmless to set).
  maxDuration: 900,
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