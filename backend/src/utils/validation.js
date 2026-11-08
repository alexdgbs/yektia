import mongoose from "mongoose";

export const isValidId = (id) => mongoose.isValidObjectId(id);

// Un texto demasiado largo se rechaza, no se recorta en silencio.
export const cleanText = (value, max = 160) => {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (text.length > max)
    throw Object.assign(
      new Error(`El texto supera el límite de ${max} caracteres`),
      { status: 400 },
    );
  return text;
};

export function parseLimit(input, fallback = 50) {
  const parsed = Number.parseInt(input, 10);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 1), 100)
    : fallback;
}

export function parseOffset(input, fallback = 0) {
  const parsed = Number.parseInt(input, 10);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 0), 10000)
    : fallback;
}

export function parseDoctorQuery(input = {}) {
  const specialty =
    typeof input.especialidad === "string"
      ? cleanText(input.especialidad, 60)
      : "";
  const search = typeof input.q === "string" ? cleanText(input.q, 80) : "";
  return { specialty, search, limit: parseLimit(input.limit) };
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
