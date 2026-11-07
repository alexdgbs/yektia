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
