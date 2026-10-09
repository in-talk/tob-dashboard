import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { isIPv6 } from "@/lib/network/ip";
import { ValidationError, requireAdmin, sendError } from "@/lib/network/server";
import { AudioSyncResult } from "@/lib/network/types";

// Port of the sync-audios agent running on every Asterisk machine.
const SYNC_PORT = Number(process.env.ASTERISK_SYNC_PORT) || 3000;
// wait=1 blocks until the S3 sync finishes, which can take minutes.
const SYNC_TIMEOUT_MS = Number(process.env.ASTERISK_SYNC_TIMEOUT_MS) || 15 * 60 * 1000;

type AgentResponse = { success?: boolean; message?: string; logs?: unknown };

async function syncMachine(machine: { id: string; name: string | null; ip: string }): Promise<AudioSyncResult> {
  const host = isIPv6(machine.ip) ? `[${machine.ip}]` : machine.ip;
  const url = `http://${host}:${SYNC_PORT}/sync-audios?wait=1`;
  const started = Date.now();
  const base = { id: machine.id, name: machine.name, ip: machine.ip };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(SYNC_TIMEOUT_MS) });
    const text = await res.text();
    let body: AgentResponse | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      // Non-JSON reply — reported below as a failure with the raw text.
    }
    const logs = Array.isArray(body?.logs) ? body.logs.map(String) : [];
    const success = res.ok && body?.success === true;
    return {
      ...base,
      success,
      message:
        body?.message ||
        (res.ok ? "Unexpected response from machine" : `HTTP ${res.status}`) +
          (!body && text ? `: ${text.slice(0, 200)}` : ""),
      logs,
      duration_ms: Date.now() - started,
    };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    const message =
      err.name === "TimeoutError"
        ? `Timed out after ${Math.round(SYNC_TIMEOUT_MS / 1000)}s`
        : err.cause?.code
          ? `Unreachable (${err.cause.code})`
          : err.message || "Request failed";
    return { ...base, success: false, message, logs: [], duration_ms: Date.now() - started };
  }
}

// POST { ids: string[] } → triggers /sync-audios on each selected Asterisk
// machine's public IP in parallel and reports per-machine success/failure.
// IPs are looked up by id so the route can't be used to call arbitrary hosts.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }
  const actor = await requireAdmin(req, res);
  if (!actor) return;

  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || !ids.length || !ids.every((id) => /^\d+$/.test(String(id)))) {
      throw new ValidationError("Select at least one Asterisk machine");
    }
    const { rows } = await db.query(
      `SELECT id::text AS id, name, host(ip) AS ip FROM asterisk_machines
       WHERE id = ANY($1::bigint[]) ORDER BY name NULLS LAST, ip`,
      [ids.map(String)]
    );
    if (!rows.length) throw new ValidationError("None of the selected machines exist anymore");

    const results = await Promise.all(rows.map(syncMachine));
    const failed = results.filter((r) => !r.success).length;
    console.info(
      `[asterisk-sync-audios] by ${actor}:`,
      results.map((r) => `${r.name ?? r.ip} ${r.success ? "OK" : `FAILED ${r.message}`}`).join("; ")
    );
    return res.status(200).json({
      ok: true,
      results,
      message: failed
        ? `Audio sync failed on ${failed} of ${results.length} machine(s)`
        : `Audio sync finished on ${results.length} machine(s)`,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

export const config = {
  api: { responseLimit: false },
};
