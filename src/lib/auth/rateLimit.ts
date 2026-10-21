// Fixed-window in-memory rate limiter. Good for a single `next start`
// process; if you run several instances behind a load balancer, the per-email
// DB lockout (state.ts) still applies everywhere, but per-IP limits are per
// instance — move this to Redis at that point.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function bucket(key: string, windowMs: number): Bucket {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (buckets.size > 50_000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
  return b;
}

/** Count one event; ok=false once the window's count exceeds `limit`. */
export function hit(key: string, limit: number, windowMs: number): { ok: boolean; count: number; retryAfterSec: number } {
  const b = bucket(key, windowMs);
  b.count += 1;
  return { ok: b.count <= limit, count: b.count, retryAfterSec: Math.ceil((b.resetAt - Date.now()) / 1000) };
}

/** Current count in the window without adding to it. */
export function peek(key: string): number {
  const b = buckets.get(key);
  return b && b.resetAt > Date.now() ? b.count : 0;
}

export function reset(key: string) {
  buckets.delete(key);
}

type HeaderBag = Record<string, string | string[] | undefined> | undefined;

/**
 * Client IP. Only trusts X-Forwarded-For when TRUST_PROXY=true (i.e. the app
 * sits behind nginx/a load balancer that sets it); otherwise anyone could
 * spoof it to dodge per-IP limits.
 */
export function clientIp(headers: HeaderBag, socketIp?: string | null): string {
  if (process.env.TRUST_PROXY === "true" && headers) {
    const xff = headers["x-forwarded-for"];
    const first = (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim();
    if (first) return first;
    const real = headers["x-real-ip"];
    if (typeof real === "string" && real) return real;
  }
  return socketIp || "unknown";
}
