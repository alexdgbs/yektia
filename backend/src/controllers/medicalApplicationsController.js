import mongoose from "mongoose";
import { AuditEvent } from "../models/AuditEvent.js";
import { Doctor } from "../models/Doctor.js";
import { MedicalApplication } from "../models/MedicalApplication.js";
import { MedicalDocument } from "../models/MedicalDocument.js";
import { User } from "../models/User.js";
import { Appointment } from "../models/Appointment.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";

const editableStatuses = ["draft", "changes_requested"];
const validId = (value) => mongoose.isValidObjectId(value);
const documentTypes = ["identity", "professional_license", "specialty_license"];
const editableApplication = (applicant) =>
  MedicalApplication.findOne({ applicant }).then((application) =>
    application && editableStatuses.includes(application.status)
      ? application
      : null,
  );
const editableDocumentContext = async (
  request,
  response,
  unavailableMessage,
) => {
  const type = request.params.type;
  if (!documentTypes.includes(type)) {
    response.status(400).json({ message: "Tipo de documento inválido" });
    return null;
  }
  const application = await editableApplication(request.user._id);
  if (!application) {
    response.status(409).json({ message: unavailableMessage });
    return null;
  }
  return { type, application };
};
export const requiredMedicalDocumentTypes = (specialtyLicense = "") => [
  "identity",
  "professional_license",
  ...(specialtyLicense.trim() ? ["specialty_license"] : []),
];
const clean = (value, max = 160) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const personNamePattern = /^[\p{L}\p{M}.' -]+$/u;
const specialtyPattern = /^[\p{L}\p{M}.'() /&-]+$/u;
const digitsPattern = /^\d+$/;
const validPhone = (value) => !value || /^\d{10}$/.test(value);
export const matchesDocumentSignature = (buffer, mimeType) => {
  if (!Buffer.isBuffer(buffer)) return false;
  if (mimeType === "application/pdf")
    return buffer.length >= 5 && buffer.subarray(0, 5).toString() === "%PDF-";
  if (mimeType === "image/jpeg")
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  if (mimeType === "image/png")
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  return false;
};
const fileName = (value, fallback) => {
  try {
    return clean(decodeURIComponent(value || ""), 180) || fallback;
  } catch {
    return fallback;
  }
};
const applicationJSON = async (application) => {
  const documents = await MedicalDocument.find({ application: application._id })
    .select("type originalName mimeType size createdAt")
    .lean();
  const data = application.toObject ? application.toObject() : application;
  return {
    id: data._id.toString(),
    legalName: data.legalName,
    professionalLicense: data.professionalLicense,
    specialty: data.specialty,
    specialtyLicense: data.specialtyLicense,
    phone: data.phone,
    location: data.location,
    status: data.status,
    submittedAt: data.submittedAt,
    reviewedAt: data.reviewedAt,
    reviewNote: data.reviewNote,
    applicant: data.applicant,
    doctor: data.doctor,
    documents: documents.map((item) => ({
      id: item._id.toString(),
      type: item.type,
      name: item.originalName,
      mimeType: item.mimeType,
      size: item.size,
      createdAt: item.createdAt,
    })),
  };
};
const audit = (request, action, entityId, metadata = {}) =>
  AuditEvent.create({
    actor: request.user._id,
    action,
    entityType: "medical_application",
    entityId,
    metadata,
    requestId: request.id,
  });
export const professionalErasureFields = () => ({
  nombre: "Profesional retirado",
  especialidad: "No disponible",
  descripcion: "",
  cedula: "",
  telefono: "",
  imagen: "",
  ubicacion: "",
  disponibilidad: "",
  precio: "",
  idiomas: [],
  seguros: [],
  actualizado: "",
  fuente: "",
  verificationStatus: "removed",
  weeklySchedule: [],
  blockedDates: [],
  availabilitySyncedAt: null,
  valoraciones: [],
  comentarios: [],
});

export async function getMyApplication(request, response, next) {
  try {
    const application = await MedicalApplication.findOne({
      applicant: request.user._id,
    });
    return response.json({
      application: application ? await applicationJSON(application) : null,
    });
  } catch (error) {
    return next(error);
  }
}

export async function saveMyApplication(request, response, next) {
  try {
    const payload = {
      legalName: clean(request.body.legalName, 120),
      professionalLicense: clean(request.body.professionalLicense, 30),
      specialty: clean(request.body.specialty, 100),
      specialtyLicense: clean(request.body.specialtyLicense, 30),
      phone: clean(request.body.phone, 30),
      location: clean(request.body.location, 160),
    };
    if (
      !payload.legalName ||
      !payload.professionalLicense ||
      !payload.specialty
    )
      return response.status(400).json({
        message: "Completa nombre legal, cédula profesional y especialidad",
      });
    if (!personNamePattern.test(payload.legalName))
      return response
        .status(400)
        .json({ message: "El nombre sólo puede contener letras" });
    if (!specialtyPattern.test(payload.specialty))
      return response
        .status(400)
        .json({ message: "La especialidad no puede contener números" });
    if (
      !digitsPattern.test(payload.professionalLicense) ||
      (payload.specialtyLicense &&
        !digitsPattern.test(payload.specialtyLicense))
    )
      return response
        .status(400)
        .json({ message: "Las cédulas sólo pueden contener números" });
    if (!validPhone(payload.phone))
      return response
        .status(400)
        .json({ message: "El teléfono debe tener exactamente 10 números" });
    let application = await MedicalApplication.findOne({
      applicant: request.user._id,
    });
    if (application && !editableStatuses.includes(application.status))
      return response
        .status(409)
        .json({ message: "La solicitud ya está en revisión" });
    application =
      application ||
      new MedicalApplication({ applicant: request.user._id, ...payload });
    Object.assign(application, payload, { status: "draft", reviewNote: "" });
    await application.save();
    if (!payload.specialtyLicense)
      await MedicalDocument.deleteOne({
        application: application._id,
        type: "specialty_license",
      });
    await User.updateOne(
      { _id: request.user._id },
      { $unset: { medicalDecision: 1 } },
    );
    await audit(request, "application_saved", application._id);
    return response.json({ application: await applicationJSON(application) });
  } catch (error) {
    return next(error);
  }
}

export async function uploadDocument(request, response, next) {
  try {
    const context = await editableDocumentContext(
      request,
      response,
      "Guarda una solicitud editable antes de cargar documentos",
    );
    if (!context) return;
    const { type, application } = context;
    const mimeType = request.get("content-type")?.split(";")[0];
    if (
      !["application/pdf", "image/jpeg", "image/png"].includes(mimeType) ||
      !Buffer.isBuffer(request.body) ||
      !request.body.length ||
      !matchesDocumentSignature(request.body, mimeType)
    )
      return response
        .status(400)
        .json({ message: "Adjunta un PDF, JPG o PNG válido" });
    const fallbackName = `documento.${mimeType === "application/pdf" ? "pdf" : mimeType === "image/png" ? "png" : "jpg"}`;
    const originalName = fileName(request.get("x-file-name"), fallbackName);
    await MedicalDocument.findOneAndUpdate(
      { application: application._id, type },
      { originalName, mimeType, size: request.body.length, data: request.body },
      { upsert: true, new: true, runValidators: true },
    );
    await audit(request, "document_uploaded", application._id, {
      type,
      mimeType,
      size: request.body.length,
    });
    return response.json({ application: await applicationJSON(application) });
  } catch (error) {
    return next(error);
  }
}

export async function deleteMyDocument(request, response, next) {
  try {
    const context = await editableDocumentContext(
      request,
      response,
      "La solicitud no se puede editar",
    );
    if (!context) return;
    const { type, application } = context;
    await MedicalDocument.deleteOne({ application: application._id, type });
    await audit(request, "document_deleted", application._id, { type });
    return response.json({ application: await applicationJSON(application) });
  } catch (error) {
    return next(error);
  }
}

export async function deleteMyDraft(request, response, next) {
  try {
    const application = await MedicalApplication.findOne({
      applicant: request.user._id,
    });
    if (!application || !editableStatuses.includes(application.status))
      return response
        .status(409)
        .json({ message: "La solicitud no se puede descartar" });
    await MedicalDocument.deleteMany({ application: application._id });
    await AuditEvent.deleteMany({
      entityType: "medical_application",
      entityId: application._id,
    });
    await MedicalApplication.deleteOne({ _id: application._id });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
}

export async function submitMyApplication(request, response, next) {
  try {
    const application = await MedicalApplication.findOne({
      applicant: request.user._id,
    });
    if (!application || !editableStatuses.includes(application.status))
      return response
        .status(409)
        .json({ message: "La solicitud no puede enviarse" });
    const documents = await MedicalDocument.find({
      application: application._id,
    }).distinct("type");
    const requiredDocuments = requiredMedicalDocumentTypes(
      application.specialtyLicense,
    );
    if (!requiredDocuments.every((type) => documents.includes(type)))
      return response.status(400).json({
        message: application.specialtyLicense
          ? "Adjunta identificación, cédula profesional y cédula de especialidad"
          : "Adjunta identificación y cédula profesional",
      });
    application.status = "submitted";
    application.submittedAt = new Date();
    application.reviewNote = "";
    await application.save();
    await audit(request, "application_submitted", application._id);
    request.app.get("io")?.emit?.("solicitud_medica_actualizada", {
      id: application.id,
      status: application.status,
    });
    return response.json({ application: await applicationJSON(application) });
  } catch (error) {
    return next(error);
  }
}

export async function listApplications(request, response, next) {
  try {
    const status = clean(request.query.status, 30);
    const allowedStatuses = [
      "draft",
      "submitted",
      "changes_requested",
      "approved",
      "rejected",
      "withdrawn",
    ];
    if (status && !allowedStatuses.includes(status))
      return response.status(400).json({ message: "Estado inválido" });
    const requestedLimit = Number.parseInt(request.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;
    const query = status ? { status } : {};
    const applications = await MedicalApplication.find(query)
      .populate("applicant", "nombre email")
      .sort({ updatedAt: -1 })
      .limit(limit);
    return response.json({
      applications: await Promise.all(applications.map(applicationJSON)),
    });
  } catch (error) {
    return next(error);
  }
}

export async function downloadDocument(request, response, next) {
  try {
    if (!validId(request.params.id) || !validId(request.params.documentId))
      return response.status(400).json({ message: "Identificador inválido" });
    const document = await MedicalDocument.findOne({
      _id: request.params.documentId,
      application: request.params.id,
    }).select("+data");
    if (!document)
      return response.status(404).json({ message: "Documento no encontrado" });
    response.set({
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.originalName)}`,
      "Cache-Control": "private, no-store",
    });
    return response.send(document.data);
  } catch (error) {
    return next(error);
  }
}

export async function reviewApplication(request, response, next) {
  try {
    if (!validId(request.params.id))
      return response.status(400).json({ message: "Identificador inválido" });
    const status = clean(request.body.status, 30);
    const reviewNote = clean(request.body.reviewNote, 1000);
    if (!["changes_requested", "approved", "rejected"].includes(status))
      return response.status(400).json({ message: "Decisión inválida" });
    if (status !== "approved" && !reviewNote)
      return response
        .status(400)
        .json({ message: "Explica la decisión al solicitante" });
    const application = await MedicalApplication.findById(request.params.id);
    if (
      !application ||
      !["submitted", "changes_requested"].includes(application.status)
    )
      return response
        .status(409)
        .json({ message: "La solicitud no está disponible para revisión" });
    if (status === "approved") {
      const duplicate = await Doctor.findOne({
        cedula: application.professionalLicense,
        _id: { $ne: application.doctor },
      });
      if (duplicate)
        return response
          .status(409)
          .json({ message: "La cédula ya está vinculada a otro perfil" });
      let doctor = application.doctor
        ? await Doctor.findById(application.doctor)
        : null;
      doctor = doctor || new Doctor();
      Object.assign(doctor, {
        nombre: application.legalName,
        especialidad: application.specialty,
        cedula: application.professionalLicense,
        telefono: application.phone,
        ubicacion: application.location,
        verificationStatus: "verified",
      });
      await doctor.save();
      await User.updateOne(
        { _id: application.applicant },
        { nombre: application.legalName, role: "doctor", doctor: doctor._id },
      );
      application.doctor = doctor._id;
    }
    application.status = status;
    application.reviewNote = reviewNote;
    application.reviewedAt = new Date();
    application.reviewedBy = request.user._id;
    await application.save();
    await User.updateOne(
      { _id: application.applicant },
      {
        medicalDecision: {
          status,
          note: reviewNote,
          decidedAt: application.reviewedAt,
        },
      },
    );
    await audit(request, `application_${status}`, application._id, {
      reviewNote,
    });
    request.app
      .get("io")
      ?.to?.(`user:${application.applicant}`)
      .emit?.("solicitud_medica_actualizada", { id: application.id, status });
    return response.json({ application: await applicationJSON(application) });
  } catch (error) {
    return next(error);
  }
}

export async function applicationAudit(request, response, next) {
  try {
    if (!validId(request.params.id))
      return response.status(400).json({ message: "Identificador inválido" });
    const events = await AuditEvent.find({
      entityType: "medical_application",
      entityId: request.params.id,
    })
      .populate("actor", "nombre email")
      .sort({ createdAt: 1 })
      .lean();
    return response.json({
      events: events.map(({ _id, actor, action, metadata, createdAt }) => ({
        id: _id.toString(),
        actor,
        action,
        metadata,
        createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteApplication(request, response, next) {
  try {
    if (!validId(request.params.id))
      return response.status(400).json({ message: "Identificador inválido" });
    const application = await MedicalApplication.findOne({
      _id: request.params.id,
      status: "rejected",
    });
    if (!application)
      return response
        .status(409)
        .json({ message: "Solo puedes eliminar solicitudes rechazadas" });
    await MedicalDocument.deleteMany({ application: application._id });
    await AuditEvent.deleteMany({
      entityType: "medical_application",
      entityId: application._id,
    });
    await MedicalApplication.deleteOne({
      _id: application._id,
      status: "rejected",
    });
    request.app.get("io")?.emit?.("solicitud_medica_actualizada", {
      id: application.id,
      deleted: true,
    });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
}

export async function withdrawDoctor(request, response, next) {
  try {
    if (!validId(request.params.id))
      return response.status(400).json({ message: "Identificador inválido" });
    const application = await MedicalApplication.findOne({
      _id: request.params.id,
      status: "approved",
      doctor: { $ne: null },
    });
    if (!application)
      return response.status(409).json({ message: "El perfil no está activo" });
    const note =
      clean(request.body.note, 1000) ||
      "Perfil retirado del directorio a solicitud del profesional.";
    const futureSlots = await AvailabilitySlot.find({
      doctor: application.doctor,
      startsAt: { $gt: new Date() },
    }).select("_id");
    const slotIds = futureSlots.map((slot) => slot._id);
    const affected = slotIds.length
      ? await Appointment.find({
          slot: { $in: slotIds },
          status: { $in: ["pending", "confirmed"] },
        }).select("_id patient")
      : [];
    await Doctor.updateOne(
      { _id: application.doctor },
      {
        verificationStatus: "removed",
        weeklySchedule: [],
        blockedDates: [],
        availabilitySyncedAt: null,
      },
    );
    if (slotIds.length) {
      await Appointment.updateMany(
        { _id: { $in: affected.map((item) => item._id) } },
        { status: "cancelled" },
      );
      await AvailabilitySlot.deleteMany({
        _id: { $in: slotIds },
        status: "open",
      });
    }
    await User.updateOne(
      { _id: application.applicant },
      { role: "patient", $unset: { doctor: 1, medicalDecision: 1 } },
    );
    application.status = "withdrawn";
    application.reviewNote = note;
    application.reviewedAt = new Date();
    application.reviewedBy = request.user._id;
    await application.save();
    await audit(request, "doctor_withdrawn", application._id, {
      note,
      cancelledAppointments: affected.length,
    });
    const io = request.app.get("io");
    io?.emit?.("agenda_actualizada", {
      doctorId: application.doctor.toString(),
    });
    io?.emit?.("perfil_retirado", { medicoId: application.doctor.toString() });
    for (const appointment of affected)
      io?.to?.(`user:${appointment.patient}`).emit?.("cita_actualizada", {
        appointmentId: appointment.id,
      });
    io?.to?.(`user:${application.applicant}`).emit?.(
      "solicitud_medica_actualizada",
      { id: application.id, status: "withdrawn" },
    );
    return response.json({
      application: await applicationJSON(application),
      cancelledAppointments: affected.length,
    });
  } catch (error) {
    return next(error);
  }
}

export async function eraseDoctorData(request, response, next) {
  try {
    if (!validId(request.params.id))
      return response.status(400).json({ message: "Identificador inválido" });
    if (request.body.confirmation !== "ELIMINAR")
      return response
        .status(400)
        .json({ message: "Escribe ELIMINAR para confirmar" });
    const application = await MedicalApplication.findOne({
      _id: request.params.id,
      status: "withdrawn",
      doctor: { $ne: null },
    });
    if (!application)
      return response
        .status(409)
        .json({ message: "Primero debes retirar el perfil del directorio" });
    const doctor = await Doctor.findById(application.doctor);
    if (!doctor)
      return response
        .status(404)
        .json({ message: "Perfil médico no encontrado" });
    await MedicalDocument.deleteMany({ application: application._id });
    await AuditEvent.deleteMany({
      entityType: "medical_application",
      entityId: application._id,
    });
    Object.assign(doctor, professionalErasureFields());
    await doctor.save();
    await MedicalApplication.deleteOne({
      _id: application._id,
      status: "withdrawn",
    });
    await AuditEvent.create({
      actor: request.user._id,
      action: "professional_data_erased",
      entityType: "doctor_tombstone",
      entityId: doctor._id,
      metadata: {},
      requestId: request.id,
    });
    request.app
      .get("io")
      ?.to?.(`user:${application.applicant}`)
      .emit?.("solicitud_medica_actualizada", {
        id: application.id,
        deleted: true,
      });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
}
