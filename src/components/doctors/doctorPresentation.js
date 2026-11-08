import { formatDate } from "../../utils/dates";

export { formatDate };

// El título ("Dra.", "Dr.") no forma parte del nombre para mostrar.
const TITLE_PREFIX = /^(Dra?\.)\s/;
const stripDoctorTitle = (name = "") => String(name).replace(TITLE_PREFIX, "");

// Primer nombre sin el título: "Dra. Ana Sofía" -> "Ana".
export function doctorFirstName(name = "") {
  return stripDoctorTitle(name).split(" ").filter(Boolean)[0];
}

export function doctorInitials(name = "") {
  return stripDoctorTitle(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

// El usuario es el dueño del perfil cuando su cuenta apunta a ese doctor.
export function isOwnDoctorProfile(user, doctor) {
  if (!user?.doctorId || !doctor?._id) return false;
  return String(user.doctorId) === String(doctor._id);
}

// Precio sin capturar: cadena vacía, nulo o indefinido.
export function isPriceMissing(price) {
  return price === "" || price == null;
}

export function formatDuration(minutes) {
  const value = Number(minutes) || 0;
  return `${value} ${value === 1 ? "minuto" : "minutos"}`;
}

export function formatCount(count, singular, plural) {
  const value = Math.max(0, Number(count) || 0);
  return `${value} ${value === 1 ? singular : plural}`;
}

export function doctorRating(doctor) {
  const count = Math.max(0, Number(doctor.ratingCount) || 0);
  return { count, average: count ? Number(doctor.promedio) || 0 : 0 };
}

export function doctorPrice(doctor, fallback = "Por confirmar") {
  if (isPriceMissing(doctor.precio)) return fallback;
  const price = Number(doctor.precio);
  if (price === 0) return "Sin costo";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(price);
}

// La búsqueda vive en shared/ para que el backend use la misma.
export { matchesDoctorQuery } from "../../../shared/index.js";
