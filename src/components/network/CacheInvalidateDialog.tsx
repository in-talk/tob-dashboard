"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
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
import { fetcher } from "@/utils/fetcher";
import { AsteriskMachine, CacheInvalidateResult } from "@/lib/network/types";
import { MachinePicker } from "./MachinePicker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The client whose cache to reset, or null to reset every client's cache. */
  client: { client_id: string; name: string } | null;
};

/**
 * Pick Asterisk machines and call /invalidate-cache on each (proxied through
 * the dashboard server), then show each machine's reply. Machines are called
 * independently: an offline machine just shows as failed.
 */
export function CacheInvalidateDialog({ open, onOpenChange, client }: Props) {
  // Only load the machine list while the dialog is open.
  const { data: machines, error: loadError, isLoading } = useSWR<AsteriskMachine[]>(
    open ? "/api/network/asterisk" : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const list = machines ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CacheInvalidateResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset when the dialog opens (or switches client).
  useEffect(() => {
    if (open) {
      setResults(null);
      setError(null);
    }
  }, [open, client?.client_id]);

  // Select every machine by default once the list arrives.
  useEffect(() => {
    if (open && machines) setSelected(new Set(machines.map((m) => m.id)));
  }, [open, machines, client?.client_id]);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/network/invalidate-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], client_id: client?.client_id ?? null }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
      const out = data.results as CacheInvalidateResult[];
      setResults(out);
      toast({
        variant: out.some((r) => !r.success) ? "destructive" : "success",
        description: data.message,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cache reset failed");
    } finally {
      setRunning(false);
    }
  };

  const okCount = results?.filter((r) => r.success).length ?? 0;
  const title = client ? `Reset cache — ${client.name}` : "Reset cache — all clients";

  return (
    <Dialog open={open} onOpenChange={(o) => !running && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {client ? (
              <>
                Clears the cached settings for client <b>#{client.client_id}</b> on each selected
                Asterisk machine.
              </>
            ) : (
              <>Clears the cached settings for <b>every client</b> on each selected Asterisk machine.</>
            )}{" "}
            Each machine is called separately, so a machine that is off doesn&apos;t affect the
            others.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading Asterisk machines…
          </div>
        ) : loadError ? (
          <div className="text-sm text-red-600">Couldn&apos;t load Asterisk machines.</div>
        ) : (
          <MachinePicker
            machines={list}
            selected={selected}
            onChange={setSelected}
            disabled={running}
          />
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {running && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Resetting cache on {selected.size}{" "}
            machine(s)…
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
            Reset cache{selected.size ? ` on ${selected.size} machine(s)` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultRow({ result }: { result: CacheInvalidateResult }) {
  const Icon = result.success ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-start gap-2 rounded-lg border p-3">
      <Icon
        className={cn("mt-0.5 h-4 w-4 shrink-0", result.success ? "text-green-600" : "text-red-600")}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {result.name ? (
            <span className="text-sm font-medium">
              {result.name}{" "}
              <span className="font-mono text-xs font-normal text-muted-foreground">{result.ip}</span>
            </span>
          ) : (
            <span className="font-mono text-sm font-medium">{result.ip}</span>
          )}
          <span
            className={cn("text-xs font-medium", result.success ? "text-green-600" : "text-red-600")}
          >
            {result.success ? "Success" : "Failed"}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {(result.duration_ms / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="break-words text-xs text-muted-foreground">{result.message}</div>
      </div>
    </div>
  );
}
