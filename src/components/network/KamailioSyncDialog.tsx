"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fetcher } from "@/utils/fetcher";
import { KamailioSyncPreview, KamailioSyncResult } from "@/lib/network/types";
import { ProviderBadge } from "./shared";

/** "Sync Kamailio" button + dialog. Drop it into any network page toolbar. */
export function KamailioSyncButton({ variant = "outline" }: { variant?: "outline" | "default" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <RefreshCw className="mr-1.5 h-4 w-4" />
        Sync Kamailio
      </Button>
      <KamailioSyncDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/**
 * Pick Kamailio servers and push each one's complete client-IP and Asterisk
 * lists to its Sync API (POST :7778/api/v1/sync, proxied by the dashboard
 * server). Shows what will be sent first, then each server's result.
 */
export function KamailioSyncDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: previews, error: loadError, isLoading, mutate } = useSWR<KamailioSyncPreview[]>(
    open ? "/api/network/kamailio-sync" : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const list = useMemo(() => previews ?? [], [previews]);
  const ready = useMemo(() => list.filter((p) => !p.problems.length), [list]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<KamailioSyncResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResults(null);
      setError(null);
    }
  }, [open]);

  // Pre-select every server that is ready to sync.
  useEffect(() => {
    if (open && previews) setSelected(new Set(previews.filter((p) => !p.problems.length).map((p) => p.id)));
  }, [open, previews]);

  const allSelected = ready.length > 0 && ready.every((p) => selected.has(p.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const run = async () => {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/network/kamailio-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
      const out = data.results as KamailioSyncResult[];
      setResults(out);
      toast({
        variant: out.every((r) => r.status === "success") ? "success" : "destructive",
        description: data.message,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setRunning(false);
      mutate();
    }
  };

  const okCount = results?.filter((r) => r.status === "success").length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !running && onOpenChange(o)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sync Kamailio</DialogTitle>
          <DialogDescription>
            Sends each selected Kamailio its <b>complete</b> current list of client IPs and Asterisk
            machines. Kamailio replaces what it has with these lists and reloads, without a restart.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading Kamailio servers…
          </div>
        ) : loadError ? (
          <div className="text-sm text-red-600">
            Couldn&apos;t load Kamailio servers{loadError instanceof Error ? `: ${loadError.message}` : ""}.
          </div>
        ) : !list.length ? (
          <div className="text-sm text-muted-foreground">No Kamailio servers have been added yet.</div>
        ) : (
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 px-1 text-sm font-medium">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                disabled={running || !ready.length}
                onCheckedChange={(c) => setSelected(c === true ? new Set(ready.map((p) => p.id)) : new Set())}
              />
              Select all ready servers ({ready.length} of {list.length})
            </label>
            {list.map((p) => (
              <PreviewRow
                key={p.id}
                preview={p}
                checked={selected.has(p.id)}
                disabled={running}
                onCheckedChange={(c) => toggle(p.id, c)}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {running && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Syncing {selected.size} Kamailio server(s)…
          </div>
        )}

        {results && (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {okCount} synced · {results.length - okCount} not synced
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
            Sync{selected.size ? ` ${selected.size} server(s)` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewRow({
  preview,
  checked,
  disabled,
  onCheckedChange,
}: {
  preview: KamailioSyncPreview;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const [showBody, setShowBody] = useState(false);
  const blocked = preview.problems.length > 0;
  const p = preview.payload;
  return (
    <div className={cn("rounded-lg border p-3", blocked && "border-amber-500/40 bg-amber-500/5")}>
      <div className="flex items-start gap-2">
        <Checkbox
          className="mt-0.5"
          checked={checked && !blocked}
          disabled={disabled || blocked}
          onCheckedChange={(c) => onCheckedChange(c === true)}
          aria-label={`Sync Kamailio ${preview.ip}`}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium">{preview.ip}</span>
            <ProviderBadge provider={preview.provider} />
            {p && (
              <span className="text-xs text-muted-foreground">
                {p.vicidial_ips.length} client IP(s) · {p.asterisk_servers.length} Asterisk
              </span>
            )}
            {p && (
              <button
                type="button"
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowBody((s) => !s)}
              >
                {showBody ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                What will be sent
              </button>
            )}
          </div>
          {preview.problems.map((msg, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {msg}
            </div>
          ))}
          {showBody && p && (
            <pre className="max-h-56 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(p, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<KamailioSyncResult["status"], { label: string; cls: string }> = {
  success: { label: "Synced", cls: "text-green-600" },
  partial: { label: "Partial: reload failed", cls: "text-amber-600" },
  failed: { label: "Failed", cls: "text-red-600" },
  skipped: { label: "Not sent", cls: "text-amber-600" },
};

function ResultRow({ result }: { result: KamailioSyncResult }) {
  const [expanded, setExpanded] = useState(false);
  const style = STATUS_STYLE[result.status];
  const Icon = result.status === "success" ? CheckCircle2 : result.status === "failed" ? XCircle : AlertTriangle;
  const d = result.data as
    | {
        vicidial?: Record<string, unknown>;
        asterisk?: Record<string, unknown>;
        runtime_reload?: Record<string, unknown>;
        database_updated?: boolean;
      }
    | null;

  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", style.cls)} />
        <span className="font-mono text-sm font-medium">{result.ip}</span>
        <span className={cn("text-xs font-medium", style.cls)}>{style.label}</span>
        {result.code && (
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{result.code}</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {(result.duration_ms / 1000).toFixed(1)}s
        </span>
      </div>
      <div className="text-xs text-muted-foreground break-words">{result.message}</div>
      {result.request_id && (
        <div className="text-xs">
          Request ID: <span className="select-all font-mono">{result.request_id}</span>
        </div>
      )}
      {d && (d.vicidial || d.asterisk) && (
        <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
          {d.vicidial && <Counts title="Client IPs (address)" counts={d.vicidial} />}
          {d.asterisk && <Counts title="Asterisk (dispatcher)" counts={d.asterisk} />}
        </div>
      )}
      {result.data && (
        <>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Full response
          </button>
          {expanded && (
            <pre className="max-h-56 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

function Counts({ title, counts }: { title: string; counts: Record<string, unknown> }) {
  const keys = ["received", "added", "updated", "removed", "unchanged"].filter(
    (k) => typeof counts[k] === "number"
  );
  const skipped = Array.isArray(counts.skipped) ? counts.skipped : [];
  return (
    <div className="rounded border px-2 py-1">
      <div className="font-medium">{title}</div>
      <div className="text-muted-foreground">
        {keys.map((k) => `${k} ${counts[k]}`).join(" · ") || "—"}
        {skipped.length > 0 && (
          <span className="text-amber-600"> · skipped {skipped.length}</span>
        )}
      </div>
    </div>
  );
}
