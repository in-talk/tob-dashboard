import type { NextApiRequest, NextApiResponse } from "next";
import { Agent } from "undici";

// Pages Router: /pages/api/keyword-proxy.js

// Single /testkeyword should be sub-second, but embedding mode + cold
// BGE-M3 model can take 30+ s on the first call. Generous ceiling so we
// don't hit undici's 5-min default headersTimeout in the worst case.
const BRAIN_TIMEOUT_MS = Number(
  process.env.KEYWORD_API_TIMEOUT_MS ?? 5 * 60 * 1000,
);
const longTimeoutAgent = new Agent({
  headersTimeout: BRAIN_TIMEOUT_MS,
  bodyTimeout:    BRAIN_TIMEOUT_MS,
  connectTimeout: 30_000,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log("Keyword API URL", process.env.KEYWORD_API_URL);
    const response = await fetch(
      `${process.env.KEYWORD_API_URL}/testkeyword`, // HTTP URL (server-side only)
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
        // @ts-expect-error undici-specific option not in lib.dom
        dispatcher: longTimeoutAgent,
      }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to proxy request" });
  }
}
