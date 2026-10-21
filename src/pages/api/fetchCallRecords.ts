import { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/db";
import { formatDateForDB } from "@/utils/formatDateTime";
import { AuthedUser, requireClientAccess, withApiAuth } from "@/lib/auth/guard";

function toInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

async function handler(req: NextApiRequest, res: NextApiResponse, user: AuthedUser) {
  const defaultToDate = new Date().toISOString().split("T")[0];

  const {
    client_id,
    from_date = defaultToDate,
    to_date = `${defaultToDate} 23:59:59`,
    caller_id = null,
    call_id = null,
    search_term = null,
    page = 1,
    num_of_records = 10,
    user_id = null,
  } = req.body ?? {};

  // Admins may query across all clients (client_id null); everyone else
  // must name one of their own clients.
  const clientId = await requireClientAccess(user, client_id, res, { allowAll: true });
  if (clientId === null) return;

  const result = await db.query(
    `SELECT * FROM get_client_data_paginated($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
    [
      clientId === "all" ? null : clientId,
      from_date ? formatDateForDB(from_date) : null,
      to_date ? formatDateForDB(to_date) : null,
      caller_id === null || caller_id === "" ? null : String(caller_id),
      call_id === null || call_id === "" ? null : toInt(call_id, 0, 0, 2_147_483_647),
      search_term === null || search_term === "" ? null : String(search_term).slice(0, 200),
      toInt(page, 1, 1, 1_000_000),
      toInt(num_of_records, 10, 1, 100_000),
      user_id === null || user_id === "" ? null : String(user_id),
    ]
  );

  res.status(200).json({ callRecords: { rows: result.rows } });
}

export default withApiAuth(handler, { roles: { POST: ["admin", "user"] } });
