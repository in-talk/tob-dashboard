import type { NextApiRequest, NextApiResponse } from "next";
import { withApiAuth } from "@/lib/auth/guard";
import { ADMIN } from "@/lib/auth/roles";

// Server-side proxy so the browser no longer calls the keyword backend
// directly (it used NEXT_PUBLIC_KEYWORD_API_URL, bypassing dashboard auth).
async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const response = await fetch(`${process.env.KEYWORD_API_URL}/age-classifier/reset-cache`, {
    method: "POST",
  });
  const data = await response.json().catch(() => ({}));
  return res.status(response.status).json(data);
}

export default withApiAuth(handler, { roles: { POST: ADMIN } });
