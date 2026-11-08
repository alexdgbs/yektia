import assert from "node:assert/strict";
import { test } from "vitest";
import mongoose from "mongoose";
import { MedicalApplication } from "../src/models/MedicalApplication.js";
import { MedicalDocument } from "../src/models/MedicalDocument.js";
import { User } from "../src/models/User.js";
import {
  matchesDocumentSignature,
  professionalErasureFields,
  requiredMedicalDocumentTypes,
} from "../src/controllers/medicalApplicationsController.js";
import { Doctor } from "../src/models/Doctor.js";

test("medical applications require professional identity fields", () => {
  const application = new MedicalApplication({
    applicant: new mongoose.Types.ObjectId(),
  });
  const errors = application.validateSync().errors;
  assert.ok(errors.legalName);
  assert.ok(errors.professionalLicense);
  assert.ok(errors.specialty);
});

test("specialty license remains optional when a specialty is provided", () => {
  const application = new MedicalApplication({
    applicant: new mongoose.Types.ObjectId(),
    legalName: "Alex Barajas",
    professionalLicense: "12345678",
    specialty: "Fisioterapia Deportiva",
    specialtyLicense: "",
  });
  assert.equal(application.validateSync(), undefined);
});

test("specialty document is only required when its license number is declared", () => {
  assert.deepEqual(requiredMedicalDocumentTypes(""), [
    "identity",
    "professional_license",
  ]);
  assert.deepEqual(requiredMedicalDocumentTypes("345198978"), [
    "identity",
    "professional_license",
    "specialty_license",
  ]);
});

test("medical documents only accept private review formats", () => {
  const document = new MedicalDocument({
    application: new mongoose.Types.ObjectId(),
    type: "identity",
    originalName: "archivo.exe",
    mimeType: "application/octet-stream",
    size: 20,
    data: Buffer.from("not-a-document"),
  });
  assert.ok(document.validateSync().errors.mimeType);
});

test("uploaded medical documents must match their declared format", () => {
  assert.equal(
    matchesDocumentSignature(Buffer.from("%PDF-1.7\n"), "application/pdf"),
    true,
  );
  assert.equal(
    matchesDocumentSignature(Buffer.from("not a pdf"), "application/pdf"),
    false,
  );
  assert.equal(
    matchesDocumentSignature(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      "image/png",
    ),
    true,
  );
});

test("accounts support the administrative review role", () => {
  const admin = new User({
    nombre: "Administración",
    email: "admin@example.com",
    role: "admin",
  });
  assert.equal(admin.validateSync(), undefined);
  assert.equal(admin.toPublicJSON().role, "admin");
});

test("accounts expose synchronized favorite doctors", () => {
  const favorite = new mongoose.Types.ObjectId();
  const patient = new User({
    nombre: "Paciente",
    email: "patient-favorites@example.com",
    favoriteDoctors: [favorite],
  });
  assert.equal(patient.validateSync(), undefined);
  assert.deepEqual(patient.toPublicJSON().favoriteDoctorIds, [
    favorite.toString(),
  ]);
});

test("accounts retain a minimal medical decision after application cleanup", () => {
  const patient = new User({
    nombre: "Paciente",
    email: "patient@example.com",
    medicalDecision: {
      status: "rejected",
      note: "La cédula no coincide",
      decidedAt: new Date(),
    },
  });
  assert.equal(patient.validateSync(), undefined);
  assert.equal(patient.toPublicJSON().medicalDecision.status, "rejected");
  assert.equal(
    patient.toPublicJSON().medicalDecision.note,
    "La cédula no coincide",
  );
});

test("public doctor data exposes only the signed-in user's own rating", () => {
  const doctor = new Doctor({
    nombre: "Dra. Ana",
    especialidad: "Medicina",
    telefono: "3325670193",
    cedula: "1234567",
    actualizado: "ayer",
    fuente: "seed",
    valoraciones: [
      { userId: "user-a", estrellas: 4 },
      { userId: "user-b", estrellas: 2 },
    ],
  });
  assert.equal(doctor.toPublicJSON("user-a").myRating, 4);
  assert.equal(doctor.toPublicJSON("user-c").myRating, 0);
  assert.equal(doctor.toPublicJSON("user-a").valoraciones, undefined);
  const publicView = doctor.toPublicJSON("user-a");
  assert.equal(publicView.telefono, undefined);
  assert.equal(publicView.cedula, undefined);
  assert.equal(publicView.actualizado, undefined);
  assert.equal(publicView.fuente, undefined);
  assert.equal(publicView.__v, undefined);
  assert.equal(
    doctor.toPublicJSON("user-a", { owner: true }).telefono,
    "3325670193",
  );
});

test("medical profiles and applications support administrative withdrawal", () => {
  const doctor = new Doctor({
    nombre: "Dra. Ana",
    especialidad: "Medicina",
    verificationStatus: "removed",
  });
  const application = new MedicalApplication({
    applicant: new mongoose.Types.ObjectId(),
    legalName: "Dra. Ana",
    professionalLicense: "12345678",
    specialty: "Medicina",
    status: "withdrawn",
  });
  assert.equal(doctor.validateSync(), undefined);
  assert.equal(application.validateSync(), undefined);
});

test("professional data erasure leaves only an anonymous appointment reference", () => {
  const erased = professionalErasureFields();
  assert.equal(erased.nombre, "Profesional retirado");
  assert.equal(erased.verificationStatus, "removed");
  assert.equal(erased.precio, null);
  for (const field of [
    "cedula",
    "telefono",
    "ubicacion",
    "descripcion",
    "imagen",
  ])
    assert.equal(erased[field], "");
  assert.deepEqual(erased.comentarios, []);
  assert.deepEqual(erased.valoraciones, []);
});
