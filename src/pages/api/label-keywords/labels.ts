import { withApiAuth } from "@/lib/auth/guard";
import { ADMIN } from "@/lib/auth/roles";
import type { NextApiRequest, NextApiResponse } from "next";

// Registered labels (with descriptions and early-hangup turn rules) come from
// ai-voice-bot, so adding a label there needs no dashboard change.
const UPSTREAM = `${process.env.KEYWORD_API_URL}/label-keywords/labels`;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  try {
    const response = await fetch(UPSTREAM, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json().catch(() => ({ error: "Invalid response from upstream" }));
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("label-keywords/labels proxy error:", error);
    if (error instanceof TypeError && String(error.message).includes("fetch")) {
      return res.status(503).json({ error: "Cannot connect to backend service." });
    }
    return res.status(500).json({ error: "Failed to proxy request" });
  }
}

export default withApiAuth(handler, { roles: ADMIN });
