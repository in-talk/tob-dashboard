export const formatDateTime = (date: Date) => {
  if (!date) return "N/A";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

/**
 * Format date for database queries (PostgreSQL compatible)
 * Handles UTC dates coming from frontend
 * @param dateInput - UTC date string, Date object, or timestamp
 * @returns Formatted date string for database
 */
export function formatDateForDB(dateInput: string | Date | number): string {
  let date: Date;

  if (typeof dateInput === "string") {
    date = new Date(dateInput);
  } else if (typeof dateInput === "number") {
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${dateInput}`);
  }

  // Return ISO string which PostgreSQL can handle directly
  // This maintains UTC timezone information
  return date.toISOString().replace("T", " ");
}
