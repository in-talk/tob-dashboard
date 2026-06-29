import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";

// Audio batches can run large — typical per-file is a few MB but a session
// of 50–100 short clips totals hundreds of MB. Allow up to 1 GB total /
// 200 MB per file by default; override via env without touching code.
const MAX_FILE_BYTES = Number(
  process.env.AUDIO_MAX_FILE_BYTES ?? 200 * 1024 * 1024,
);
const MAX_TOTAL_BYTES = Number(
  process.env.AUDIO_MAX_TOTAL_BYTES ?? 1024 * 1024 * 1024,
);

export const config = {
  api: {
    bodyParser: false,
    // Next.js's own response cap kicks in around 4 MB by default — but
    // since we're streaming a binary zip back, opt out entirely.
    responseLimit: false,
  },
  // Vercel hobby = 300, Pro = 900, Enterprise = 3600. Stay safe on hobby.
  maxDuration: 300,
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
    maxFileSize:      MAX_FILE_BYTES,
    maxTotalFileSize: MAX_TOTAL_BYTES,
    // Don't keep files at all on disk if we can avoid it; formidable will
    // still buffer to disk because we set bodyParser:false. Default temp
    // location is fine (/tmp on Linux, %TEMP% on Windows).
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
