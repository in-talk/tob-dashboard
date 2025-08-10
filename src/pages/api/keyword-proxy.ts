import type { NextApiRequest, NextApiResponse } from "next";

// Pages Router: /pages/api/keyword-proxy.js

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
      }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to proxy request" });
  }
}
