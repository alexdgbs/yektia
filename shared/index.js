// Un solo origen para lo que usan el backend (Node) y el frontend (Vite).
// Sin dependencias: solo constantes y funciones puras, para que ambos lados
// puedan importar este archivo tal cual.

export const MEXICO_CITY_OFFSET_MINUTES = -360;

export const MAX_CONSULTATION_PRICE = 100000;

// Duraciones de cita permitidas, en minutos.
export const APPOINTMENT_DURATIONS = [15, 30, 45, 60, 90];
export const isValidAppointmentDuration = (value) =>
  APPOINTMENT_DURATIONS.includes(Number(value));

// Zona horaria permitida para la agenda, en minutos respecto a UTC.
export const TIMEZONE_OFFSET_MIN_MINUTES = -720;
export const TIMEZONE_OFFSET_MAX_MINUTES = 840;
export const isValidTimezoneOffset = (value) =>
  Number.isInteger(Number(value)) &&
  Number(value) >= TIMEZONE_OFFSET_MIN_MINUTES &&
  Number(value) <= TIMEZONE_OFFSET_MAX_MINUTES;

// Hora "HH:MM" de 24 horas, con grupo para los minutos.
export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const timeToMinutes = (value) => {
  const match = TIME_PATTERN.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : -1;
};

// Teléfono mexicano de 10 números, sin espacios ni guiones.
export const PHONE_PATTERN = /^\d{10}$/;
export const isValidPhone = (value) => PHONE_PATTERN.test(value);

// Nombre de persona: letras (con tildes), punto, apóstrofo, guion y espacios.
export const PERSON_NAME_PATTERN = /^[\p{L}\p{M}.' -]+$/u;
export const isValidPersonName = (value) => PERSON_NAME_PATTERN.test(value);

// Límite de favoritos por cuenta y de tamaño de documento médico.
export const MAX_FAVORITE_DOCTORS = 100;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

// Límite del cuerpo JSON que acepta la API.
export const JSON_BODY_LIMIT = "32kb";

// Fecha "YYYY-MM-DD" en la zona del offset dado (minutos respecto a UTC).
export const dateKeyAtOffset = (value, offsetMinutes) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + offsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);
};

// Sin tildes y en minúsculas, para comparar texto sin importar acentos.
export const normalizeText = (value = "") =>
  value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Cada palabra buscada debe coincidir con el inicio de una palabra del
// perfil: "ana" encuentra a Ana, pero no a Mariana.
export const matchesDoctorQuery = (doctor, search = "") => {
  const words = normalizeText(search).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = normalizeText(
    `${doctor.nombre || ""} ${doctor.especialidad || ""} ${doctor.ubicacion || ""}`,
  ).split(/\s+/);
  return words.every((word) => haystack.some((item) => item.startsWith(word)));
};
