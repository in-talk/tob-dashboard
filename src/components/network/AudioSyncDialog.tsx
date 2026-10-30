"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AsteriskMachine, AudioSyncResult } from "@/lib/network/types";
import { MachinePicker } from "./MachinePicker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machines: AsteriskMachine[];
};

/**
 * Pick Asterisk machines from a checkbox dropdown and trigger
 * /sync-audios?wait=1 on each (proxied through the dashboard server), then
 * show a success/failure line per machine.
 */
export function AudioSyncDialog({ open, onOpenChange, machines }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<AudioSyncResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(new Set(machines.map((m) => m.id)));
      setResults(null);
      setError(null);
    }
    // Reset only when the dialog opens, not when the list refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/network/asterisk-sync-audios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
      const list = data.results as AudioSyncResult[];
      setResults(list);
      toast({
        variant: list.some((r) => !r.success) ? "destructive" : "success",
        description: data.message,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setRunning(false);
    }
  };

  const okCount = results?.filter((r) => r.success).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !running && onOpenChange(o)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sync audios</DialogTitle>
          <DialogDescription>
            Pulls the latest audio files from S3 on each selected Asterisk machine (via its public
            IP). This can take a few minutes per machine; they run in parallel.
          </DialogDescription>
        </DialogHeader>

        <MachinePicker
          machines={machines}
          selected={selected}
          onChange={setSelected}
          disabled={running}
        />

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {running && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Syncing audios on {selected.size}{" "}
            machine(s)… keep this dialog open.
          </div>
        )}

        {results && (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {okCount} succeeded · {results.length - okCount} failed
            </div>
            {results.map((r) => (
              <ResultRow key={r.id} result={r} />
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
            Close
          </Button>
          <Button onClick={run} disabled={running || !selected.size}>
            {running && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Sync {selected.size ? `${selected.size} machine(s)` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultRow({ result }: { result: AudioSyncResult }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = result.success ? CheckCircle2 : XCircle;
  return (
    <div className="rounded-lg border p-3">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setExpanded((e) => !e)}
        disabled={!result.logs.length}
      >
        <Icon
          className={cn("h-4 w-4 shrink-0", result.success ? "text-green-600" : "text-red-600")}
        />
        {result.name ? (
          <span className="text-sm font-medium">
            {result.name}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">{result.ip}</span>
          </span>
        ) : (
          <span className="font-mono text-sm font-medium">{result.ip}</span>
        )}
        <span
          className={cn(
            "text-xs font-medium",
            result.success ? "text-green-600" : "text-red-600"
          )}
        >
          {result.success ? "Success" : "Failed"}
        </span>
        <span className="truncate text-xs text-muted-foreground">— {result.message}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          {(result.duration_ms / 1000).toFixed(1)}s
          {result.logs.length > 0 &&
            (expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
        </span>
      </button>
      {expanded && (
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
          {result.logs.join("\n")}
        </pre>
      )}
    </div>
  );
}
