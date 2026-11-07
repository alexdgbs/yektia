import mongoose from "mongoose";

export const isValidId = (id) => mongoose.isValidObjectId(id);

export const cleanText = (value, max = 160) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export function parseLimit(input, fallback = 50) {
  const parsed = Number.parseInt(input, 10);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 1), 100)
    : fallback;
}

export function parseDoctorQuery(input = {}) {
  const specialty =
    typeof input.especialidad === "string"
      ? input.especialidad.trim().slice(0, 60)
      : "";
  const search = typeof input.q === "string" ? input.q.trim().slice(0, 80) : "";
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
