import { useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck, Download } from "lucide-react";
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
import type { AppNotification, NotificationsResponse } from "@/types/notifications";

// Bell polls every 45s — near-real-time without any persistent connection
// (works on Vercel's serverless runtime).
const POLL_MS = 45000;

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
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
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
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  const defaults = useMemo(() => {
    const now = new Date();
    return {
      from: format(startOfDay(subDays(now, 7)), DT_INPUT_FMT),
      to: format(now, DT_INPUT_FMT),
    };
  }, []);
  const [fromStr, setFromStr] = useState<string>(defaults.from);
  const [toStr, setToStr] = useState<string>(defaults.to);

  // datetime-local values are naive local time — turn them into real Dates
  // for the API request. new Date("YYYY-MM-DDTHH:mm") is parsed as local.
  const from = useMemo(() => (fromStr ? new Date(fromStr) : null), [fromStr]);
  const to = useMemo(() => (toStr ? new Date(toStr) : null), [toStr]);

  const rangeInvalid =
    !from ||
    !to ||
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    from > to;

  const applyPreset = (days: number) => {
    const now = new Date();
    const start = subDays(now, days);
    setFromStr(format(start, DT_INPUT_FMT));
    setToStr(format(now, DT_INPUT_FMT));
  };

  const handleDownload = async () => {
    if (rangeInvalid || !from || !to) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
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
        `notifications_${from.toISOString().slice(0, 10)}_to_${to
          .toISOString()
          .slice(0, 10)}.csv`;
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
              {from!.toLocaleString()} → {to!.toLocaleString()}
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
