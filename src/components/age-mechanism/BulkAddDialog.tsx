"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

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

export type ParsedLine<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type BulkAddDialogProps<T> = {
  /** Plural noun for the entities, e.g. "Weird Cases". */
  itemNoun: string;
  /** Short help text explaining the expected line format. */
  formatHint: ReactNode;
  /** Textarea placeholder illustrating the format. */
  placeholder: string;
  /** Parse a single trimmed, non-empty line into a payload (or an error). */
  parseLine: (line: string) => ParsedLine<T>;
  /** Persist the parsed payloads. Should throw on failure. */
  onSubmit: (items: T[]) => Promise<void>;
};

/**
 * Generic "Bulk Add" dialog. The user pastes one entry per line; each line is
 * parsed with `parseLine`, valid/invalid counts are previewed, and the valid
 * payloads are handed to `onSubmit`.
 */
export default function BulkAddDialog<T>({
  itemNoun,
  formatHint,
  placeholder,
  parseLine,
  onSubmit,
}: BulkAddDialogProps<T>) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const valid: T[] = [];
    const errors: { line: number; raw: string; error: string }[] = [];
    lines.forEach((line, i) => {
      const r = parseLine(line);
      if (r.ok) valid.push(r.value);
      else errors.push({ line: i + 1, raw: line, error: r.error });
    });
    return { valid, errors, total: lines.length };
  }, [text, parseLine]);

  const handleOpenChange = (next: boolean) => {
    if (submitting) return; // don't allow closing mid-submit
    setOpen(next);
    if (!next) setText("");
  };

  const handleSubmit = async () => {
    if (!parsed.valid.length || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(parsed.valid);
      setOpen(false);
      setText("");
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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add {itemNoun}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{formatHint}</div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="min-h-[180px] font-mono text-sm"
          />
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
                <div key={e.line} className="text-destructive">
                  Line {e.line}: {e.error} —{" "}
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
