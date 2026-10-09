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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AsteriskMachine, AudioSyncResult } from "@/lib/network/types";
import { ProviderBadge } from "./shared";

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

  const allSelected = machines.length > 0 && selected.size === machines.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(machines.map((m) => m.id)) : new Set());

  const label = allSelected
    ? `All machines (${machines.length})`
    : selected.size === 0
      ? "Select machines…"
      : selected.size === 1
        ? machineLabel(machines.find((m) => selected.has(m.id)))
        : `${selected.size} machines selected`;

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

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between font-normal"
              disabled={running || !machines.length}
            >
              <span className={cn(!selected.size && "text-muted-foreground")}>
                {machines.length ? label : "No Asterisk machines"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1">
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-muted">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(c) => toggleAll(c === true)}
              />
              Select all
            </label>
            <div className="my-1 border-t" />
            {machines.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={selected.has(m.id)}
                  onCheckedChange={(c) => toggle(m.id, c === true)}
                />
                <span className="min-w-0">
                  {m.name && <span className="block truncate font-medium">{m.name}</span>}
                  <span className={cn("font-mono", m.name && "text-xs text-muted-foreground")}>
                    {m.ip}
                  </span>
                  {m.private_ip && (
                    <span className="ml-1 font-mono text-xs text-muted-foreground">
                      ({m.private_ip})
                    </span>
                  )}
                </span>
                <span className="ml-auto">
                  <ProviderBadge provider={m.provider} />
                </span>
              </label>
            ))}
          </PopoverContent>
        </Popover>

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

function machineLabel(m: AsteriskMachine | undefined) {
  if (!m) return "";
  return m.name ? `${m.name} (${m.ip})` : m.ip;
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
