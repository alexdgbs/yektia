const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export { WEEKDAYS };

// La fecha con offset vive en shared/ para que el backend use la misma.
export { dateKeyAtOffset } from "../../shared/index.js";

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
// Misma base para hora y fecha con zona horaria.
const shiftedDate = (value, offset) =>
  new Date(new Date(value).getTime() + offset * 60_000);
export const formatTimeAtOffset = (value, offset) =>
  utcFormatter({ hour: "2-digit", minute: "2-digit" }).format(
    shiftedDate(value, offset),
  );
export const formatSlotAtOffset = (value, offset) =>
  utcFormatter({
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(shiftedDate(value, offset));

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
