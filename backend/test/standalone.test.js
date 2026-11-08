import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
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
import { sessionHash } from "../src/middleware/auth.js";

// Misma API contra Mongo sin replica set: reservar y revisar deben
// funcionar sin transacciones, sin dejar doble reserva ni estado parcial.
let mongo;
let doctor;
let patient;
let other;
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
const api = (who, method, path) => {
  const call = request(app)[method];
  return call("/api" + path)
    .set("Cookie", who.cookie)
    .set("Origin", "http://localhost:5173");
};
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
  mongo = await MongoMemoryServer.create();
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
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

describe("Reservas sin replica set", () => {
  it("reservar funciona y el error no habla de Mongo", async () => {
    const target = await slot();
    const result = await book(patient, target);
    expect(result.status).toBe(201);
    expect(await Appointment.countDocuments()).toBe(1);
    expect((await AvailabilitySlot.findById(target.id)).status).toBe("booked");
  });
  it("solo un paciente obtiene el mismo horario concurrente", async () => {
    const target = await slot();
    const results = await Promise.all([
      book(patient, target),
      book(other, target),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await Appointment.countDocuments()).toBe(1);
    for (const result of results)
      expect(JSON.stringify(result.body)).not.toMatch(/replica|MongoDB/i);
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
    expect(await Appointment.countDocuments()).toBe(1);
    expect(await AvailabilitySlot.countDocuments({ status: "open" })).toBe(1);
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
});

describe("Revisión sin replica set", () => {
  async function submittedApplication(overrides = {}) {
    const applicant = await identity();
    const application = await MedicalApplication.create({
      applicant: applicant.user._id,
      legalName: "Dra. Nueva",
      professionalLicense: "7654321",
      specialty: "General",
      phone: "3325670193",
      location: "Guadalajara",
      status: "submitted",
      ...overrides,
    });
    return { applicant, application };
  }
  it("aprobar funciona sin transacción", async () => {
    const admin = await identity("admin");
    const { applicant, application } = await submittedApplication();
    const result = await api(
      admin,
      "patch",
      `/medical-applications/${application.id}/review`,
    ).send({ status: "approved", reviewNote: "" });
    expect(result.status).toBe(200);
    expect(result.body.application.status).toBe("approved");
    expect((await User.findById(applicant.user._id)).role).toBe("doctor");
    expect(await Doctor.countDocuments({ nombre: "Dra. Nueva" })).toBe(1);
  });
  it("una cédula duplicada no deja estado parcial", async () => {
    const admin = await identity("admin");
    await Doctor.create({
      nombre: "Otra",
      especialidad: "General",
      cedula: "7654321",
      verificationStatus: "verified",
    });
    const { applicant, application } = await submittedApplication();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await api(
      admin,
      "patch",
      `/medical-applications/${application.id}/review`,
    ).send({ status: "approved", reviewNote: "" });
    expect(result.status).toBe(409);
    expect((await User.findById(applicant.user._id)).role).toBe("patient");
    expect(await Doctor.countDocuments({ nombre: "Dra. Nueva" })).toBe(0);
    expect((await MedicalApplication.findById(application.id)).status).toBe(
      "submitted",
    );
  });
});
