import db from "@/lib/db";

// Server-side account state used to authenticate and revoke sessions.
//
// The columns added by db/migrations/011_auth_hardening.sql (is_active,
// token_version, failed_login_count, locked_until, password_changed_at) and
// the auth_audit_log table are detected at runtime, so the app keeps working
// before the migration is applied — it simply can't revoke sessions or lock
// accounts until then. A warning is logged once so this isn't silent.

const SCHEMA_TTL_MS = 5 * 60 * 1000;
const STATE_TTL_MS = 30 * 1000;

let schemaCache: { at: number; userCols: Set<string>; hasAudit: boolean } | null = null;
let warned = false;

async function schema() {
  if (schemaCache && Date.now() - schemaCache.at < SCHEMA_TTL_MS) return schemaCache;
  const cols = await db.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'users'`
  );
  const audit = await db.query(`SELECT to_regclass('auth_audit_log') IS NOT NULL AS ok`);
  schemaCache = {
    at: Date.now(),
    userCols: new Set(cols.rows.map((r: { column_name: string }) => r.column_name)),
    hasAudit: !!audit.rows[0]?.ok,
  };
  if (!warned && !schemaCache.userCols.has("token_version")) {
    warned = true;
    console.warn(
      "[auth] users.token_version / is_active missing — run db/migrations/011_auth_hardening.sql " +
        "to enable session revocation and account lockout."
    );
  }
  return schemaCache;
}

export async function hasUserColumn(name: string): Promise<boolean> {
  return (await schema()).userCols.has(name);
}

export type AuthUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  client_id: number | null;
  password: string;
  is_active: boolean;
  token_version: number;
  failed_login_count: number;
  locked_until: Date | null;
};

function normalise(row: Record<string, unknown>): AuthUserRow {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    name: String(row.name ?? ""),
    role: String(row.role ?? "user"),
    client_id: row.client_id == null ? null : Number(row.client_id),
    password: String(row.password ?? ""),
    is_active: row.is_active === undefined ? true : row.is_active !== false,
    token_version: Number(row.token_version ?? 0),
    failed_login_count: Number(row.failed_login_count ?? 0),
    locked_until: (row.locked_until as Date | null) ?? null,
  };
}

export async function findUserByEmail(email: string): Promise<AuthUserRow | null> {
  const r = await db.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return r.rows[0] ? normalise(r.rows[0]) : null;
}

// --- Session state (cached briefly so every API call isn't a DB round trip) ---

const stateCache = new Map<string, { at: number; row: AuthUserRow | null }>();

export async function loadAuthState(id: string): Promise<AuthUserRow | null> {
  const hit = stateCache.get(id);
  if (hit && Date.now() - hit.at < STATE_TTL_MS) return hit.row;
  if (!/^\d+$/.test(id)) return null;
  const r = await db.query("SELECT * FROM users WHERE id = $1", [id]);
  const row = r.rows[0] ? normalise(r.rows[0]) : null;
  stateCache.set(id, { at: Date.now(), row });
  if (stateCache.size > 5000) stateCache.clear();
  return row;
}

/** Drop the cached state so a change (password, role, disable) applies at once. */
export function invalidateAuthState(id: string | number) {
  stateCache.delete(String(id));
}

// --- Account lockout (needs failed_login_count + locked_until columns) -------

export const LOCK_THRESHOLD = 5;
const LOCK_BASE_MS = 15 * 60 * 1000;
const LOCK_MAX_MS = 24 * 60 * 60 * 1000;

export function isLocked(user: AuthUserRow): boolean {
  return !!user.locked_until && new Date(user.locked_until).getTime() > Date.now();
}

export async function recordFailedLogin(user: AuthUserRow): Promise<void> {
  if (!(await hasUserColumn("failed_login_count")) || !(await hasUserColumn("locked_until"))) return;
  const count = user.failed_login_count + 1;
  let lockMs = 0;
  if (count >= LOCK_THRESHOLD && count % LOCK_THRESHOLD === 0) {
    // 15 min, 30 min, 1 h, ... capped at 24 h.
    lockMs = Math.min(LOCK_BASE_MS * 2 ** (count / LOCK_THRESHOLD - 1), LOCK_MAX_MS);
  }
  await db.query(
    `UPDATE users SET failed_login_count = $1,
            locked_until = CASE WHEN $2::bigint > 0 THEN NOW() + ($2::bigint * INTERVAL '1 millisecond') ELSE locked_until END
      WHERE id = $3`,
    [count, lockMs, user.id]
  );
}

export async function recordSuccessfulLogin(user: AuthUserRow): Promise<void> {
  const sets: string[] = [];
  if (await hasUserColumn("failed_login_count")) sets.push("failed_login_count = 0");
  if (await hasUserColumn("locked_until")) sets.push("locked_until = NULL");
  if (await hasUserColumn("last_login_at")) sets.push("last_login_at = NOW()");
  if (!sets.length) return;
  await db.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1`, [user.id]);
}

// --- Audit log (needs auth_audit_log table) ---------------------------------

export type AuditEvent =
  | "login_success"
  | "login_failure"
  | "login_locked"
  | "login_rate_limited"
  | "captcha_failed"
  | "session_revoked"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "access_denied";

export async function audit(
  event: AuditEvent,
  info: { userId?: string | null; email?: string | null; ip?: string | null; userAgent?: string | null; details?: unknown }
): Promise<void> {
  try {
    if (!(await schema()).hasAudit) return;
    await db.query(
      `INSERT INTO auth_audit_log (event, user_id, email, ip, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        event,
        info.userId ?? null,
        info.email ?? null,
        info.ip ?? null,
        info.userAgent ? info.userAgent.slice(0, 500) : null,
        info.details === undefined ? null : JSON.stringify(info.details),
      ]
    );
  } catch (err) {
    // Auditing must never break the request.
    console.error("[auth] audit write failed:", (err as Error).message);
  }
}
