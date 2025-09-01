// pages/api/bulk-age-test.ts

import type { NextApiRequest, NextApiResponse } from "next";

type TestCase = {
  text: string;
  expected: string;
};

type BulkTestRequest = {
  test_cases: TestCase[];
  min_age: number;
  max_age: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body: BulkTestRequest = req.body;

    // Validate request
    if (
      !body.test_cases ||
      !Array.isArray(body.test_cases) ||
      body.test_cases.length === 0
    ) {
      return res.status(400).json({
        error: "test_cases is required and must be a non-empty array",
      });
    }

    if (!body.min_age || !body.max_age || body.min_age >= body.max_age) {
      return res.status(400).json({
        error: "Invalid age range. min_age must be less than max_age",
      });
    }

    console.log("Age Classifier API URL", process.env.KEYWORD_API_URL);

    const response = await fetch(
      `${process.env.KEYWORD_API_URL}/bulk-test-age-classifier`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      return res.status(response.status).json({
        error: errorData.error || `Backend error: ${response.statusText}`,
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Bulk age test proxy error:", error);

    if (error instanceof SyntaxError) {
      return res.status(400).json({
        error: "Invalid JSON in request body",
      });
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return res.status(503).json({
        error:
          "Cannot connect to backend service. Please check if the service is running.",
      });
    }

    res.status(500).json({ error: "Failed to proxy bulk age test request" });
  }
}
