import type { CacheInvalidateResult } from "./types";

// Talks to the agent running on each Asterisk machine (same agent as
// /sync-audios). Its replies look like:
//   200 {"success":true,"message":"Cache cleared for client 75"}
//   404 {"error":"Not Found"}
// Kept free of other app imports so it can be tested on its own.

/** Port of the agent on every Asterisk machine. */
export const AGENT_PORT = Number(process.env.ASTERISK_SYNC_PORT) || 3000;
/** Cache invalidation is quick; don't let one dead machine hold up the dialog. */
export const TIMEOUT_MS = Number(process.env.ASTERISK_CACHE_TIMEOUT_MS) || 10_000;

type AgentResponse = { success?: boolean; ok?: boolean; message?: string; error?: string };

/** Decide success and the message to show from the agent's HTTP reply. */
export function interpretReply(
  status: number,
  text: string
): { success: boolean; message: string } {
  let body: AgentResponse | null = null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    // Plain-text reply — shown as-is below.
  }
  const httpOk = status >= 200 && status < 300;
  // Any "error" field, or an explicit success/ok of false, is a failure even
  // with HTTP 200. A JSON body must say success:true (or ok:true) to count.
  const success =
    httpOk &&
    (body
      ? !body.error && body.success !== false && body.ok !== false &&
        (body.success === true || body.ok === true)
      : true);
  const message =
    (typeof body?.message === "string" && body.message) ||
    (typeof body?.error === "string" && body.error) ||
    (!body && text.trim() ? text.trim().slice(0, 300) : "") ||
    (httpOk ? (success ? "Cache reset" : "Unexpected response from machine") : `HTTP ${status}`);
  return { success, message };
}

export async function invalidateOnMachine(
  machine: { id: string; name: string | null; ip: string },
  clientId: string | null,
  opts: { port?: number; timeoutMs?: number } = {}
): Promise<CacheInvalidateResult> {
  const port = opts.port ?? AGENT_PORT;
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  const host = machine.ip.includes(":") ? `[${machine.ip}]` : machine.ip;
  const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
  const url = `http://${host}:${port}/invalidate-cache${query}`;
  const started = Date.now();
  const base = { id: machine.id, name: machine.name, ip: machine.ip };

  // Each machine is handled on its own: any error is caught here and turned
  // into a failed result, so one offline machine never affects the others.
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    return { ...base, ...interpretReply(res.status, text), duration_ms: Date.now() - started };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    const message =
      err.name === "TimeoutError"
        ? `No response after ${Math.round(timeoutMs / 1000)}s (machine may be off)`
        : err.cause?.code
          ? `Unreachable (${err.cause.code})`
          : err.message || "Request failed";
    return { ...base, success: false, message, duration_ms: Date.now() - started };
  }
}
