import assert from "node:assert/strict";
import { test } from "vitest";
import {
  parseDoctorQuery,
  validateComment,
  validateRating,
} from "../src/utils/validation.js";
import { parseConsultationPrice } from "../src/controllers/doctorsController.js";

test("normalizes and bounds directory queries", () => {
  assert.deepEqual(
    parseDoctorQuery({
      q: "  cardio  ",
      especialidad: " Cardiología ",
      limit: "500",
    }),
    { search: "cardio", specialty: "Cardiología", limit: 100 },
  );
});
test("accepts valid ratings and rejects invalid ranges", () => {
  assert.equal(validateRating({ userId: "user-1", estrellas: 5 }).valid, true);
  assert.equal(validateRating({ userId: "user-1", estrellas: 6 }).valid, false);
});
test("normalizes comments and enforces required content", () => {
  assert.deepEqual(
    validateComment({ userId: " u1 ", nombre: " Ana ", texto: " Bien " }),
    { valid: true, userId: "u1", name: "Ana", text: "Bien" },
  );
  assert.equal(
    validateComment({ userId: "u1", nombre: "", texto: "Bien" }).valid,
    false,
  );
  assert.equal(
    validateComment({ userId: "u1", nombre: "Ana", texto: "Hola\u0000" }).valid,
    false,
  );
});
test("accepts bounded consultation prices", () => {
  assert.equal(parseConsultationPrice("1200"), 1200);
  assert.equal(parseConsultationPrice("-1"), null);
  assert.equal(parseConsultationPrice("texto"), null);
});
