import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck, ChevronDown, Download, Filter as FilterIcon, X } from "lucide-react";
import { format, formatDistanceToNow, subDays, startOfDay } from "date-fns";
import { fetcher } from "@/utils/fetcher";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scrollArea";
import { toast } from "@/hooks/use-toast";
import { useTimezone } from "@/context/TimezoneContext";
import type { AppNotification, NotificationsResponse } from "@/types/notifications";

// Bell polls every 45s — near-real-time without any persistent connection
// (works on Vercel's serverless runtime).
const POLL_MS = 45000;

// Persistent filter — survives SWR polls, popover close/open, and page reload.
// Bumped the version suffix if the shape ever changes to invalidate old blobs.
const FILTER_STORAGE_KEY = "tob-notif-filter-v1";

type NotificationFilter = {
  severity: string; // "all" | "error" | "warning" | "info" | <any custom>
  type: string; // "all" | <concrete type>
  unreadOnly: boolean;
  text: string;
};

const DEFAULT_FILTER: NotificationFilter = {
  severity: "all",
  type: "all",
  unreadOnly: false,
  text: "",
};

function useNotificationFilter(): [
  NotificationFilter,
  (patch: Partial<NotificationFilter>) => void,
  () => void
] {
  const [filter, setFilter] = useState<NotificationFilter>(DEFAULT_FILTER);

  // Lazy init from localStorage once we're on the client. Done in an effect
  // (not useState initializer) because SSR runs this component too and
  // `localStorage` isn't available there — doing it here keeps the server
  // and first client render consistent, no hydration mismatch.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NotificationFilter>;
        setFilter({ ...DEFAULT_FILTER, ...parsed });
      }
    } catch {
      /* corrupt JSON, blocked storage — just stay on defaults */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filter));
    } catch {
      /* storage quota / disabled — the in-memory state still works */
    }
  }, [filter]);

  const patch = (p: Partial<NotificationFilter>) =>
    setFilter((prev) => ({ ...prev, ...p }));
  const clear = () => setFilter(DEFAULT_FILTER);

  return [filter, patch, clear];
}

function isFilterActive(f: NotificationFilter): boolean {
  return (
    f.severity !== "all" ||
    f.type !== "all" ||
    f.unreadOnly ||
    f.text.trim() !== ""
  );
}

// Count how many fields are set — used for the badge next to the filter icon.
function activeFilterCount(f: NotificationFilter): number {
  let n = 0;
  if (f.severity !== "all") n++;
  if (f.type !== "all") n++;
  if (f.unreadOnly) n++;
  if (f.text.trim() !== "") n++;
  return n;
}

function normalizeSeverity(raw: string | undefined): string {
  const s = (raw ?? "").toLowerCase().trim();
  if (s.startsWith("err")) return "error";
  if (s.startsWith("warn")) return "warning";
  if (s.startsWith("info")) return "info";
  return s;
}

function matchesFilter(n: AppNotification, f: NotificationFilter): boolean {
  if (f.severity !== "all" && normalizeSeverity(n.severity) !== f.severity) {
    return false;
  }
  if (f.type !== "all" && n.type !== f.type) {
    return false;
  }
  if (f.unreadOnly && n.is_read) {
    return false;
  }
  const q = f.text.trim().toLowerCase();
  if (q) {
    const hay = [
      n.title,
      n.body ?? "",
      n.type,
      n.call_id ?? "",
      n.client_id ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export default function NotificationBell() {
  const router = useRouter();
  const { data: session } = useSession();
  // Error notifications are an admin-only feature. Non-admins never fetch and
  // the bell is not rendered at all (see the early return below).
  const isAdmin = session?.user?.role === "admin";

  const { data, mutate } = useSWR<NotificationsResponse>(
    isAdmin ? "/api/notifications?limit=50" : null,
    fetcher,
    { refreshInterval: POLL_MS, revalidateOnFocus: true }
  );

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  const [filter, patchFilter, clearFilter] = useNotificationFilter();
  const [filterOpen, setFilterOpen] = useState(false);

  // Distinct types in the current fetched set — populates the type dropdown.
  const availableTypes = useMemo(
    () =>
      Array.from(new Set(notifications.map((n) => n.type).filter(Boolean))).sort(),
    [notifications]
  );

  const filterActive = isFilterActive(filter);
  const activeCount = activeFilterCount(filter);

  const visibleNotifications = useMemo(
    () => (filterActive ? notifications.filter((n) => matchesFilter(n, filter)) : notifications),
    [notifications, filter, filterActive]
  );

  async function markRead(payload: { id?: number; all?: boolean }) {
    // Optimistic update so the badge/dot react immediately.
    mutate(
      (prev) =>
        prev
          ? {
              notifications: prev.notifications.map((n) =>
                payload.all || n.id === payload.id
                  ? { ...n, is_read: true }
                  : n
              ),
              unread: payload.all
                ? 0
                : prev.notifications.some(
                    (n) => n.id === payload.id && !n.is_read
                  )
                ? Math.max(0, prev.unread - 1)
                : prev.unread,
            }
          : prev,
      { revalidate: false }
    );
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } finally {
      mutate();
    }
  }

  function openNotification(n: AppNotification) {
    if (!n.is_read) markRead({ id: n.id });
    if (n.call_id != null) router.push(`/?call_id=${n.call_id}`);
  }

  // Hide the bell entirely for non-admins.
  if (!isAdmin) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between px-4 py-2 border-b gap-2">
          <span className="font-semibold text-sm">Notifications</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={`text-xs inline-flex items-center gap-1 transition-colors ${
                filterActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Filter notifications"
              aria-expanded={filterOpen}
            >
              <FilterIcon className="h-3.5 w-3.5" />
              Filter
              {activeCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                  {activeCount}
                </span>
              )}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${filterOpen ? "rotate-180" : ""}`}
              />
            </button>
            <ExportNotificationsButton />
            {unread > 0 && (
              <button
                onClick={() => markRead({ all: true })}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
        </div>

        {filterOpen && (
          <NotificationFilterPanel
            filter={filter}
            onChange={patchFilter}
            onClear={clearFilter}
            availableTypes={availableTypes}
          />
        )}

        {filterActive && (
          <FilterChipBar
            filter={filter}
            onPatch={patchFilter}
            onClear={clearFilter}
            visibleCount={visibleNotifications.length}
            totalCount={notifications.length}
          />
        )}

        <ScrollArea className="max-h-[360px]">
          {visibleNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {notifications.length === 0 ? (
                "No notifications"
              ) : (
                <div className="space-y-2">
                  <div>No notifications match this filter.</div>
                  <button
                    onClick={clearFilter}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear filter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {visibleNotifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openNotification(n)}
                    className={`w-full text-left pl-4 pr-5 py-3 hover:bg-muted/50 transition-colors ${
                      n.is_read ? "" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-red-600 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1 pr-1">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        {n.body && (
                          <p
                            className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3"
                            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                          >
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Inline filter panel that slides in between the header and the list. Uses
// native controls so it never has to deal with popover-in-popover layering.
function NotificationFilterPanel({
  filter,
  onChange,
  onClear,
  availableTypes,
}: {
  filter: NotificationFilter;
  onChange: (patch: Partial<NotificationFilter>) => void;
  onClear: () => void;
  availableTypes: string[];
}) {
  return (
    <div className="border-b bg-muted/30 px-4 py-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Severity
          </label>
          <Select
            value={filter.severity}
            onValueChange={(v) => onChange({ severity: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Type
          </label>
          <Select
            value={filter.type}
            onValueChange={(v) => onChange({ type: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {availableTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
          Search
        </label>
        <Input
          value={filter.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Search title, body, call id…"
          className="h-8 text-xs"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filter.unreadOnly}
            onChange={(e) => onChange({ unreadOnly: e.target.checked })}
            className="rounded border-muted-foreground/40 accent-primary"
          />
          Unread only
        </label>
        <button
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground"
          disabled={!isFilterActive(filter)}
        >
          Reset
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground leading-snug">
        Filter is saved locally — it stays applied until you clear it, even after
        refresh.
      </p>
    </div>
  );
}

// Compact chip row that stays visible while a filter is applied, so operators
// never forget they're looking at a subset.
function FilterChipBar({
  filter,
  onPatch,
  onClear,
  visibleCount,
  totalCount,
}: {
  filter: NotificationFilter;
  onPatch: (patch: Partial<NotificationFilter>) => void;
  onClear: () => void;
  visibleCount: number;
  totalCount: number;
}) {
  const chips: { key: keyof NotificationFilter; label: string; clear: Partial<NotificationFilter> }[] =
    [];
  if (filter.severity !== "all") {
    chips.push({
      key: "severity",
      label: `severity: ${filter.severity}`,
      clear: { severity: "all" },
    });
  }
  if (filter.type !== "all") {
    chips.push({
      key: "type",
      label: `type: ${filter.type}`,
      clear: { type: "all" },
    });
  }
  if (filter.unreadOnly) {
    chips.push({
      key: "unreadOnly",
      label: "unread only",
      clear: { unreadOnly: false },
    });
  }
  if (filter.text.trim() !== "") {
    chips.push({
      key: "text",
      label: `“${filter.text.trim()}”`,
      clear: { text: "" },
    });
  }

  return (
    <div className="px-4 py-2 border-b bg-background flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
        Showing {visibleCount}/{totalCount}
      </span>
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={() => onPatch(c.clear)}
          className="group inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 pl-2 pr-1 py-0.5 text-[11px] text-foreground hover:bg-primary/20 transition-colors"
          title={`Clear ${String(c.key)} filter`}
        >
          <span className="truncate max-w-[140px]">{c.label}</span>
          <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
        </button>
      ))}
      <button
        onClick={onClear}
        className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}

// Small "Export CSV" trigger that lives inside the bell popover. Clicking it
// opens a dialog with two `datetime-local` inputs + severity + quick presets;
// on Download it hits /api/notifications/export with the chosen range and
// streams the CSV back as a browser download.
//
// We use native inputs here (not the site's popup DateTimeRangePicker) on
// purpose: the picker's dropdown is `position: absolute` and gets clipped
// when it opens inside a modal, so time inputs / Apply become unreachable.
// Native inputs sidestep the modal-inside-modal layout entirely.

// datetime-local requires "YYYY-MM-DDTHH:mm" — no seconds, no timezone.
const DT_INPUT_FMT = "yyyy-MM-dd'T'HH:mm";

const QUICK_PRESETS: { label: string; days: number }[] = [
  { label: "Last 24h", days: 1 },
  { label: "Last 7d", days: 7 },
  { label: "Last 30d", days: 30 },
  { label: "Last 90d", days: 90 },
];

function ExportNotificationsButton() {
  const { timezone, localInputToUtcIso, now } = useTimezone();
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  // Build defaults in the SELECTED timezone, not the browser's — so a
  // user viewing US Eastern sees "last 7 days" relative to NY time.
  const defaults = useMemo(() => {
    const n = now();
    return {
      from: format(startOfDay(subDays(n, 7)), DT_INPUT_FMT),
      to: format(n, DT_INPUT_FMT),
    };
    // `now` is stable per-timezone from the ctx; recompute when zone changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone]);

  const [fromStr, setFromStr] = useState<string>(defaults.from);
  const [toStr, setToStr] = useState<string>(defaults.to);

  // When the user flips timezones mid-session, reset the inputs to the new
  // zone's "last 7 days" so they don't accidentally request a shifted range.
  useEffect(() => {
    setFromStr(defaults.from);
    setToStr(defaults.to);
  }, [defaults.from, defaults.to]);

  // Interpret the naive datetime-local strings as the SELECTED tz, then
  // convert to UTC ISO for the request. Preview text uses the same path so
  // "from → to" matches what the server will see.
  const fromIso = useMemo(
    () => (fromStr ? localInputToUtcIso(fromStr) : ""),
    [fromStr, localInputToUtcIso]
  );
  const toIso = useMemo(
    () => (toStr ? localInputToUtcIso(toStr) : ""),
    [toStr, localInputToUtcIso]
  );
  const fromDate = fromIso ? new Date(fromIso) : null;
  const toDate = toIso ? new Date(toIso) : null;

  const rangeInvalid =
    !fromDate ||
    !toDate ||
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime()) ||
    fromDate > toDate;

  const applyPreset = (days: number) => {
    const n = now();
    setFromStr(format(subDays(n, days), DT_INPUT_FMT));
    setToStr(format(n, DT_INPUT_FMT));
  };

  const handleDownload = async () => {
    if (rangeInvalid || !fromIso || !toIso) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({
        from: fromIso,
        to: toIso,
        tz: timezone,
      });
      if (severity !== "all") params.set("severity", severity);
      const res = await fetch(`/api/notifications/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Export failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="?([^"]+)"?/i);
      const filename =
        match?.[1] ??
        `notifications_${fromIso.slice(0, 10)}_to_${toIso.slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ variant: "success", description: "Notifications exported" });
      setOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        description: err instanceof Error ? err.message : "Export failed",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          title="Export notifications by date range"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export notifications</DialogTitle>
          <DialogDescription>
            Choose a date range and severity — the matching rows will download
            as CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((p) => (
              <Button
                key={p.days}
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => applyPreset(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                From
              </label>
              <Input
                type="datetime-local"
                value={fromStr}
                onChange={(e) => setFromStr(e.target.value)}
                max={toStr || undefined}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                To
              </label>
              <Input
                type="datetime-local"
                value={toStr}
                onChange={(e) => setToStr(e.target.value)}
                min={fromStr || undefined}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Severity
            </label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rangeInvalid ? (
            <p className="text-xs text-destructive">
              End date/time must be on or after the start.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {fromStr.replace("T", " ")} → {toStr.replace("T", " ")} ({timezone})
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={busy || rangeInvalid}>
            <Download className="mr-2 h-4 w-4" />
            {busy ? "Downloading…" : "Download CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
