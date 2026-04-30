import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const UPSTREAM = `${process.env.KEYWORD_API_URL}/process-audio`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({
    maxFileSize: 100 * 1024 * 1024, // 100 MB
  });

  const tempFilePaths: string[] = [];

  try {
    // Parse incoming multipart form
    const [fields, files] = await new Promise<
      [formidable.Fields, formidable.Files]
    >((resolve, reject) => {
      form.parse(req, (err, f, v) => (err ? reject(err) : resolve([f, v])));
    });

    // Reconstruct FormData for upstream
    const formData = new FormData();

    // Forward scalar fields (addBackground, backgroundVolume, etc.)
    for (const [key, value] of Object.entries(fields)) {
      const val = Array.isArray(value) ? value[0] : value;
      if (val !== undefined && val !== null) {
        formData.append(key, val);
      }
    }

    // Attach uploaded audio files
    const uploadedFiles = Array.isArray(files.files)
      ? files.files
      : files.files
        ? [files.files]
        : [];

    for (const file of uploadedFiles as formidable.File[]) {
      if (!file?.filepath) continue;
      tempFilePaths.push(file.filepath);
      const buffer = fs.readFileSync(file.filepath);
      const blob = new Blob([buffer], { type: file.mimetype ?? "audio/wav" });
      formData.append("files", blob, file.originalFilename ?? "audio");
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: "No audio files provided" });
    }

    // Forward to upstream
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      body: formData,
    });

    if (!upstream.ok) {
      const errorData = await upstream
        .json()
        .catch(() => ({ detail: upstream.statusText }));
      return res
        .status(upstream.status)
        .json({ detail: errorData?.detail || "Processing failed" });
    }

    // Stream binary (zip) response back to client
    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") ?? "application/zip"
    );
    res.setHeader(
      "Content-Disposition",
      upstream.headers.get("content-disposition") ??
      "attachment; filename=processed_audio.zip"
    );
    res.setHeader("Content-Length", buffer.byteLength);
    return res.send(buffer);
  } catch (error) {
    console.error("audio/process-audio proxy error:", error);

    if (error instanceof TypeError && String(error.message).includes("fetch")) {
      return res
        .status(503)
        .json({ error: "Cannot connect to backend service." });
    }

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return res.status(500).json({ error: message });
  } finally {
    // Clean up temp files written by formidable
    for (const fp of tempFilePaths) {
      try {
        fs.unlinkSync(fp);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
