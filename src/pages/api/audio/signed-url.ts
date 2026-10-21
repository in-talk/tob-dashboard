import AWS from "aws-sdk";
import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { allowedClientIds, AuthedUser, withApiAuth } from "@/lib/auth/guard";
import { audit } from "@/lib/auth/state";

// Signs short-lived Wasabi URLs for call recordings. The S3 credentials stay
// on the server — they used to be NEXT_PUBLIC_* and shipped to every browser.

const accessKeyId = process.env.WASABI_ACCESS_KEY || process.env.NEXT_PUBLIC_WASABI_VIEW_ACCESS_KEY;
const secretAccessKey = process.env.WASABI_SECRET_KEY || process.env.NEXT_PUBLIC_WASABI_VIEW_SECRET_KEY;
const bucket = process.env.WASABI_BUCKET_NAME || process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME;

const s3 =
  accessKeyId && secretAccessKey
    ? new AWS.S3({
        endpoint: "https://s3.wasabisys.com",
        accessKeyId,
        secretAccessKey,
        region: "us-east-1",
        s3ForcePathStyle: true,
      })
    : null;

const URL_TTL_SEC = 15 * 60;

/** Object-key fragment: no traversal, no leading slash, no control chars. */
function validPath(p: unknown): p is string {
  if (typeof p !== "string" || !p || p.length > 512) return false;
  if (p.startsWith("/") || p.includes("\\")) return false;
  if (/[\x00-\x1f\x7f]/.test(p)) return false;
  return !p.split("/").some((seg) => seg === ".." || seg === ".");
}

async function handler(req: NextApiRequest, res: NextApiResponse, user: AuthedUser) {
  if (!s3 || !bucket) {
    console.error("[audio] Wasabi credentials are not configured");
    return res.status(500).json({ error: "Audio storage is not configured" });
  }

  const path = req.query.path;
  if (!validPath(path)) return res.status(400).json({ error: "Invalid audio path" });

  // Non-admins may only play recordings of calls that belong to their clients.
  const scope = await allowedClientIds(user);
  if (scope !== "all") {
    const callId = String(req.query.call_id ?? "");
    if (!/^\d{1,18}$/.test(callId)) return res.status(400).json({ error: "call_id is required" });
    const owned = await db.query(
      `SELECT 1 FROM calls
        WHERE call_id = $1 AND call_recording_path = $2 AND client_id = ANY($3::bigint[])
        LIMIT 1`,
      [callId, path, scope]
    );
    if (!owned.rowCount) {
      await audit("access_denied", { userId: user.id, email: user.email, details: { audio: path, call_id: callId } });
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const url = await s3.getSignedUrlPromise("getObject", {
    Bucket: bucket,
    Key: `call-recordings/${path}.wav`,
    Expires: URL_TTL_SEC,
  });
  res.status(200).json({ url });
}

export default withApiAuth(handler, { roles: { GET: ["admin", "user"] } });
