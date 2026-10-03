"use client";

import React, { ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { Audit, PROVIDERS, PROVIDER_LABELS, Provider } from "@/lib/network/types";
import { DataGridColumn } from "./DataGrid";

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : format(d, "yyyy-MM-dd HH:mm");
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const PROVIDER_STYLES: Record<Provider, string> = {
  gcp: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300",
  aws: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300",
};

export function ProviderBadge({ provider }: { provider: Provider | null }) {
  if (!provider) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        PROVIDER_STYLES[provider]
      )}
    >
      {PROVIDER_LABELS[provider]}
    </span>
  );
}

const ANY = "__any__";

/**
 * Provider dropdown. `emptyLabel` adds a "no value" choice — used for optional
 * form fields ("Not set") and for table filters ("All providers").
 */
export function ProviderSelect({
  value,
  onChange,
  emptyLabel,
  invalid,
  id,
  className,
}: {
  value: Provider | null;
  onChange: (value: Provider | null) => void;
  emptyLabel?: string;
  invalid?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <Select
      value={value ?? (emptyLabel ? ANY : "")}
      onValueChange={(v) => onChange(v === ANY ? null : (v as Provider))}
    >
      <SelectTrigger id={id} className={cn("w-full", invalid && "border-red-500", className)}>
        <SelectValue placeholder="Select provider" />
      </SelectTrigger>
      <SelectContent>
        {emptyLabel && <SelectItem value={ANY}>{emptyLabel}</SelectItem>}
        {PROVIDERS.map((p) => (
          <SelectItem key={p} value={p}>
            {PROVIDER_LABELS[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Row actions
// ---------------------------------------------------------------------------

export function RowActions({
  onEdit,
  onDelete,
  deleteTitle,
  deleteDescription,
}: {
  onEdit?: () => void;
  onDelete: () => Promise<unknown>;
  deleteTitle: string;
  deleteDescription: ReactNode;
}) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="flex justify-end gap-1">
      {onEdit && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
            disabled={deleting}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>{deleteDescription}</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={async () => {
                setDeleting(true);
                try {
                  await onDelete();
                } finally {
                  setDeleting(false);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Standard updated/created/by columns appended to every table. */
export function auditColumns<T extends Audit>(): DataGridColumn<T>[] {
  return [
    {
      key: "updated_at",
      header: "Updated",
      sortValue: (r) => r.updated_at,
      render: (r) => (
        <div className="whitespace-nowrap text-xs">
          <div>{formatTimestamp(r.updated_at)}</div>
          <div className="text-muted-foreground">{r.updated_by || "—"}</div>
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      sortValue: (r) => r.created_at,
      render: (r) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatTimestamp(r.created_at)}
        </span>
      ),
    },
  ];
}

/** Numeric sort for IPv4 (e.g. 10.0.0.9 before 10.0.0.10); IPv6 sorts lexically after. */
export function ipSortValue(ip: string): string {
  const parts = ip.split(".");
  if (parts.length !== 4) return `~${ip}`;
  return parts.map((p) => p.padStart(3, "0")).join(".");
}

// ---------------------------------------------------------------------------
// Page chrome
// ---------------------------------------------------------------------------

export const NETWORK_PAGES = [
  { title: "Kamailio", url: "/network/kamailio" },
  { title: "Client IPs", url: "/network/client-ips" },
  { title: "Kamailio ↔ Client IPs", url: "/network/kamailio-client-ips" },
  { title: "Asterisk", url: "/network/asterisk" },
  { title: "Kamailio ↔ Asterisk", url: "/network/kamailio-asterisk" },
];

export function NetworkPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { pathname } = useRouter();
  return (
    <div className="px-3 sm:px-6 pb-8 space-y-4">
      <nav className="flex gap-1 overflow-x-auto border-b">
        {NETWORK_PAGES.map((p) => (
          <Link
            key={p.url}
            href={p.url}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              pathname === p.url
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {p.title}
          </Link>
        ))}
      </nav>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
