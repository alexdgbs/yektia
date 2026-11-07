// Fecha "YYYY-MM-DD" en la zona del offset dado (minutos respecto a UTC).
export const dateKeyAtOffset = (value, offsetMinutes) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + offsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);
};
