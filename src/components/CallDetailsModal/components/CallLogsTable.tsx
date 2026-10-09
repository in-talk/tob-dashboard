import React, { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import { parseNestedJSON } from "@/utils/parseMetaData";
import { useTimezone } from "@/context/TimezoneContext";
import { CallLog } from "@/types/callDetails";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "../../ui/table";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../ui/Select";

interface CallLogsTableProps {
  callLogs: CallLog[];
}

const STATUS_OPTIONS = ["all", "error", "warning", "info", "success"] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];

// The status string in a CallLog varies ("error", "err", "warn", "warning" …).
// Normalize so filtering + row highlighting agree.
function normalizeStatus(raw: string | undefined): StatusOption | "other" {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return "other";
  if (s.startsWith("err")) return "error";
  if (s.startsWith("warn")) return "warning";
  if (s.startsWith("info")) return "info";
  if (s.startsWith("succ") || s === "ok") return "success";
  return "other";
}

function rowClassFor(status: StatusOption | "other"): string {
  switch (status) {
    case "error":
      return "bg-red-50/60 dark:bg-red-950/30 hover:bg-red-100/60 dark:hover:bg-red-950/50";
    case "warning":
      return "bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/60 dark:hover:bg-amber-950/50";
    case "success":
      return "bg-emerald-50/40 dark:bg-emerald-950/20";
    default:
      return "";
  }
}

// RFC-4180-ish CSV cell: quote when the value has a comma/newline/quote.
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// `timestamp` arrives as a stringified ISO when the backend sends UTC, but
// older logs sometimes already carry a pre-formatted local string. Try the
// zone-aware formatter; if the value doesn't parse, fall back to the raw
// text so we never show "Invalid Date".
function safeFormat(
  raw: string,
  formatter: (input: string) => string
): string {
  if (!raw) return "";
  // Looks ISO-ish: starts with YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      try {
        return formatter(raw);
      } catch {
        /* fall through */
      }
    }
  }
  return raw;
}

function toCsv(
  rows: CallLog[],
  formatForExport: (input: string) => string,
  timezone: string
): string {
  const header = [
    "turn",
    "emoji",
    "action",
    "status",
    `timestamp (${timezone})`,
    "timeFromStart",
    "additionalData",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const additional =
      r.additionalData && Object.keys(r.additionalData).length > 0
        ? JSON.stringify(parseNestedJSON(r.additionalData))
        : "";
    lines.push(
      [
        r.turn,
        r.emoji,
        r.action,
        r.status,
        safeFormat(r.timestamp, formatForExport),
        r.timeFromStart,
        additional,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return lines.join("\n");
}

function triggerBrowserDownload(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function CallLogsTable({ callLogs }: CallLogsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusOption>("all");
  const { timezone, format: formatInTz, formatForExport } = useTimezone();

  const rows = callLogs ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && normalizeStatus(r.status) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [
        r.turn,
        r.action,
        r.status,
        r.timestamp,
        r.timeFromStart,
        r.emoji,
      ]
        .map((v) => (v == null ? "" : String(v).toLowerCase()))
        .join(" ");
      return hay.includes(q);
    });
  }, [rows, search, statusFilter]);

  const errorCount = useMemo(
    () => rows.filter((r) => normalizeStatus(r.status) === "error").length,
    [rows]
  );

  const handleExportCsv = () => {
    const csv = toCsv(
      filtered,
      (iso) => formatForExport(iso),
      timezone
    );
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    triggerBrowserDownload(`call-logs-${stamp}.csv`, csv, "text/csv");
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-bold">Call Logs</h2>
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {rows.length}
            {errorCount > 0 ? (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/40 px-2 py-0.5 text-red-700 dark:text-red-300">
                {errorCount} error{errorCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs…"
              className="pl-9 h-9 w-full sm:w-[240px]"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusOption)}
          >
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-9"
            disabled={filtered.length === 0}
            onClick={handleExportCsv}
            title="Download the filtered logs as CSV"
          >
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Scrolls independently in both axes; height is fluid on mobile. */}
      <div className="w-full overflow-auto rounded-md border max-h-[60vh] min-h-[240px] text-sm">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-[inset_0_-1px_0_hsl(var(--border))]">
            <TableRow>
              <TableHead className="w-[64px]">Turn</TableHead>
              <TableHead className="w-[56px]">Emoji</TableHead>
              <TableHead className="min-w-[260px]">Action</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead
                className="w-[180px] whitespace-nowrap"
                title={`Timestamps shown in ${timezone}`}
              >
                Timestamp
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  ({timezone})
                </span>
              </TableHead>
              <TableHead className="w-[140px] whitespace-nowrap">
                Time From Start
              </TableHead>
              <TableHead className="w-[90px] text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  {rows.length === 0
                    ? "No call logs available."
                    : "No rows match the current search/filter."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, i) => {
                const status = normalizeStatus(row.status);
                let additionData = "";
                if (row.additionalData) {
                  const normalized = parseNestedJSON(row.additionalData);
                  additionData = JSON.stringify(normalized, null, 2);
                }
                return (
                  <TableRow key={i} className={rowClassFor(status)}>
                    <TableCell className="align-top">{row.turn}</TableCell>
                    <TableCell className="align-top">{row.emoji}</TableCell>
                    <TableCell className="align-top break-words">
                      {row.action}
                    </TableCell>
                    <TableCell className="align-top whitespace-nowrap">
                      {row.status}
                    </TableCell>
                    <TableCell
                      className="align-top whitespace-nowrap font-mono text-xs"
                      title={`Raw: ${row.timestamp}`}
                    >
                      {safeFormat(row.timestamp, (iso) => formatInTz(iso))}
                    </TableCell>
                    <TableCell className="align-top whitespace-nowrap font-mono text-xs">
                      {row.timeFromStart}
                    </TableCell>
                    <TableCell className="align-top text-right">
                      {row.additionalData &&
                      Object.keys(row.additionalData).length !== 0 ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="link"
                              className="p-0 h-auto font-normal"
                            >
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden flex flex-col">
                            <DialogHeader className="flex-row items-center justify-between">
                              <DialogTitle>Additional Data</DialogTitle>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard
                                    ?.writeText(additionData)
                                    .catch(() => {});
                                }}
                              >
                                Copy JSON
                              </Button>
                            </DialogHeader>
                            <pre className="overflow-auto text-xs font-mono p-3 rounded-md bg-muted/50 whitespace-pre-wrap break-words">
                              {additionData}
                            </pre>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default CallLogsTable;
