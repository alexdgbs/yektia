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
import { AuditEvent } from "../src/models/AuditEvent.js";
import { sessionHash } from "../src/middleware/auth.js";
import { createSession } from "../src/controllers/authController.js";

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
      (await api({ cookie: `yektia_session=${token}` }, "get", "/appointments"))
        .status,
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

describe("Pasada 11: privacidad del directorio (P0-1)", () => {
  it("la API pública no sirve teléfono, cédula ni campos internos", async () => {
    await Doctor.create({
      nombre: "Dra. Privada",
      especialidad: "General",
      telefono: "3325670193",
      cedula: "2390871",
      actualizado: "ayer",
      fuente: "seed",
      verificationStatus: "verified",
    });
    const list = await request(app).get("/api/medicos");
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThan(0);
    for (const item of list.body) {
      expect(item.telefono).toBeUndefined();
      expect(item.cedula).toBeUndefined();
      expect(item.actualizado).toBeUndefined();
      expect(item.fuente).toBeUndefined();
      expect(item.__v).toBeUndefined();
    }
    const one = await request(app).get(`/api/medicos/${doctor.id}`);
    expect(one.status).toBe(200);
    expect(one.body.telefono).toBeUndefined();
    expect(one.body.cedula).toBeUndefined();
  });
  it("el propio médico sí ve su teléfono para editar su perfil", async () => {
    doctor.telefono = "3325670193";
    doctor.cedula = "2390871";
    await doctor.save();
    const result = await api(professional, "get", `/medicos/${doctor.id}`);
    expect(result.status).toBe(200);
    expect(result.body.telefono).toBe("3325670193");
    expect(result.body.cedula).toBeUndefined();
  });
});

describe("Pasada 11: perfiles retirados no se valoran ni se comentan (P0-5)", () => {
  async function removedWithCompletedAppointment() {
    const removed = await Doctor.create({
      nombre: "Retirado",
      especialidad: "General",
      verificationStatus: "removed",
    });
    const target = await AvailabilitySlot.create({
      doctor: removed._id,
      startsAt: new Date(Date.now() + 72 * 3600000),
      endsAt: new Date(Date.now() + 72 * 3600000 + 1800000),
    });
    await Appointment.create({
      doctor: removed._id,
      patient: patient.user._id,
      slot: target._id,
      status: "completed",
    });
    return removed;
  }
  it("valorar un perfil retirado da 404", async () => {
    const removed = await removedWithCompletedAppointment();
    expect(
      (
        await api(patient, "post", `/medicos/${removed.id}/valorar`).send({
          estrellas: 5,
        })
      ).status,
    ).toBe(404);
  });
  it("comentar un perfil retirado da 404", async () => {
    const removed = await removedWithCompletedAppointment();
    expect(
      (
        await api(patient, "post", `/medicos/${removed.id}/comentar`).send({
          texto: "Muy buen trato",
        })
      ).status,
    ).toBe(404);
  });
  it("listar comentarios de un perfil retirado da 404", async () => {
    const removed = await Doctor.create({
      nombre: "Retirado",
      especialidad: "General",
      verificationStatus: "removed",
    });
    expect(
      (await request(app).get(`/api/medicos/${removed.id}/comentarios`)).status,
    ).toBe(404);
    expect(
      (await request(app).get(`/api/medicos/${doctor.id}/comentarios`)).status,
    ).toBe(200);
  });
});

describe("Pasada 11: PATCH parcial (P0-6)", () => {
  it("editar solo la descripción no borra teléfono ni precio", async () => {
    doctor.telefono = "3325670193";
    doctor.precio = 600;
    doctor.descripcion = "Vieja";
    await doctor.save();
    const result = await api(professional, "patch", "/medicos/me/profile").send(
      { description: "Nueva" },
    );
    expect(result.status).toBe(200);
    expect(result.body.descripcion).toBe("Nueva");
    expect(result.body.telefono).toBe("3325670193");
    expect(result.body.precio).toBe(600);
    const saved = await Doctor.findById(doctor.id);
    expect(saved.telefono).toBe("3325670193");
    expect(saved.precio).toBe(600);
    expect(saved.descripcion).toBe("Nueva");
  });
  it("editar solo el precio no toca la descripción", async () => {
    doctor.descripcion = "Se queda";
    doctor.precio = 600;
    await doctor.save();
    const result = await api(professional, "patch", "/medicos/me/profile").send(
      { price: 700 },
    );
    expect(result.status).toBe(200);
    expect(result.body.precio).toBe(700);
    expect(result.body.descripcion).toBe("Se queda");
    expect(typeof (await Doctor.findById(doctor.id)).precio).toBe("number");
  });
  it("editar solo el nombre no borra el teléfono de la cuenta", async () => {
    patient.user.telefono = "3312345678";
    await patient.user.save();
    const result = await api(patient, "patch", "/auth/me").send({
      nombre: "Nuevo Nombre",
    });
    expect(result.status).toBe(200);
    expect(result.body.user.nombre).toBe("Nuevo Nombre");
    expect(result.body.user.telefono).toBe("3312345678");
  });
});

describe("Pasada 11: citas con paginación y sin correo del paciente (P1-4)", () => {
  async function seedAppointments(count) {
    const created = [];
    for (let index = 0; index < count; index += 1) {
      const target = await AvailabilitySlot.create({
        doctor: doctor._id,
        startsAt: new Date(Date.now() + (72 + index) * 3600000),
        endsAt: new Date(Date.now() + (72 + index) * 3600000 + 1800000),
      });
      created.push(
        await Appointment.create({
          doctor: doctor._id,
          patient: patient.user._id,
          slot: target._id,
          status: "pending",
        }),
      );
    }
    return created;
  }
  it("pagina la lista y no incluye el correo del paciente", async () => {
    await seedAppointments(3);
    const first = await api(patient, "get", "/appointments?limit=2");
    expect(first.status).toBe(200);
    expect(first.body.personal).toHaveLength(2);
    const second = await api(patient, "get", "/appointments?limit=2&offset=2");
    expect(second.body.personal).toHaveLength(1);
    for (const item of first.body.personal)
      expect(item.patient.email).toBeUndefined();
    const practice = await api(professional, "get", "/appointments");
    expect(practice.body.practice).toHaveLength(3);
    for (const item of practice.body.practice) {
      expect(item.patient.nombre).toBe("Persona");
      expect(item.patient.email).toBeUndefined();
    }
  });
});

describe("Pasada 11: disponibilidad de solo lectura (P1-6)", () => {
  it("no devuelve huecos reservados ni escribe en el GET", async () => {
    doctor.availabilitySyncedAt = new Date();
    await doctor.save();
    const open = await AvailabilitySlot.create({
      doctor: doctor._id,
      startsAt: new Date(Date.now() + 72 * 3600000),
      endsAt: new Date(Date.now() + 72 * 3600000 + 1800000),
      status: "open",
    });
    await AvailabilitySlot.create({
      doctor: doctor._id,
      startsAt: new Date(Date.now() + 73 * 3600000),
      endsAt: new Date(Date.now() + 73 * 3600000 + 1800000),
      status: "booked",
    });
    const result = await request(app).get(
      `/api/appointments/availability/${doctor.id}`,
    );
    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(1);
    expect(result.body[0]._id).toBe(open.id);
    expect(await AvailabilitySlot.countDocuments({ doctor: doctor._id })).toBe(
      2,
    );
  });
});

describe("Pasada 11: precio como número (P1-13)", () => {
  it("un precio guardado como texto se lee como número", async () => {
    const created = await Doctor.create({
      nombre: "Dra. Texto",
      especialidad: "General",
      precio: "650",
      verificationStatus: "verified",
    });
    const loaded = await Doctor.findById(created.id);
    expect(loaded.precio).toBe(650);
    expect(typeof loaded.precio).toBe("number");
  });
});

describe("Pasada 11: sesiones y errores con requestId (P1-14, P1-18, P1-19)", () => {
  it("logout con all cierra todas las sesiones", async () => {
    const token = randomUUID();
    await Session.create({
      user: patient.user._id,
      tokenHash: sessionHash(token),
      expiresAt: new Date(Date.now() + 3600000),
    });
    expect(
      (await api(patient, "post", "/auth/logout").send({ all: true })).status,
    ).toBe(204);
    expect((await api(patient, "get", "/appointments")).status).toBe(401);
    expect(
      (await api({ cookie: `yektia_session=${token}` }, "get", "/appointments"))
        .status,
    ).toBe(401);
  });
  it("el login conserva solo las 5 sesiones más recientes", async () => {
    const response = { cookie() {} };
    for (let index = 0; index < 6; index += 1)
      await createSession({}, response, patient.user);
    expect(await Session.countDocuments({ user: patient.user._id })).toBe(5);
  });
  it("las respuestas de error llevan requestId", async () => {
    const invalid = await request(app).get("/api/medicos/no-es-un-id");
    expect(invalid.status).toBe(400);
    expect(invalid.body.requestId).toBe(invalid.headers["x-request-id"]);
    const booking = await api(patient, "post", "/appointments").send({
      slotId: "no-es-un-id",
    });
    expect(booking.status).toBe(400);
    expect(booking.body.requestId).toBe(booking.headers["x-request-id"]);
  });
  it("GET /me no sobrescribe el nombre con el del perfil médico", async () => {
    const result = await api(professional, "get", "/auth/me");
    expect(result.status).toBe(200);
    expect(result.body.user.nombre).toBe("Persona");
    expect((await User.findById(professional.user._id)).nombre).toBe("Persona");
  });
});

describe("Pasada 11: texto demasiado largo se rechaza (P1-16)", () => {
  it("la solicitud con nombre legal largo da 400", async () => {
    const result = await api(patient, "put", "/medical-applications/me").send({
      legalName: "A".repeat(121),
      professionalLicense: "123456",
      specialty: "General",
    });
    expect(result.status).toBe(400);
    expect(result.body.message).toMatch(/límite/);
  });
});

describe("Pasada 11: revisión con transacción (P0-8)", () => {
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
  it("aprobar crea el perfil, sube el rol y deja auditoría", async () => {
    const admin = await identity("admin");
    const { applicant, application } = await submittedApplication();
    const result = await api(
      admin,
      "patch",
      `/medical-applications/${application.id}/review`,
    ).send({ status: "approved", reviewNote: "" });
    expect(result.status).toBe(200);
    expect(result.body.application.status).toBe("approved");
    const created = await Doctor.findById(result.body.application.doctor);
    expect(created.nombre).toBe("Dra. Nueva");
    expect(created.verificationStatus).toBe("verified");
    expect((await User.findById(applicant.user._id)).role).toBe("doctor");
    expect(
      await AuditEvent.countDocuments({
        entityId: application._id,
        action: "application_approved",
      }),
    ).toBe(1);
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
  it("borrar una solicitud conserva sus eventos de auditoría", async () => {
    const admin = await identity("admin");
    const { application } = await submittedApplication({
      status: "rejected",
    });
    await AuditEvent.create({
      actor: admin.user._id,
      action: "application_saved",
      entityType: "medical_application",
      entityId: application._id,
      metadata: {},
      requestId: "test",
    });
    expect(
      (await api(admin, "delete", `/medical-applications/${application.id}`))
        .status,
    ).toBe(204);
    expect(
      await AuditEvent.countDocuments({ entityId: application._id }),
    ).toBeGreaterThan(0);
  });
});

describe("Pasada 11: búsqueda con límite después de filtrar (P1-8)", () => {
  it("el límite se aplica después del filtro y la especialidad ignora tildes", async () => {
    await Doctor.create({
      nombre: "Ana A",
      especialidad: "General",
      verificationStatus: "verified",
    });
    await Doctor.create({
      nombre: "Beto B",
      especialidad: "General",
      verificationStatus: "verified",
    });
    await Doctor.create({
      nombre: "Carlos C",
      especialidad: "Cardiología",
      verificationStatus: "verified",
    });
    const search = await request(app).get("/api/medicos?q=carlos&limit=1");
    expect(search.status).toBe(200);
    expect(search.body).toHaveLength(1);
    expect(search.body[0].nombre).toBe("Carlos C");
    const specialty = await request(app).get(
      "/api/medicos?especialidad=cardiologia",
    );
    expect(specialty.status).toBe(200);
    expect(specialty.body).toHaveLength(1);
    expect(specialty.body[0].nombre).toBe("Carlos C");
  });
});
