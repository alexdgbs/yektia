import assert from "node:assert/strict";
import { test } from "vitest";
import { cleanText, isValidId, parseLimit } from "../src/utils/validation.js";
import { matchesDoctorQuery } from "../src/utils/search.js";
import { dateKeyAtOffset } from "../src/utils/dates.js";
import {
  MAX_CONSULTATION_PRICE,
  MEXICO_CITY_OFFSET_MINUTES,
} from "../src/utils/constants.js";

test("matches search by word prefix, without accents", () => {
  const doctor = {
    nombre: "Dra. Ana Sofía Ramírez Torres",
    especialidad: "Dermatología",
    ubicacion: "Guadalajara",
  };
  assert.equal(matchesDoctorQuery(doctor, "ana"), true);
  assert.equal(matchesDoctorQuery(doctor, "derma"), true);
  assert.equal(matchesDoctorQuery(doctor, "sofia"), true);
  assert.equal(
    matchesDoctorQuery(
      { nombre: "Mariana Torres", especialidad: "Medicina General" },
      "ana",
    ),
    false,
  );
});

test("bounds limits and trims text", () => {
  assert.equal(parseLimit("500"), 100);
  assert.equal(parseLimit("0"), 1);
  assert.equal(parseLimit("abc"), 50);
  assert.equal(cleanText("  hola  ", 3), "hol");
  assert.equal(cleanText(42), "");
});

test("validates Mongo ids", () => {
  assert.equal(isValidId("507f1f77bcf86cd799439011"), true);
  assert.equal(isValidId("no-es-un-id"), false);
});

test("converts dates with the Mexico City offset", () => {
  assert.equal(MEXICO_CITY_OFFSET_MINUTES, -360);
  assert.equal(MAX_CONSULTATION_PRICE, 100000);
  assert.equal(
    dateKeyAtOffset("2026-11-07T01:00:00.000Z", MEXICO_CITY_OFFSET_MINUTES),
    "2026-11-06",
  );
  assert.equal(dateKeyAtOffset("fecha", MEXICO_CITY_OFFSET_MINUTES), "");
});
