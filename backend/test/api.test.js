import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Session } from "../src/models/Session.js";
import { Doctor } from "../src/models/Doctor.js";
import { Appointment } from "../src/models/Appointment.js";
import { AvailabilitySlot } from "../src/models/AvailabilitySlot.js";
import { MedicalApplication } from "../src/models/MedicalApplication.js";
import { MedicalDocument } from "../src/models/MedicalDocument.js";
import { sessionHash } from "../src/middleware/auth.js";

let mongo, doctor, patient, other, professional;
const io = { emit: vi.fn(), to: () => ({ emit: vi.fn() }) };
const app = createApp({ frontendUrls: ["http://localhost:5173"], io });
async function identity(role = "patient", extra = {}) {
  const user = await User.create({
    nombre: "Persona",
    email: `${randomUUID()}@example.com`,
    role,
    ...extra,
  });
  const token = randomUUID();
  await Session.create({
    user: user._id,
    tokenHash: sessionHash(token),
    expiresAt: new Date(Date.now() + 3600000),
  });
  return { user, cookie: `yektia_session=${token}` };
}
const api = (who, method, path) =>
  request(app)[method]("/api" + path)
    .set("Cookie", who.cookie)
    .set("Origin", "http://localhost:5173");
async function slot(hours = 72) {
  const startsAt = new Date(Date.now() + hours * 3600000);
  startsAt.setUTCMinutes(0, 0, 0);
  return AvailabilitySlot.create({
    doctor: doctor._id,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 1800000),
  });
}
const book = (who, target, extra = {}) =>
  api(who, "post", "/appointments").send({ slotId: target.id, ...extra });
beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init()),
  );
});
beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.deleteMany({})),
  );
  doctor = await Doctor.create({
    nombre: "Médica",
    especialidad: "General",
    verificationStatus: "verified",
  });
  patient = await identity();
  other = await identity();
  professional = await identity("doctor", { doctor: doctor._id });
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

describe("Reservas y transacciones", () => {
  it("solo un paciente obtiene el mismo horario concurrente", async () => {
    const target = await slot();
    const results = await Promise.all([
      book(patient, target),
      book(other, target),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await Appointment.countDocuments()).toBe(1);
    expect((await AvailabilitySlot.findById(target.id)).status).toBe("booked");
    expect((await book(other, target)).status).toBe(409);
  });
  it("impide dos citas del mismo paciente y médico en un día", async () => {
    const first = await slot();
    const second = await AvailabilitySlot.create({
      doctor: doctor._id,
      startsAt: new Date(first.startsAt.getTime() + 60000),
      endsAt: first.endsAt,
    });
    const results = await Promise.all([
      book(patient, first),
      book(patient, second),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await AvailabilitySlot.countDocuments({ status: "open" })).toBe(1);
    expect(await Appointment.countDocuments()).toBe(1);
  });
  it("rechaza reservar consigo mismo y revierte el slot", async () => {
    const target = await slot();
    expect((await book(professional, target)).status).toBe(400);
    expect((await AvailabilitySlot.findById(target.id)).status).toBe("open");
  });
  it("revierte la reserva cuando falla la creación de la cita", async () => {
    const target = await slot();
    vi.spyOn(Appointment, "create").mockRejectedValueOnce(
      new Error("Fallo de escritura"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await book(patient, target)).status).toBe(500);
    expect((await AvailabilitySlot.findById(target.id)).status).toBe("open");
    expect(await Appointment.countDocuments()).toBe(0);
    expect((await book(other, target)).status).toBe(201);
  });
  it("un fallo posterior al commit no reabre el slot", async () => {
    const target = await slot();
    vi.spyOn(io, "emit").mockImplementationOnce(() => {
      throw new Error("Socket caído");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await book(patient, target)).status).toBe(500);
    expect(await Appointment.countDocuments()).toBe(1);
    expect((await AvailabilitySlot.findById(target.id)).status).toBe("booked");
  });
  it("rechaza motivos inválidos sin dejar reservas", async () => {
    const target = await slot();
    expect(
      (await book(patient, target, { reason: "texto\u0000" })).status,
    ).toBe(400);
    expect((await AvailabilitySlot.findById(target.id)).status).toBe("open");
  });
});

describe("Reglas de citas", () => {
  it("rechaza cancelaciones de paciente a menos de 24 horas", async () => {
    const created = await book(patient, await slot(12));
    expect(
      (
        await api(patient, "patch", `/appointments/${created.body.id}`).send({
          status: "cancelled",
        })
      ).status,
    ).toBe(409);
  });
  it("solo el médico confirma y solo puede completar al terminar", async () => {
    const created = await book(patient, await slot());
    const path = `/appointments/${created.body.id}`;
    expect(
      (await api(patient, "patch", path).send({ status: "confirmed" })).status,
    ).toBe(400);
    expect(
      (await api(professional, "patch", path).send({ status: "confirmed" }))
        .status,
    ).toBe(200);
    expect(
      (await api(professional, "patch", path).send({ status: "completed" }))
        .status,
    ).toBe(409);
    expect((await Appointment.findById(created.body.id)).status).toBe(
      "confirmed",
    );
  });
  it("no permite invalidar una cita activa al cambiar la agenda", async () => {
    const target = await slot();
    await book(patient, target);
    const result = await api(
      professional,
      "put",
      "/appointments/schedule/me",
    ).send({
      duration: 30,
      timezoneOffset: 0,
      rules: [
        {
          day: (target.startsAt.getUTCDay() + 1) % 7,
          start: "09:00",
          end: "14:00",
        },
      ],
      blockedDates: [],
    });
    expect(result.status).toBe(409);
    expect((await Doctor.findById(doctor.id)).weeklySchedule).toHaveLength(0);
  });
});

describe("Autenticación y documentos", () => {
  it.each([
    "/appointments",
    "/appointments/schedule/me",
    "/medical-applications",
    "/medical-applications/me",
  ])("requiere sesión en %s", async (path) => {
    expect((await request(app).get("/api" + path)).status).toBe(401);
  });
  it("RBAC bloquea todas las rutas administrativas", async () => {
    const id = new mongoose.Types.ObjectId().toString();
    for (const who of [patient, professional])
      for (const [method, path] of [
        ["get", ""],
        ["get", `/${id}/audit`],
        ["get", `/${id}/documents/${id}`],
        ["patch", `/${id}/review`],
        ["delete", `/${id}`],
        ["delete", `/${id}/doctor`],
        ["delete", `/${id}/personal-data`],
      ])
        expect(
          (await api(who, method, "/medical-applications" + path)).status,
        ).toBe(403);
  });
  it("logout invalida únicamente la sesión actual", async () => {
    const token = randomUUID();
    await Session.create({
      user: patient.user._id,
      tokenHash: sessionHash(token),
      expiresAt: new Date(Date.now() + 3600000),
    });
    expect((await api(patient, "post", "/auth/logout")).status).toBe(204);
    expect((await api(patient, "get", "/appointments")).status).toBe(401);
    expect(
      (
        await api(
          { cookie: `yektia_session=${token}` },
          "get",
          "/appointments",
        )
      ).status,
    ).toBe(200);
  });
  it("conserva la validación de Origin", async () => {
    expect(
      (
        await request(app)
          .post("/api/auth/logout")
          .set("Cookie", patient.cookie)
          .set("Origin", "https://otro.example")
      ).status,
    ).toBe(403);
  });
  it.each([
    ["application/pdf", Buffer.from("falso"), 400],
    ["image/png", Buffer.from("%PDF-1.7"), 400],
    ["image/jpeg", Buffer.from("texto"), 400],
    ["text/plain", Buffer.from("%PDF-1.7"), 400],
    ["application/pdf", Buffer.alloc(0), 400],
    ["application/pdf", Buffer.alloc(5 * 1024 * 1024 + 1, 65), 413],
    ["application/pdf", Buffer.from("%PDF-1.7\n"), 200],
    ["image/png", Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 200],
    ["image/jpeg", Buffer.from([255, 216, 255]), 200],
  ])("valida MIME, firma y tamaño: %s (%#)", async (mime, data, status) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await MedicalApplication.create({
      applicant: patient.user._id,
      legalName: "Persona",
      professionalLicense: "123456",
      specialty: "General",
    });
    const result = await api(
      patient,
      "put",
      "/medical-applications/me/documents/identity",
    )
      .set("Content-Type", mime)
      .send(data);
    expect(result.status).toBe(status);
    expect(await MedicalDocument.countDocuments()).toBe(status === 200 ? 1 : 0);
  });
  it("sirve documentación local y headers de seguridad", async () => {
    const result = await request(app).get("/api/docs");
    expect(result.status).toBe(200);
    expect(result.headers["x-content-type-options"]).toBe("nosniff");
    expect(result.headers["content-security-policy"]).toContain(
      "script-src 'self'",
    );
    expect(
      (await request(app).get("/api/docs/assets/swagger-ui-bundle.js")).status,
    ).toBe(200);
    expect((await request(app).get("/api/openapi.json")).body.openapi).toBe(
      "3.1.0",
    );
  });
});
