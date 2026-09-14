import useSWR from "swr";
import { useRouter } from "next/router";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fetcher } from "@/utils/fetcher";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scrollArea";
import type { AppNotification, NotificationsResponse } from "@/types/notifications";

// Bell polls every 45s — near-real-time without any persistent connection
// (works on Vercel's serverless runtime).
const POLL_MS = 45000;

export default function NotificationBell() {
  const router = useRouter();
  const { data, mutate } = useSWR<NotificationsResponse>(
    "/api/notifications?limit=50",
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
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unread > 0 && (
            <button
              onClick={() => markRead({ all: true })}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
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
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                      n.is_read ? "" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-red-600 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3">
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
