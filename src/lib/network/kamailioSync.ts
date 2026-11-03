// Server-only: builds and sends Kamailio Sync API requests.
//
//   POST http://<kamailio ip>:7778/api/v1/sync
//   X-API-Key: <token>
//   { "vicidial_ips": [...], "asterisk_servers": [{ private_ip, public_ip, name }] }
//
// The body comes from the get_kamailio_ips(inet) DB function. The API uses
// full-list semantics (whatever we send becomes the desired state), so we
// refuse to send anything that would silently drop entries.
//
// Settings (server env, never sent to the browser or logged):
//   KAMAILIO_SYNC_API_KEY    shared X-API-Key for every Kamailio
//   KAMAILIO_SYNC_API_KEYS   optional JSON map {"<kamailio ip>": "<key>"} for per-server keys
//   KAMAILIO_SYNC_PORT       default 7778
//   KAMAILIO_SYNC_TIMEOUT_MS default 30000

import db from "@/lib/db";
import type {
  KamailioSyncPayload,
  KamailioSyncPreview,
  KamailioSyncResult,
  Provider,
} from "./types";

const PORT = Number(process.env.KAMAILIO_SYNC_PORT) || 7778;
const TIMEOUT_MS = Number(process.env.KAMAILIO_SYNC_TIMEOUT_MS) || 30_000;

type KamailioRow = { id: string; ip: string; provider: Provider };

export function apiKeyFor(ip: string): string | null {
  const map = process.env.KAMAILIO_SYNC_API_KEYS;
  if (map) {
    try {
      const keys = JSON.parse(map) as Record<string, string>;
      if (typeof keys[ip] === "string" && keys[ip]) return keys[ip];
    } catch {
      console.error("[kamailio-sync] KAMAILIO_SYNC_API_KEYS is not valid JSON");
    }
  }
  return process.env.KAMAILIO_SYNC_API_KEY || null;
}

export async function listKamailios(ids?: string[]): Promise<KamailioRow[]> {
  const { rows } = await db.query(
    `SELECT id::text AS id, host(ip) AS ip, provider FROM kamailio_config
      ${ids ? "WHERE id = ANY($1::bigint[])" : ""}
      ORDER BY ip`,
    ids ? [ids] : []
  );
  return rows;
}

function isPayload(v: unknown): v is KamailioSyncPayload {
  const p = v as KamailioSyncPayload;
  return !!p && Array.isArray(p.vicidial_ips) && Array.isArray(p.asterisk_servers);
}

/** Build the request body for one Kamailio and list anything that blocks sending it. */
export async function buildPreview(k: KamailioRow): Promise<KamailioSyncPreview> {
  const problems: string[] = [];
  const { rows } = await db.query("SELECT get_kamailio_ips($1::inet) AS body", [k.ip]);
  const body = rows[0]?.body;

  if (!isPayload(body)) {
    return {
      ...k,
      payload: null,
      problems: [
        "The database function get_kamailio_ips() still returns the old format — run db/functions/get_kamailio_ips.sql.",
      ],
    };
  }

  // Machines the function had to leave out (no private IP). Sending without
  // them would REMOVE them from Kamailio's dispatcher, so block instead.
  const missing = await db.query(
    `SELECT COALESCE(a.name, host(a.ip)) AS label
       FROM kamailio_asterisk_map m
       JOIN asterisk_machines a ON a.id = m.asterisk_id
      WHERE m.kamailio_id = $1 AND a.private_ip IS NULL
      ORDER BY 1`,
    [k.id]
  );
  if (missing.rows.length) {
    problems.push(
      `Asterisk machine(s) without a private IP: ${missing.rows.map((r) => r.label).join(", ")}. ` +
        "Add their private IP on the Asterisk page first."
    );
  }
  if (!body.vicidial_ips.length) {
    problems.push("No client IPs are mapped to this Kamailio (the API rejects an empty list).");
  }
  if (!body.asterisk_servers.length && !missing.rows.length) {
    problems.push("No Asterisk machines are mapped to this Kamailio (the API rejects an empty list).");
  }
  const names = body.asterisk_servers.map((s) => s.name.toLowerCase());
  const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
  if (dupes.length) problems.push(`Duplicate Asterisk names: ${dupes.join(", ")} (names must be unique).`);
  if (!apiKeyFor(k.ip)) problems.push("No API key configured on the dashboard server (KAMAILIO_SYNC_API_KEY).");

  return { ...k, payload: body, problems };
}

type ApiReply = {
  success?: boolean;
  code?: string;
  message?: string;
  request_id?: string;
  data?: Record<string, unknown>;
  error?: string;
};

/** Turn the API's HTTP reply into a result (exported for tests). */
export function interpretSyncReply(
  status: number,
  text: string
): Pick<KamailioSyncResult, "status" | "http_status" | "code" | "message" | "request_id" | "data"> {
  let body: ApiReply | null = null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    // non-JSON (e.g. an Apache error page) — reported below
  }
  const code = typeof body?.code === "string" ? body.code : null;
  const result =
    status === 200 && body?.success === true
      ? "success"
      : status === 207
        ? "partial" // database updated, Kamailio runtime reload failed
        : "failed";
  const message =
    (typeof body?.message === "string" && body.message) ||
    (typeof body?.error === "string" && body.error) ||
    (result === "partial"
      ? "Database updated but a Kamailio reload command failed"
      : !body && text.trim()
        ? `HTTP ${status}: ${text.trim().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200)}`
        : `HTTP ${status}`);
  return {
    status: result,
    http_status: status,
    code,
    message,
    request_id: typeof body?.request_id === "string" ? body.request_id : null,
    data: body?.data && typeof body.data === "object" ? body.data : null,
  };
}

// The API asks callers not to send overlapping list versions to one server.
const inFlight = new Set<string>();

/** Sync one Kamailio. Never throws: every problem becomes a failed/skipped result. */
export async function syncKamailio(k: KamailioRow): Promise<KamailioSyncResult> {
  const started = Date.now();
  const base = { id: k.id, ip: k.ip };
  const empty = { http_status: null, code: null, request_id: null, data: null };

  if (inFlight.has(k.id)) {
    return {
      ...base, ...empty, status: "skipped",
      message: "A sync for this Kamailio is already running",
      sent: { vicidial_ips: 0, asterisk_servers: 0 }, duration_ms: 0,
    };
  }
  inFlight.add(k.id);
  try {
    const preview = await buildPreview(k);
    const sent = {
      vicidial_ips: preview.payload?.vicidial_ips.length ?? 0,
      asterisk_servers: preview.payload?.asterisk_servers.length ?? 0,
    };
    if (preview.problems.length || !preview.payload) {
      return {
        ...base, ...empty, status: "skipped", message: preview.problems.join(" "),
        sent, duration_ms: Date.now() - started,
      };
    }

    const host = k.ip.includes(":") ? `[${k.ip}]` : k.ip;
    try {
      const res = await fetch(`http://${host}:${PORT}/api/v1/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKeyFor(k.ip) as string },
        body: JSON.stringify(preview.payload),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const text = await res.text();
      return { ...base, ...interpretSyncReply(res.status, text), sent, duration_ms: Date.now() - started };
    } catch (e) {
      const err = e as Error & { cause?: { code?: string } };
      const message =
        err.name === "TimeoutError"
          ? `No response after ${Math.round(TIMEOUT_MS / 1000)}s`
          : err.cause?.code
            ? `Unreachable (${err.cause.code}) — check the Kamailio firewall allows port ${PORT} from the dashboard`
            : err.message || "Request failed";
      return { ...base, ...empty, status: "failed", message, sent, duration_ms: Date.now() - started };
    }
  } finally {
    inFlight.delete(k.id);
  }
}
