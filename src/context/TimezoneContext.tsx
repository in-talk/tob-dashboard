"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DateTime } from "luxon";

import {
  DEFAULT_TIMEZONE,
  getCurrentTimezone,
  formatInTimezone,
} from "@/utils/timezone";

const STORAGE_KEY = "tob-timezone-v1";
const COOKIE_KEY = "timezone";

interface TimezoneCtxValue {
  timezone: string;
  setTimezone: (tz: string) => void;
  /** Format a UTC/ISO date for display in the selected zone. */
  format: (
    input: string | Date | number | null | undefined,
    tokenFormat?: string
  ) => string;
  /** Format a UTC/ISO date for use in CSV / Excel cells. */
  formatForExport: (input: string | Date | number | null | undefined) => string;
  /** Interpret a naive datetime-local string ("YYYY-MM-DDTHH:mm") as the
   *  selected zone and return a UTC ISO string suitable for an API query. */
  localInputToUtcIso: (datetimeLocal: string) => string;
  /** Convenience current-time in the selected zone. */
  now: () => Date;
}

const TimezoneCtx = createContext<TimezoneCtxValue | null>(null);

const COMMON_DISPLAY_FORMAT = "LLL d, yyyy HH:mm";
const CSV_FORMAT = "yyyy-LL-dd HH:mm:ss ZZZZ";

function writeCookie(tz: string) {
  // 1-year persistence, root path so SSR + api routes read the same thing.
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(tz)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function TimezoneProvider({ children }: { children: ReactNode }) {
  // Start on DEFAULT_TIMEZONE for SSR/first paint to avoid a hydration
  // mismatch, then upgrade to the stored value in a client-only effect.
  const [timezone, setTimezoneState] = useState<string>(DEFAULT_TIMEZONE);

  useEffect(() => {
    const resolved = getCurrentTimezone();
    if (resolved && resolved !== timezone) {
      setTimezoneState(resolved);
    }
    // On very first visit, write the default to both stores so legacy
    // callers of getCurrentTimezone() (which doesn't go through the ctx)
    // immediately agree with the ctx value.
    writeCookie(resolved);
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        window.localStorage.setItem(STORAGE_KEY, resolved);
      }
    } catch {
      /* storage blocked */
    }
    // intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz);
    try {
      window.localStorage.setItem(STORAGE_KEY, tz);
    } catch {
      /* storage blocked */
    }
    writeCookie(tz);
    // Notify any non-React listeners (e.g. plain fetch utilities) within the
    // same tab — storage events don't fire for the writing tab.
    window.dispatchEvent(new CustomEvent("tob-timezone-change", { detail: tz }));
  }, []);

  const value = useMemo<TimezoneCtxValue>(
    () => ({
      timezone,
      setTimezone,
      format: (input, tokenFormat = COMMON_DISPLAY_FORMAT) =>
        input == null ? "" : formatInTimezone(input, tokenFormat, timezone),
      formatForExport: (input) =>
        input == null ? "" : formatInTimezone(input, CSV_FORMAT, timezone),
      localInputToUtcIso: (datetimeLocal) =>
        DateTime.fromISO(datetimeLocal, { zone: timezone })
          .toUTC()
          .toISO() ?? "",
      now: () => DateTime.now().setZone(timezone).toJSDate(),
    }),
    [timezone, setTimezone]
  );

  return <TimezoneCtx.Provider value={value}>{children}</TimezoneCtx.Provider>;
}

export function useTimezone(): TimezoneCtxValue {
  const ctx = useContext(TimezoneCtx);
  if (!ctx) {
    // Fallback for components rendered outside the provider (shouldn't happen
    // in app pages, but keeps unit tests + Storybook rendering safe). Reads
    // directly from the utility and no-ops setters.
    const tz = getCurrentTimezone();
    return {
      timezone: tz,
      setTimezone: () => {},
      format: (input, tokenFormat = COMMON_DISPLAY_FORMAT) =>
        input == null ? "" : formatInTimezone(input, tokenFormat, tz),
      formatForExport: (input) =>
        input == null ? "" : formatInTimezone(input, CSV_FORMAT, tz),
      localInputToUtcIso: (datetimeLocal) =>
        DateTime.fromISO(datetimeLocal, { zone: tz }).toUTC().toISO() ?? "",
      now: () => DateTime.now().setZone(tz).toJSDate(),
    };
  }
  return ctx;
}

/**
 * Convenience display component. Pass a UTC/ISO string (or Date) and it
 * renders in the user's selected timezone, re-rendering whenever that
 * selection changes. Prefer this over new Date(x).toLocaleString() for any
 * user-facing timestamp.
 */
export function TimezoneTime({
  value,
  format: fmt,
  className,
  title,
}: {
  value: string | Date | number | null | undefined;
  format?: string;
  className?: string;
  title?: string;
}) {
  const { format, timezone } = useTimezone();
  if (value == null) return null;
  return (
    <time
      dateTime={typeof value === "string" ? value : new Date(value).toISOString()}
      className={className}
      title={title ?? `${format(value, "yyyy-LL-dd HH:mm:ss")} (${timezone})`}
    >
      {format(value, fmt)}
    </time>
  );
}
