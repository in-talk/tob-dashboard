import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM_BASE = `${process.env.KEYWORD_API_URL}/age-classifier/typo-corrections`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid id" });
  }

  try {
    if (req.method === "DELETE") {
      const response = await fetch(`${UPSTREAM_BASE}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (response.status === 404) {
        return res.status(404).json({ error: "Typo correction not found" });
      }
      const data = await response.json().catch(() => ({ deleted: true }));
      return res.status(response.status).json(data);
    }

    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error("typo-corrections [id] proxy error:", error);
    if (error instanceof TypeError && String(error.message).includes("fetch")) {
      return res.status(503).json({ error: "Cannot connect to backend service." });
    }
    return res.status(500).json({ error: "Failed to proxy request" });
  }
}
