import { format } from "date-fns";

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
  timezone?: string
): string {
  const targetTimezone = timezone || getCurrentTimezone();

  let date: Date;

  if (typeof dateInput === "string") {
    // If it's a date string (YYYY-MM-DD), treat it as local date at start of day
    if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = new Date(`${dateInput}`);
    } else {
      date = new Date(dateInput);
    }
  } else if (typeof dateInput === "number") {
    date = new Date(dateInput);
  } else {
    date = new Date(dateInput);
  }

  // Create a date in the target timezone
  const localDateString = date.toLocaleString("sv-SE", {
    timeZone: targetTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Convert to UTC
  const utcDate = new Date(localDateString + "Z");
  return utcDate.toISOString();
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

  let utcDate: Date;

  if (typeof utcDateInput === "string") {
    utcDate = new Date(utcDateInput);
  } else if (typeof utcDateInput === "number") {
    utcDate = new Date(utcDateInput);
  } else {
    utcDate = new Date(utcDateInput);
  }

  // Convert UTC to target timezone
  const localDateString = utcDate.toLocaleString("en-US", {
    timeZone: targetTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return new Date(localDateString);
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

  const from = isDateOnly(fromDate) ? `${fromDate}T00:00:00` : fromDate;

  const to = isDateOnly(toDate)
    ? `${toDate}T${format(new Date(), "HH:mm")}`
    : toDate;

  return {
    from: currentTimezoneToUTC(from, targetTimezone),
    to: currentTimezoneToUTC(to, targetTimezone),
  };
}
