"use client";

import React, { ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export type DataGridColumn<T> = {
  key: string;
  header: string;
  /** Cell renderer; defaults to String(row[key]). */
  render?: (row: T) => ReactNode;
  /** Value used for sorting; enables the sort toggle on the header. */
  sortValue?: (row: T) => string | number | null | undefined;
  className?: string;
};

type Props<T> = {
  rows: T[];
  columns: DataGridColumn<T>[];
  getRowId: (row: T) => string;
  /** Text matched by the search box (case-insensitive). */
  searchText: (row: T) => string;
  searchPlaceholder?: string;
  /** Extra filter controls rendered next to the search box. */
  filters?: ReactNode;
  /** Right-aligned toolbar content, typically the "Add" button. */
  actions?: ReactNode;
  isLoading?: boolean;
  error?: Error;
  emptyMessage?: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
};

const PAGE_SIZES = [10, 25, 50, 100];

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

export function DataGrid<T>({
  rows,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = "Search…",
  filters,
  actions,
  isLoading,
  error,
  emptyMessage = "No records found",
  initialSort,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = q ? rows.filter((r) => searchText(r).toLowerCase().includes(q)) : rows;
    const col = sort && columns.find((c) => c.key === sort.key);
    if (sort && col?.sortValue) {
      const dir = sort.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => dir * compare(col.sortValue!(a), col.sortValue!(b)));
    }
    return out;
  }, [rows, search, sort, columns, searchText]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  // Filters/search can shrink the result set below the current page.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  const pageRows = visible.slice(page * pageSize, page * pageSize + pageSize);

  const toggleSort = (key: string) =>
    setSort((s) =>
      s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null
    );

  return (
    <div className="rounded-xl border bg-white dark:bg-sidebar shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="pl-8"
            aria-label="Search"
          />
        </div>
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
        {actions && <div className="lg:ml-auto flex items-center gap-2">{actions}</div>}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={cn("whitespace-nowrap", col.className)}>
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-red-600">
                  Failed to load: {error.message}
                </TableCell>
              </TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={getRowId(row)}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t text-sm text-muted-foreground">
        <span>
          {visible.length === 0
            ? "0 records"
            : `${page * pageSize + 1}–${Math.min(visible.length, (page + 1) * pageSize)} of ${visible.length}` +
              (visible.length !== rows.length ? ` (filtered from ${rows.length})` : "")}
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(0);
            }}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular-nums">
            {page + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
