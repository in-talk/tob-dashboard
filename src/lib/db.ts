import { Pool, PoolClient } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRESDATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
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
