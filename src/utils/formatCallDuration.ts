export const formatCallDuration = (interval: {
  minutes?: number;
  seconds?: number;
}) => {
  const {  minutes = 0, seconds = 0 } = interval;
  const parts = [];

  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} sec`);

  return parts.join(' ');
};