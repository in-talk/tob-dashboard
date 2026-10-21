import fs from "fs";
import { Pool, PoolClient, PoolConfig } from "pg";

// TLS to Postgres. Set DB_SSL_CA (path to the server CA .pem, or the PEM text
// itself) to verify the server certificate — that's what stops a
// man-in-the-middle. Without it, production keeps the previous encrypted-but-
// unverified behaviour and logs a warning so this doesn't go unnoticed.
function sslConfig(): PoolConfig["ssl"] {
  const ca = process.env.DB_SSL_CA;
  if (ca) {
    const pem = ca.includes("-----BEGIN") ? ca : fs.readFileSync(ca, "utf8");
    return { ca: pem, rejectUnauthorized: true };
  }
  if (process.env.NODE_ENV === "production") {
    console.warn("[db] DB_SSL_CA not set — Postgres TLS certificate is NOT verified.");
    return { rejectUnauthorized: false };
  }
  return false;
}

const pool = new Pool({
  connectionString: process.env.POSTGRESDATABASE_URL,
  ssl: sslConfig(),
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query(text: string, params: any[] = []) {
  const res = await pool.query(text, params);
  return res;
}

/** Run `fn` inside BEGIN/COMMIT on a single connection; rolls back on throw. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getUser(email: string) {
  const result = await query("SELECT * FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  return result.rows[0];
}

export async function getUserById(id: string) {
  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0];
}

const db = { query, withTransaction, getUser, getUserById };
export default db;
