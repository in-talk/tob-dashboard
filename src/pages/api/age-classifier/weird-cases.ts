import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM = `${process.env.KEYWORD_API_URL}/age-classifier/weird-cases`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const response = await fetch(UPSTREAM, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({ error: "Invalid response from upstream" }));
      return res.status(response.status).json(data);
    }

    if (req.method === "POST") {
      const response = await fetch(UPSTREAM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await response.json().catch(() => ({ error: "Invalid response from upstream" }));
      return res.status(response.status).json(data);
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error("weird-cases proxy error:", error);
    if (error instanceof TypeError && String(error.message).includes("fetch")) {
      return res.status(503).json({ error: "Cannot connect to backend service." });
    }
    return res.status(500).json({ error: "Failed to proxy request" });
  }
}
