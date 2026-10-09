import { DateTime } from "luxon";

/**
 * Default timezone when nothing else is set. Per product requirement all
 * timestamps default to US Eastern — do NOT fall back to the browser's
 * system zone, because a non-US viewer should still see US time by default.
 */
export const DEFAULT_TIMEZONE = "America/New_York";

/**
 * Get the current timezone. Priority: localStorage ('tob-timezone-v1') →
 * cookie ('timezone') → DEFAULT_TIMEZONE.
 *
 * `TimezoneContext` keeps the two client-side stores in sync whenever the
 * user picks a new zone, so every reader (this helper, SSR, legacy callers)
 * sees the same value within one tick.
 */
export function getCurrentTimezone(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("tob-timezone-v1");
      if (stored) return stored;
    } catch {
      /* storage blocked — fall through */
    }

    const cookieTimezone = document.cookie
      .split("; ")
      .find((row) => row.startsWith("timezone="))
      ?.split("=")[1];
    if (cookieTimezone) return decodeURIComponent(cookieTimezone);
  }

  return DEFAULT_TIMEZONE;
}

/**
 * Convert local timezone date to UTC
 * @param dateInput - Date string, Date object, or timestamp
 * @param timezone - Target timezone (defaults to current timezone from cookie)
 * @returns UTC date string in ISO format
 */

export function currentTimezoneToUTC(
  dateInput: string | Date | number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  let dt: DateTime;

  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    dt = DateTime.fromISO(`${dateInput}T00:00:00`, { zone: timezone });
  } else if (
    typeof dateInput === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(dateInput)
  ) {
    // Naive datetime-local string ("YYYY-MM-DDTHH:mm[:ss]") — interpret in the
    // caller's zone, not UTC. Without this it was being parsed as UTC and
    // "today 00:00" would silently shift by the UTC offset.
    dt = DateTime.fromISO(dateInput, { zone: timezone });
  } else {
    dt = DateTime.fromJSDate(new Date(dateInput), { zone: timezone });
  }

  const utc = dt.toUTC();
  return utc.toISO() ?? "";
}

/**
 * Format a UTC/ISO date in the given zone using a Luxon format token string
 * (e.g. "yyyy-LL-dd HH:mm:ss"). Preferred for CSV/Excel exports because the
 * output is unambiguous and locale-stable.
 */
export function formatInTimezone(
  input: string | Date | number,
  tokenFormat: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const dt =
    typeof input === "string"
      ? DateTime.fromISO(input, { zone: "utc" })
      : DateTime.fromJSDate(new Date(input), { zone: "utc" });
  return dt.setZone(timezone).toFormat(tokenFormat);
}

/**
 * Convert UTC date to local timezone
 * @param utcDateInput - UTC date string, Date object, or timestamp
 * @param timezone - Target timezone (defaults to current timezone from cookie)
 * @returns Date object in local timezone
 */
export function utcToCurrentTimezone(
  utcDateInput: string | Date | number,
  timezone?: string
): Date {
  const targetTimezone = timezone || getCurrentTimezone();

  let utcDate: DateTime;

  if (typeof utcDateInput === "string") {
    utcDate = DateTime.fromISO(utcDateInput, { zone: "utc" });
  } else {
    utcDate = DateTime.fromJSDate(new Date(utcDateInput), { zone: "utc" });
  }

  const converted = utcDate.setZone(targetTimezone);

  return converted.toJSDate();
}

/**
 * Format date for display in local timezone
 * @param utcDateInput - UTC date string, Date object, or timestamp
 * @param timezone - Target timezone (defaults to current timezone from cookie)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  utcDateInput: string | Date | number,
  timezone?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const targetTimezone = timezone || getCurrentTimezone();

  let utcDate: Date;

  if (typeof utcDateInput === "string") {
    utcDate = new Date(utcDateInput);
  } else if (typeof utcDateInput === "number") {
    utcDate = new Date(utcDateInput);
  } else {
    utcDate = new Date(utcDateInput);
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: targetTimezone,
  };

  return utcDate.toLocaleString("en-US", { ...defaultOptions, ...options });
}

/**
 * Get date range in UTC for API calls
 * @param fromDate - Start date (local)
 * @param toDate - End date (local)
 * @param timezone - Source timezone (defaults to current timezone from cookie)
 * @returns Object with UTC date strings
 */
export function getUTCDateRange(
  fromDate: string | Date,
  toDate: string | Date,
  timezone?: string
): { from: string; to: string } {
  const targetTimezone = timezone || getCurrentTimezone();

  const toDateVal = typeof toDate === "string" ? new Date(toDate) : toDate;
  const fromDateVal = typeof fromDate === "string" ? new Date(fromDate) : fromDate;

  return {
    from: currentTimezoneToUTC(fromDateVal, targetTimezone),
    to: currentTimezoneToUTC(toDateVal, targetTimezone),
  };
}
