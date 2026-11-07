const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export { WEEKDAYS };

// Fecha "YYYY-MM-DD" en la zona del offset dado (minutos respecto a UTC).
export const dateKeyAtOffset = (value, offsetMinutes) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + offsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);
};

export const formatDate = (value, fallback = "") => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(date);
};

export const formatDateTime = (value, fallback = "") => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

// Las fechas del calendario se formatean en UTC para que la zona horaria
// del navegador no mueva el día mostrado.
const utcFormatter = (options) =>
  new Intl.DateTimeFormat("es-MX", { ...options, timeZone: "UTC" });
const dateFromKey = (key) => new Date(`${key}T00:00:00.000Z`);
export { dateFromKey };
export const formatDateKey = (key, options) =>
  utcFormatter(options).format(dateFromKey(key));
const capitalizeFirst = (value) =>
  value.charAt(0).toLocaleUpperCase("es-MX") + value.slice(1);

export const formatMonthTitle = (month) =>
  capitalizeFirst(
    formatDateKey(`${month}-01`, { month: "long", year: "numeric" }),
  );
export const formatDayTitle = (day) =>
  capitalizeFirst(
    formatDateKey(day, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );
export const formatTimeAtOffset = (value, offset) => {
  const shifted = new Date(new Date(value).getTime() + offset * 60_000);
  return utcFormatter({ hour: "2-digit", minute: "2-digit" }).format(shifted);
};
export const formatSlotAtOffset = (value, offset) => {
  const shifted = new Date(new Date(value).getTime() + offset * 60_000);
  return utcFormatter({
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(shifted);
};

export const monthForDay = (key) => key.slice(0, 7);
export const monthIndex = (key) => {
  const [year, month] = key.split("-").map(Number);
  return year * 12 + month - 1;
};
export const shiftMonth = (key, amount) => {
  const date = new Date(`${key}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
};
export const getMonthCells = (month) => {
  const firstDay = dateFromKey(`${month}-01`);
  const year = firstDay.getUTCFullYear();
  const monthNumber = firstDay.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthNumber + 1, 0)).getUTCDate();
  const leadingDays = (firstDay.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: leadingDays }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  return cells;
};
