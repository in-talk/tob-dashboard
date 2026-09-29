import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import db from "@/lib/db";
import { PROVIDERS, Provider } from "./types";
import { isValidIp, normalizeIp } from "./ip";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Admin gate for the network API routes. Returns the display name recorded in
 * `updated_by`, or null after it has already sent a 401/403.
 */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return null;
  }
  if (session.user.role !== "admin") {
    res.status(403).json({ ok: false, error: "Forbidden" });
    return null;
  }
  return session.user.name || session.user.email || String(session.user.id);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export class ValidationError extends Error {}

export function parseIp(value: unknown, label = "IP address"): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${label} is required`);
  }
  if (!isValidIp(value)) {
    throw new ValidationError(`"${value.trim()}" is not a valid IPv4/IPv6 address`);
  }
  return normalizeIp(value);
}

export function parseProvider(value: unknown, required: boolean): Provider | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError("Provider is required");
    return null;
  }
  if (!PROVIDERS.includes(value as Provider)) {
    throw new ValidationError(`Provider must be one of: ${PROVIDERS.join(", ")}`);
  }
  return value as Provider;
}

export function parseId(value: unknown, label: string, required = true): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${label} is required`);
    return null;
  }
  const s = String(value);
  if (!/^\d+$/.test(s)) throw new ValidationError(`${label} is invalid`);
  return s;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

type PgError = { code?: string; constraint?: string; message?: string };

/** Map a thrown error to an HTTP response with a human-readable message. */
export function sendError(
  res: NextApiResponse,
  error: unknown,
  constraintMessages: Record<string, string> = {}
) {
  if (error instanceof ValidationError) {
    return res.status(400).json({ ok: false, error: error.message });
  }

  const pg = error as PgError;
  const known = pg.constraint ? constraintMessages[pg.constraint] : undefined;
  switch (pg.code) {
    case "23505": // unique_violation
      return res.status(409).json({ ok: false, error: known ?? "This record already exists" });
    case "23503": // foreign_key_violation
      return res.status(409).json({
        ok: false,
        error: known ?? "A referenced record does not exist or is still in use",
      });
    case "23514": // check_violation
      return res.status(400).json({
        ok: false,
        error: known ?? "IP must be a single host address (no CIDR range)",
      });
    case "22P02": // invalid_text_representation (bad inet / enum / id)
      return res.status(400).json({ ok: false, error: "Invalid value supplied" });
    case "42P01": // undefined_table
      return res.status(500).json({
        ok: false,
        error: "Network tables are missing — run db/migrations/network_schema_all.sql",
      });
  }

  console.error("[network api]", error);
  return res.status(500).json({
    ok: false,
    error: error instanceof Error ? error.message : "Unexpected error",
  });
}

// ---------------------------------------------------------------------------
// Generic CRUD route
// ---------------------------------------------------------------------------

type Values = Record<string, unknown>;

export type CrudConfig = {
  /** Table name — a constant, never user input. */
  table: string;
  /** Full SELECT used by GET (joins + ORDER BY). */
  listSql: string;
  /** Validate/normalise a POST/PUT body into column → value. */
  parse: (body: Values) => Values;
  /** Friendly messages keyed by constraint name. */
  constraintMessages?: Record<string, string>;
  /** Replace the default single-row INSERT (e.g. bulk or transactional create). */
  create?: (body: Values, actor: string) => Promise<Values>;
};

export function crudHandler(config: CrudConfig) {
  const { table, listSql, parse, constraintMessages = {} } = config;

  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    const actor = await requireAdmin(req, res);
    if (!actor) return;

    try {
      switch (req.method) {
        case "GET": {
          const result = await db.query(listSql);
          return res.status(200).json(result.rows);
        }

        case "POST": {
          if (config.create) {
            const payload = await config.create(req.body ?? {}, actor);
            return res.status(201).json({ ok: true, ...payload });
          }
          const values = { ...parse(req.body ?? {}), updated_by: actor };
          const cols = Object.keys(values);
          const result = await db.query(
            `INSERT INTO ${table} (${cols.join(", ")})
             VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})
             RETURNING id`,
            Object.values(values)
          );
          return res.status(201).json({ ok: true, id: result.rows[0].id, message: "Created" });
        }

        case "PUT": {
          const id = parseId(req.body?.id, "id");
          const values = { ...parse(req.body ?? {}), updated_by: actor };
          const cols = Object.keys(values);
          const result = await db.query(
            `UPDATE ${table}
             SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")}
             WHERE id = $${cols.length + 1}
             RETURNING id`,
            [...Object.values(values), id]
          );
          if (!result.rowCount) {
            return res.status(404).json({ ok: false, error: "Record not found" });
          }
          return res.status(200).json({ ok: true, id, message: "Updated" });
        }

        case "DELETE": {
          const id = parseId(req.body?.id, "id");
          const result = await db.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]);
          if (!result.rowCount) {
            return res.status(404).json({ ok: false, error: "Record not found" });
          }
          return res.status(200).json({ ok: true, message: "Deleted" });
        }

        default:
          res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
          return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
      }
    } catch (error) {
      return sendError(res, error, constraintMessages);
    }
  };
}

// ---------------------------------------------------------------------------
// Client IP helpers (shared by /api/network/client-ips, the Kamailio mapping
// "add IP directly" flow, and client creation)
// ---------------------------------------------------------------------------

type Queryable = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number | null }>;
};

/**
 * Insert already-validated IPs for a client, skipping any the client already
 * has. `ON CONFLICT DO NOTHING` covers both the (client_id, ip) constraint and
 * the partial unique index for unassigned IPs.
 */
export async function insertClientIps(
  q: Queryable,
  clientId: string | null,
  ips: string[],
  provider: Provider | null,
  actor: string
): Promise<{ inserted: string[]; skipped: string[] }> {
  if (ips.length === 0) return { inserted: [], skipped: [] };

  // Compare in inet space so IPv6 spellings like 2001:0db8::1 / 2001:db8::1
  // are treated as the same address.
  const result = await q.query(
    `WITH input AS (SELECT DISTINCT unnest($2::inet[]) AS ip),
          ins AS (
            INSERT INTO client_ips (client_id, ip, provider, updated_by)
            SELECT $1, ip, $3, $4 FROM input
            ON CONFLICT DO NOTHING
            RETURNING ip
          )
     SELECT host(i.ip) AS ip, (ins.ip IS NOT NULL) AS inserted
     FROM input i LEFT JOIN ins ON ins.ip = i.ip`,
    [clientId, ips, provider, actor]
  );
  const inserted: string[] = [];
  const skipped: string[] = [];
  for (const row of result.rows) (row.inserted ? inserted : skipped).push(String(row.ip));
  return { inserted, skipped };
}

/** Return the id of (clientId, ip) in client_ips, creating the row if needed. */
export async function findOrCreateClientIp(
  q: Queryable,
  clientId: string | null,
  ip: string,
  provider: Provider | null,
  actor: string
): Promise<string> {
  const existing = await q.query(
    `SELECT id FROM client_ips
     WHERE ip = $1::inet AND client_id IS NOT DISTINCT FROM $2::bigint`,
    [ip, clientId]
  );
  if (existing.rows[0]) return String(existing.rows[0].id);

  const created = await q.query(
    `INSERT INTO client_ips (client_id, ip, provider, updated_by)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [clientId, ip, provider, actor]
  );
  return String(created.rows[0].id);
}
