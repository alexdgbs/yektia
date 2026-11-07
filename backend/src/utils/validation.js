export function parseDoctorQuery(input = {}) {
  const specialty =
    typeof input.especialidad === "string"
      ? input.especialidad.trim().slice(0, 60)
      : "";
  const search = typeof input.q === "string" ? input.q.trim().slice(0, 80) : "";
  const parsedLimit = Number.parseInt(input.limit, 10);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 100)
    : 50;
  return { specialty, search, limit };
}

export function validateRating(input = {}) {
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  return {
    valid:
      Boolean(userId) &&
      Number.isInteger(input.estrellas) &&
      input.estrellas >= 1 &&
      input.estrellas <= 5,
    userId,
    stars: input.estrellas,
  };
}

export const containsUnsafeControlCharacters = (value = "") =>
  [...value].some((character) => {
    const code = character.charCodeAt(0);
    return (
      (code >= 0 && code <= 8) ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127
    );
  });

export function validateComment(input = {}) {
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const name = typeof input.nombre === "string" ? input.nombre.trim() : "";
  const text = typeof input.texto === "string" ? input.texto.trim() : "";
  const hasControlCharacters = containsUnsafeControlCharacters(text);
  return {
    valid:
      Boolean(userId && name && text) &&
      name.length <= 80 &&
      text.length <= 800 &&
      !hasControlCharacters,
    userId,
    name,
    text,
  };
}
