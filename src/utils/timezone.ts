import { format } from "date-fns";
import { DateTime } from "luxon";

/**
 * Get the current timezone from cookies or default to system timezone
 */
export function getCurrentTimezone(): string {
  if (typeof window !== "undefined") {
    // Client-side: check cookies first, then system timezone
    const cookieTimezone = document.cookie
      .split("; ")
      .find((row) => row.startsWith("timezone="))
      ?.split("=")[1];

    return cookieTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  // Server-side: default to UTC if no timezone provided
  return "UTC";
}

/**
 * Convert local timezone date to UTC
 * @param dateInput - Date string, Date object, or timestamp
 * @param timezone - Target timezone (defaults to current timezone from cookie)
 * @returns UTC date string in ISO format
 */

export function currentTimezoneToUTC(
  dateInput: string | Date | number,
  timezone = "Asia/Karachi"
): string {
  let dt: DateTime;

  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    dt = DateTime.fromISO(`${dateInput}T00:00:00`, { zone: timezone });
  } else {
    dt = DateTime.fromJSDate(new Date(dateInput), { zone: timezone });
  }

  const utc = dt.toUTC();
  return utc.toISO() ?? ""; 
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDateOnly = (val: any) =>
    typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val);

  const from = isDateOnly(fromDate) ? `${fromDate}T05:00:00` : fromDate;

  const to = isDateOnly(toDate)
    ? `${toDate}T${format(new Date(), "HH:mm")}`
    : toDate;

  return {
    from: currentTimezoneToUTC(from, targetTimezone),
    to: currentTimezoneToUTC(to, targetTimezone),
  };
}
