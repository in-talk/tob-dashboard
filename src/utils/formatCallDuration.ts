// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const formatCallDuration = (interval: any) => {
  if (!interval) return "00:00";

  // If it's already a string like "00:05:30", return it
  if (typeof interval === "string") {
    // If it's a full ISO date string, this is likely the "wrong date" issue
    if (interval.includes("-") && interval.includes("T")) {
      return "Invalid Duration";
    }
    return interval.split(".")[0]; // Remove milliseconds if present
  }

  // If it's an object { minutes, seconds, milliseconds }
  let mins = interval.minutes || 0;
  let secs = interval.seconds || 0;

  // If minutes is 0 but seconds is large, calculate minutes
  if (mins === 0 && secs >= 60) {
    mins = Math.floor(secs / 60);
    secs = secs % 60;
  }

  const paddedMinutes = String(mins).padStart(2, '0');
  const paddedSeconds = String(secs).padStart(2, '0');

  return `${paddedMinutes}:${paddedSeconds}`;
};