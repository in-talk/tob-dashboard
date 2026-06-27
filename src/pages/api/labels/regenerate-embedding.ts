/**
 * Proxy for ai-voice-bot's `POST /labels/regenerate-embedding`.
 *
 * Body (forwarded as-is):
 *   { collection: "labels_60000", label: "AHM" }
 *
 * The Dashboard's "Regenerate Embeddings" button on the label modal
 * hits this proxy; the proxy forwards to ai-voice-bot's FastAPI at
 * `process.env.KEYWORD_API_URL`. Same env var the age-classifier
 * proxies already use, so no extra deployment config.
 */
import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM = `${process.env.KEYWORD_API_URL}/labels/regenerate-embedding`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const response = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response
      .json()
      .catch(() => ({ error: "Invalid response from upstream" }));
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("regenerate-embedding proxy error:", error);
    if (
      error instanceof TypeError &&
      String(error.message).includes("fetch")
    ) {
      return res
        .status(503)
        .json({ error: "Cannot connect to ai-voice-bot." });
    }
    return res.status(500).json({ error: "Failed to proxy request" });
  }
}
