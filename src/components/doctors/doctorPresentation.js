export function doctorInitials(name) {
  return name
    .replace(/^(Dra?\.)\s/, "")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
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
  if (doctor.precio === "" || doctor.precio == null) return fallback;
  const price = Number(doctor.precio);
  if (price === 0) return "Sin costo";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(value, fallback = "") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(date);
}

// Sin tildes y en minúsculas, para comparar texto sin importar acentos.
const normalizeText = (value = "") =>
  value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Cada palabra buscada debe coincidir con el inicio de una palabra del
// perfil: "ana" encuentra a Ana, pero no a Mariana.
export function matchesDoctorQuery(doctor, query = "") {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = normalizeText(
    `${doctor.nombre || ""} ${doctor.especialidad || ""} ${doctor.ubicacion || ""}`,
  ).split(/\s+/);
  return words.every((word) => haystack.some((item) => item.startsWith(word)));
}
