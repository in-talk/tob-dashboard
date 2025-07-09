export const formatCallDuration = (interval: {
  minutes?: number;
  seconds?: number;
}) => {
  if (!interval) return "00:00";

  const { minutes = 0, seconds = 0 } = interval;

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return `${paddedMinutes}:${paddedSeconds}`;
};