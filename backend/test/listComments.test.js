import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, test } from "vitest";
import { createApp } from "../src/app.js";
import { Doctor } from "../src/models/Doctor.js";

const io = { emit: () => {} };
const app = createApp({ frontendUrls: ["http://localhost:5173"], io });
let mongo;
let doctor;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Doctor.init();
  doctor = await Doctor.create({
    nombre: "Médica",
    especialidad: "General",
    verificationStatus: "verified",
    comentarios: Array.from({ length: 5 }, (_item, index) => ({
      userId: `usuario-${index}`,
      nombre: `Paciente ${index}`,
      texto: `Comentario ${index}`,
      fecha: new Date(Date.UTC(2026, 0, index + 1)),
    })),
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

test("listComments devuelve solo los últimos N, del más reciente al más viejo", async () => {
  const response = await request(app).get(
    `/api/medicos/${doctor._id}/comentarios?limit=2`,
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 2);
  assert.deepEqual(
    response.body.map((comment) => comment.texto),
    ["Comentario 4", "Comentario 3"],
  );
});

test("listComments sin limit devuelve todos en el mismo orden", async () => {
  const response = await request(app).get(
    `/api/medicos/${doctor._id}/comentarios`,
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 5);
  assert.equal(response.body[0].texto, "Comentario 4");
});

test("listComments rechaza ids inválidos o inexistentes", async () => {
  assert.equal(
    (await request(app).get("/api/medicos/no-es-un-id/comentarios")).status,
    400,
  );
  assert.equal(
    (
      await request(app).get(
        "/api/medicos/507f1f77bcf86cd799439011/comentarios",
      )
    ).status,
    404,
  );
});
