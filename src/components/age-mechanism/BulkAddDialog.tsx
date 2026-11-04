"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Download, FileSpreadsheet, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CustomLoader from "@/components/ui/CustomLoader";
import {
  readSheet,
  type BulkColumn,
  type SheetRow,
} from "@/components/age-mechanism/bulkSheet";

export type { BulkColumn };

export type ParsedLine<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type BulkAddDialogProps<T> = {
  /** Plural noun for the entities, e.g. "Weird Cases". */
  itemNoun: string;
  /** Short help text explaining the expected line format. */
  formatHint: ReactNode;
  /** Textarea placeholder illustrating the format (also the template rows). */
  placeholder: string;
  /** Columns, in order. Drives Excel header matching, help text and template. */
  columns: BulkColumn[];
  /** Validate one entry's cells (already trimmed, in `columns` order). */
  parseCells: (cells: string[]) => ParsedLine<T>;
  /** Persist the parsed payloads. Should throw on failure. */
  onSubmit: (items: T[]) => Promise<void>;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Generic "Bulk Add" dialog. Entries come from pasted lines (cells separated
 * by "|") and/or an uploaded Excel / CSV file (one row per entry). Each entry
 * is validated with `parseCells`, valid/invalid counts are previewed, and the
 * valid payloads are handed to `onSubmit`.
 */
export default function BulkAddDialog<T>({
  itemNoun,
  formatHint,
  placeholder,
  columns,
  parseCells,
  onSubmit,
}: BulkAddDialogProps<T>) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState<{ name: string; rows: SheetRow[] } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    const valid: T[] = [];
    const errors: { key: string; where: string; raw: string; error: string }[] = [];

    text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .forEach((line, i) => {
        const r = parseCells(line.split("|").map((p) => p.trim()));
        if (r.ok) valid.push(r.value);
        else errors.push({ key: `l${i}`, where: `Line ${i + 1}`, raw: line, error: r.error });
      });

    sheet?.rows.forEach(({ row, cells }) => {
      const r = parseCells(cells);
      if (r.ok) valid.push(r.value);
      else
        errors.push({
          key: `r${row}`,
          where: `Excel row ${row}`,
          raw: cells.filter(Boolean).join(" | "),
          error: r.error,
        });
    });

    return { valid, errors };
  }, [text, sheet, parseCells]);

  const reset = () => {
    setText("");
    setSheet(null);
    setFileError(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return; // don't allow closing mid-submit
    setOpen(next);
    if (!next) reset();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    if (file.size > MAX_FILE_BYTES) {
      setFileError("File is larger than 5 MB.");
      return;
    }
    setReading(true);
    try {
      const rows = await readSheet(file, columns);
      if (!rows.length) {
        setSheet(null);
        setFileError("No rows found in the first sheet.");
      } else {
        setSheet({ name: file.name, rows });
      }
    } catch (err) {
      console.error(err);
      setSheet(null);
      setFileError("Could not read this file. Use .xlsx, .xls or .csv.");
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const examples = placeholder
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => l.split("|").map((p) => p.trim()));
    const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.name), ...examples]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${itemNoun.toLowerCase().replace(/\s+/g, "-")}-template.xlsx`);
  };

  const handleSubmit = async () => {
    if (!parsed.valid.length || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(parsed.valid);
      setOpen(false);
      reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add {itemNoun}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{formatHint}</div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="min-h-[140px] font-mono text-sm"
          />

          {/* ── Excel / CSV upload ─────────────────────────────── */}
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={reading || submitting}
                onClick={() => fileInput.current?.click()}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {reading ? "Reading..." : "Upload Excel"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" /> Template
              </Button>
              {sheet && (
                <span className="flex items-center gap-1 text-xs">
                  {sheet.name} · {sheet.rows.length} row{sheet.rows.length === 1 ? "" : "s"}
                  <button
                    type="button"
                    aria-label="Remove file"
                    className="rounded p-0.5 hover:bg-muted"
                    onClick={() => setSheet(null)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <span className="font-medium">Excel format:</span> .xlsx, .xls or
                .csv. Only the first sheet is read, one entry per row. Put the
                column names in the first row (any order); without a header
                row, columns are read in the order below.
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="border px-2 py-1 font-medium">Column</th>
                    <th className="border px-2 py-1 font-medium">Required</th>
                    <th className="border px-2 py-1 font-medium">Values</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((c) => (
                    <tr key={c.name}>
                      <td className="border px-2 py-1 font-mono">{c.name}</td>
                      <td className="border px-2 py-1">{c.required ? "Yes" : "No"}</td>
                      <td className="border px-2 py-1">{c.hint ?? "Any text"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-green-600 dark:text-green-400">
              {parsed.valid.length} valid
            </span>
            {parsed.errors.length > 0 && (
              <span className="text-destructive">
                {parsed.errors.length} invalid
              </span>
            )}
          </div>
          {parsed.errors.length > 0 && (
            <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs">
              {parsed.errors.map((e) => (
                <div key={e.key} className="text-destructive">
                  {e.where}: {e.error} —{" "}
                  <span className="opacity-70">{e.raw}</span>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            className="w-full"
            disabled={!parsed.valid.length || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <span className="mr-3">Adding...</span>
                <CustomLoader />
              </>
            ) : (
              `Add ${parsed.valid.length || ""} ${itemNoun}`.replace(/\s+/g, " ").trim()
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
