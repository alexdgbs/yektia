export function doctorInitials(name) {
  return name
    .replace(/^(Dra?\.)\s/, "")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
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
