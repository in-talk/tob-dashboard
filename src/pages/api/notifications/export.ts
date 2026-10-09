import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { DateTime } from "luxon";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import db from "@/lib/db";
import { DEFAULT_TIMEZONE } from "@/utils/timezone";

// Admin-only CSV export of notifications inside a date/time window.
//
//   GET /api/notifications/export?from=ISO&to=ISO[&severity=all|error|warn|info][&limit=10000]
//
// Returns text/csv with a Content-Disposition attachment header so browsers
// trigger a file download. Rows are ordered newest-first and capped by
// `limit` (default 10000, hard max 50000) so a bad range can't blow up the
// response.
//
// Written as an ordinary SELECT rather than a stored function because the
// filter combinations are dynamic and the pg role would need per-parameter
// grants otherwise — see the notifications table permission note in the
// `get_notifications` function.

const HARD_MAX = 50_000;

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(
  header: string[],
  rows: Record<string, unknown>[]
): string {
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(header.map((h) => csvCell(r[h])).join(","));
  }
  return lines.join("\n");
}

function parseIso(input: unknown): Date | null {
  if (typeof input !== "string" || !input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (session.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const from = parseIso(req.query.from);
  const to = parseIso(req.query.to);
  if (!from || !to) {
    return res.status(400).json({
      error: "Both `from` and `to` are required ISO 8601 timestamps.",
    });
  }
  if (from > to) {
    return res.status(400).json({ error: "`from` must be <= `to`." });
  }

  const rawSeverity = String(req.query.severity ?? "all").toLowerCase();
  const severity = ["error", "warn", "warning", "info"].includes(rawSeverity)
    ? rawSeverity
    : "all";

  const limit = Math.min(
    Math.max(Number(req.query.limit) || 10_000, 1),
    HARD_MAX
  );

  // Timezone the caller wants the human-readable created_at column rendered
  // in. Fall back to the product default so a CSV opened by anyone looks the
  // same by default. Validated via Luxon so a bogus zone can't crash the
  // formatter later.
  const rawTz = String(req.query.tz ?? "").trim();
  const tzCandidate = rawTz || DEFAULT_TIMEZONE;
  const timezone = DateTime.now().setZone(tzCandidate).isValid
    ? tzCandidate
    : DEFAULT_TIMEZONE;

  try {
    const params: unknown[] = [from.toISOString(), to.toISOString()];
    let where = "created_at BETWEEN $1 AND $2";
    if (severity !== "all") {
      params.push(severity);
      where += ` AND severity = $${params.length}`;
    }
    params.push(limit);
    const sql = `
      SELECT id, type, severity, call_id, client_id, title, body, created_at
      FROM notifications
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `;
    const result = await db.query(sql, params);

    // Augment each row with a human-readable timestamp in the caller's zone.
    // `created_at` stays UTC-ISO so downstream pipelines keep an unambiguous
    // reference; `created_at_local` is what a human reads in Excel.
    const rows = result.rows.map((r) => ({
      ...r,
      created_at_local: r.created_at
        ? DateTime.fromJSDate(new Date(r.created_at as string))
            .setZone(timezone)
            .toFormat("yyyy-LL-dd HH:mm:ss ZZZZ")
        : "",
    }));

    const header = [
      "id",
      "type",
      "severity",
      "call_id",
      "client_id",
      "title",
      "body",
      "created_at",
      "created_at_local",
    ];
    const csv = toCsv(header, rows);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileFrom = from.toISOString().slice(0, 10);
    const fileTo = to.toISOString().slice(0, 10);
    const filename = `notifications_${fileFrom}_to_${fileTo}_${stamp}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(csv);
  } catch (error) {
    // Table missing (fresh env) — hand back an empty CSV instead of 500ing.
    const code = (error as { code?: string }).code;
    if (code === "42P01") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="notifications_empty.csv"`
      );
      return res.status(200).send(
        "id,type,severity,call_id,client_id,title,body,created_at,created_at_local\n"
      );
    }
    console.error("Error exporting notifications:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
