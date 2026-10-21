import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import db from "@/lib/db";
import { isGlobalRole, Role } from "./roles";
import { audit } from "./state";
import { clientIp } from "./rateLimit";

export type AuthedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  client_id: number | null;
};

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiAuthOptions = {
  /** Roles allowed for every method, or a per-method map (unlisted methods → 405). */
  roles: Role[] | Partial<Record<Method, Role[]>>;
};

export type AuthedHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  user: AuthedUser
) => unknown | Promise<unknown>;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function header(req: NextApiRequest, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * CSRF defence in depth (session cookies are already SameSite=Lax): reject
 * state-changing requests whose Origin isn't this site.
 */
export function isCrossSite(req: NextApiRequest): boolean {
  if (SAFE_METHODS.has(req.method ?? "GET")) return false;
  const fetchSite = header(req, "sec-fetch-site");
  if (fetchSite === "cross-site") return true;
  const origin = header(req, "origin");
  if (!origin) return false; // non-browser clients; they still need a session cookie
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return true;
  }
  const allowed = new Set<string>();
  const host = header(req, "host");
  if (host) allowed.add(host);
  const fwd = header(req, "x-forwarded-host");
  if (fwd && process.env.TRUST_PROXY === "true") allowed.add(fwd.split(",")[0].trim());
  if (process.env.NEXTAUTH_URL) {
    try {
      allowed.add(new URL(process.env.NEXTAUTH_URL).host);
    } catch {
      /* ignore malformed */
    }
  }
  return !allowed.has(originHost);
}

/** In production, replace 5xx bodies so DB/internal error text never leaks. */
function sanitiseServerErrors(res: NextApiResponse) {
  if (process.env.NODE_ENV !== "production") return;
  const json = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 500) return json({ ok: false, error: "Internal server error" });
    return json(body);
  }) as typeof res.json;
}

/** Load the session for an API request, or null. Runs the full revocation check. */
export async function getApiUser(req: NextApiRequest, res: NextApiResponse): Promise<AuthedUser | null> {
  const session = await getServerSession(req, res, authOptions);
  const u = session?.user;
  if (!u?.id || !u.role) return null;
  return {
    id: String(u.id),
    name: u.name ?? "",
    email: u.email ?? "",
    role: u.role,
    client_id: u.client_id ?? null,
  };
}

/**
 * Wrap an API route: requires a valid, unrevoked session with one of the
 * allowed roles, blocks cross-site writes, disables caching, and hides
 * internal error text in production.
 */
export function withApiAuth(handler: AuthedHandler, opts: ApiAuthOptions) {
  return async function guarded(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader("Cache-Control", "no-store");
    sanitiseServerErrors(res);

    if (isCrossSite(req)) {
      return res.status(403).json({ ok: false, error: "Cross-site request blocked" });
    }

    let allowed: Role[] | undefined;
    if (Array.isArray(opts.roles)) {
      allowed = opts.roles;
    } else {
      allowed = opts.roles[(req.method ?? "GET") as Method];
      if (!allowed) {
        res.setHeader("Allow", Object.keys(opts.roles));
        return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
      }
    }

    let user: AuthedUser | null;
    try {
      user = await getApiUser(req, res);
    } catch (err) {
      console.error("[auth] session lookup failed:", (err as Error).message);
      return res.status(503).json({ ok: false, error: "Authentication unavailable" });
    }
    if (!user) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    if (!allowed.includes(user.role as Role)) {
      await audit("access_denied", {
        userId: user.id,
        email: user.email,
        ip: clientIp(req.headers, req.socket?.remoteAddress),
        details: { method: req.method, path: req.url?.split("?")[0] },
      });
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    try {
      return await handler(req, res, user);
    } catch (err) {
      console.error(`[api] ${req.method} ${req.url?.split("?")[0]}:`, err);
      if (!res.headersSent) {
        return res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Tenant (client) scoping
// ---------------------------------------------------------------------------

/** Client ids this user may see, or "all" for admins. */
export async function allowedClientIds(user: AuthedUser): Promise<number[] | "all"> {
  if (isGlobalRole(user.role)) return "all";
  const r = await db.query("SELECT client_id FROM clients_by_users WHERE user_id = $1", [user.id]);
  return r.rows.map((row: { client_id: number | string }) => Number(row.client_id));
}

function toClientId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d{1,18}$/.test(value)) return Number(value);
  return null;
}

/**
 * Validate a requested client id against the user's scope. Returns the
 * numeric id, or null after sending 400/403. Non-admins must always name a
 * client (they can't ask for "all clients").
 */
export async function requireClientAccess(
  user: AuthedUser,
  requested: unknown,
  res: NextApiResponse,
  { allowAll = false }: { allowAll?: boolean } = {}
): Promise<number | "all" | null> {
  const scope = await allowedClientIds(user);
  if (requested === null || requested === undefined || requested === "") {
    if (allowAll && scope === "all") return "all";
    res.status(400).json({ ok: false, error: "client_id is required" });
    return null;
  }
  const id = toClientId(requested);
  if (id === null) {
    res.status(400).json({ ok: false, error: "client_id is invalid" });
    return null;
  }
  if (scope !== "all" && !scope.includes(id)) {
    await audit("access_denied", { userId: user.id, email: user.email, details: { client_id: id } });
    res.status(403).json({ ok: false, error: "Forbidden" });
    return null;
  }
  return id;
}
