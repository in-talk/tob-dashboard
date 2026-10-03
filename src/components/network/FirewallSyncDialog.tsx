"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
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
import { FirewallSyncPlan } from "@/lib/network/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSynced?: () => void;
};

const hasChanges = (p: FirewallSyncPlan) => p.to_add.length > 0 || p.to_remove.length > 0;
const syncable = (p: FirewallSyncPlan) => !p.error && !p.blocked && hasChanges(p);

/**
 * Two-step sync: opening the dialog fetches a read-only diff from GCP; the
 * Apply button pushes it (the server re-reads GCP before writing).
 */
export function FirewallSyncDialog({ open, onOpenChange, onSynced }: Props) {
  const [plans, setPlans] = useState<FirewallSyncPlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setApplied(false);
    try {
      const res = await fetch("/api/network/firewall-sync");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setPlans(data.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load preview");
      setPlans(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadPreview();
  }, [open, loadPreview]);

  const pending = (plans ?? []).filter(syncable);
  const addCount = pending.reduce((n, p) => n + p.to_add.length, 0);
  const removeCount = pending.reduce((n, p) => n + p.to_remove.length, 0);

  const apply = async () => {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/network/firewall-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setPlans(data.rules);
      setApplied(true);
      const failed = (data.rules as FirewallSyncPlan[]).some((r) => r.error);
      toast({ variant: failed ? "destructive" : "success", description: data.message });
      onSynced?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sync GCP firewall</DialogTitle>
          <DialogDescription>
            {applied
              ? "Result of the sync."
              : "Every configured firewall rule is set to exactly the IPs in Client IPs (source IPs for ingress rules, destination IPs for egress). Nothing changes until you apply."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading firewall rules from GCP…
          </div>
        ) : plans && plans.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No firewall rules configured. Set{" "}
            <code className="rounded bg-muted px-1">GCP_FIREWALL_RULES</code> (and{" "}
            <code className="rounded bg-muted px-1">GCP_FIREWALL_PROJECT</code>) in the server&apos;s
            .env and restart the dashboard.
          </div>
        ) : (
          <div className="space-y-3">
            {plans?.map((p) => (
              <RulePlanCard key={p.key} plan={p} applied={applied} />
            ))}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {applied
              ? ""
              : pending.length
                ? `${pending.length} rule(s): +${addCount} / −${removeCount} ranges`
                : plans?.length
                  ? "Nothing to apply"
                  : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadPreview} disabled={loading || applying}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
            </Button>
            {applied ? (
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            ) : (
              <Button onClick={apply} disabled={!pending.length || applying || loading}>
                {applying && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Apply to GCP
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RulePlanCard({ plan, applied }: { plan: FirewallSyncPlan; applied: boolean }) {
  const status = plan.error
    ? { icon: XCircle, text: plan.error, className: "text-red-600" }
    : plan.blocked
      ? { icon: ShieldAlert, text: plan.blocked, className: "text-amber-600" }
      : applied && plan.applied
        ? { icon: CheckCircle2, text: plan.result ?? "Synced", className: "text-green-600" }
        : hasChanges(plan)
          ? {
              icon: AlertTriangle,
              text: `${plan.to_add.length + plan.to_remove.length} change(s)`,
              className: "text-amber-600",
            }
          : { icon: CheckCircle2, text: "In sync", className: "text-green-600" };
  const Icon = status.icon;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono text-sm font-medium">{plan.rule_name}</div>
          <div className="text-xs text-muted-foreground">
            {plan.project_id}
            {plan.network && ` · ${plan.network}`}
            {plan.direction &&
              ` · ${plan.direction === "EGRESS" ? "egress (destination IPs)" : "ingress (source IPs)"}`}
            {plan.disabled && " · rule is disabled in GCP"}
          </div>
        </div>
        <span className={cn("flex items-center gap-1 text-xs font-medium", status.className)}>
          <Icon className="h-4 w-4 shrink-0" />
          {status.text}
        </span>
      </div>

      {!plan.error && (plan.to_add.length > 0 || plan.to_remove.length > 0) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <RangeList title="Will be allowed" ranges={plan.to_add} sign="+" tone="add" />
          <RangeList title="Will lose access" ranges={plan.to_remove} sign="−" tone="remove" />
        </div>
      )}
      {!plan.error && (
        <div className="mt-2 text-xs text-muted-foreground">
          {plan.unchanged} range(s) unchanged · {plan.desired.length} total after sync
        </div>
      )}
    </div>
  );
}

function RangeList({
  title,
  ranges,
  sign,
  tone,
}: {
  title: string;
  ranges: string[];
  sign: string;
  tone: "add" | "remove";
}) {
  if (!ranges.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        {title} ({ranges.length})
      </div>
      <ul className="max-h-40 space-y-0.5 overflow-y-auto font-mono text-xs">
        {ranges.map((r) => (
          <li
            key={r}
            className={cn(
              "rounded px-1.5 py-0.5",
              tone === "add"
                ? "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
            )}
          >
            {sign} {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
