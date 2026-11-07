import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import { Appointment } from "../models/Appointment.js";
import {
  parseDoctorQuery,
  validateComment,
  validateRating,
} from "../utils/validation.js";

const validId = (id) => mongoose.isValidObjectId(id);
const MAX_EMBEDDED_REVIEWS = 1000;
const canReview = (patient, doctor) =>
  Appointment.exists({ patient, doctor, status: "completed" });
const commentView = (comment, viewerUserId = "") => ({
  _id: comment._id,
  nombre: comment.nombre,
  texto: comment.texto,
  fecha: comment.fecha,
  isMine: Boolean(viewerUserId && comment.userId === viewerUserId.toString()),
});
async function ownedComment(request, response, action) {
  if (!validId(request.params.id) || !validId(request.params.commentId)) {
    response.status(400).json({ message: "Identificador inválido" });
    return null;
  }
  const doctor = await Doctor.findById(request.params.id);
  if (!doctor) {
    response.status(404).json({ message: "Médico no encontrado" });
    return null;
  }
  const comment = doctor.comentarios.id(request.params.commentId);
  if (!comment) {
    response.status(404).json({ message: "Comentario no encontrado" });
    return null;
  }
  if (comment.userId !== request.user.id) {
    response
      .status(403)
      .json({ message: `Solo puedes ${action} tu comentario` });
    return null;
  }
  return { doctor, comment };
}
export const parseConsultationPrice = (value) => {
  const price = Number(value);
  return Number.isInteger(price) && price >= 0 && price <= 100000
    ? price
    : null;
};

export async function listDoctors(_request, response, next) {
  try {
    const query = { verificationStatus: "verified" };
    const { specialty, search, limit } = parseDoctorQuery(_request.query);
    if (specialty) query.especialidad = specialty;
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { nombre: new RegExp(safeSearch, "i") },
        { especialidad: new RegExp(safeSearch, "i") },
        { ubicacion: new RegExp(safeSearch, "i") },
      ];
    }
    const doctors = await Doctor.find(query).sort({ nombre: 1 }).limit(limit);
    response.set("Cache-Control", "private, max-age=30");
    response.json(
      doctors.map((doctor) => doctor.toPublicJSON(_request.user?.id)),
    );
  } catch (error) {
    next(error);
  }
}

export async function getDoctor(request, response, next) {
  try {
    if (!validId(request.params.id))
      return response
        .status(400)
        .json({ message: "Identificador inválido", requestId: request.id });
    const query = { _id: request.params.id, verificationStatus: "verified" };
    const doctor = await Doctor.findOne(query);
    if (!doctor)
      return response
        .status(404)
        .json({ message: "Médico no encontrado", requestId: request.id });
    response.set("Cache-Control", "private, max-age=30");
    return response.json(doctor.toPublicJSON(request.user?.id));
  } catch (error) {
    return next(error);
  }
}

export async function rateDoctor(request, response, next) {
  try {
    const { id } = request.params;
    const {
      valid,
      userId,
      stars: estrellas,
    } = validateRating({ ...request.body, userId: request.user.id });
    if (!validId(id))
      return response.status(400).json({ message: "Identificador inválido" });
    if (!valid)
      return response
        .status(400)
        .json({ message: "La valoración debe ser un entero entre 1 y 5" });
    if (request.user.doctor?.toString() === id)
      return response
        .status(400)
        .json({ message: "No puedes valorar tu propio perfil" });
    if (!(await canReview(request.user._id, id)))
      return response
        .status(403)
        .json({ message: "Puedes valorar después de completar una cita" });
    const doctor = await Doctor.findById(id);
    if (!doctor)
      return response.status(404).json({ message: "Médico no encontrado" });
    let rating = doctor.valoraciones.find((item) => item.userId === userId);
    if (rating) rating.estrellas = estrellas;
    else {
      if (doctor.valoraciones.length >= MAX_EMBEDDED_REVIEWS)
        return response.status(409).json({
          message: "Este perfil alcanzó el límite temporal de valoraciones",
        });
      doctor.valoraciones.push({ userId, estrellas });
      rating = doctor.valoraciones.at(-1);
    }
    await doctor.save();
    const promedio = doctor.toPublicJSON().promedio;
    const ratingCount = doctor.valoraciones.length;
    request.app
      .get("io")
      .emit("nueva_valoracion", { medicoId: doctor.id, promedio, ratingCount });
    return response.json({
      message: "Valoración guardada",
      promedio,
      ratingCount,
    });
  } catch (error) {
    return next(error);
  }
}

export async function removeRating(request, response, next) {
  try {
    if (!validId(request.params.id))
      return response.status(400).json({ message: "Identificador inválido" });
    const doctor = await Doctor.findById(request.params.id);
    if (!doctor)
      return response.status(404).json({ message: "Médico no encontrado" });
    doctor.valoraciones = doctor.valoraciones.filter(
      (item) => item.userId !== request.user.id,
    );
    await doctor.save();
    const { promedio, ratingCount } = doctor.toPublicJSON();
    request.app
      .get("io")
      .emit("nueva_valoracion", { medicoId: doctor.id, promedio, ratingCount });
    return response.json({
      message: "Valoración eliminada",
      promedio,
      ratingCount,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyDoctorProfile(request, response, next) {
  try {
    const price = parseConsultationPrice(request.body.price);
    if (price === null)
      return response.status(400).json({ message: "Escribe un precio válido" });
    const clean = (value, limit) =>
      typeof value === "string" ? value.trim().slice(0, limit) : "";
    const update = {
      precio: String(price),
      descripcion: clean(request.body.description, 500),
      telefono: clean(request.body.phone, 30),
      ubicacion: clean(request.body.location, 160),
      idiomas: Array.isArray(request.body.languages)
        ? request.body.languages
            .map((item) => clean(item, 40))
            .filter(Boolean)
            .slice(0, 8)
        : [],
    };
    if (update.telefono && !/^\d{10}$/.test(update.telefono))
      return response
        .status(400)
        .json({ message: "El teléfono debe tener exactamente 10 números" });
    const doctor = await Doctor.findOneAndUpdate(
      { _id: request.user.doctor, verificationStatus: "verified" },
      update,
      { new: true, runValidators: true },
    );
    if (!doctor)
      return response
        .status(404)
        .json({ message: "Perfil médico no encontrado" });
    request.app
      .get("io")
      .emit("perfil_actualizado", { medico: doctor.toPublicJSON() });
    return response.json(doctor.toPublicJSON());
  } catch (error) {
    return next(error);
  }
}

export async function addComment(request, response, next) {
  try {
    const { id } = request.params;
    const {
      valid,
      userId,
      name: nombre,
      text: texto,
    } = validateComment({
      ...request.body,
      userId: request.user.id,
      nombre: request.user.nombre,
    });
    if (!validId(id))
      return response.status(400).json({ message: "Identificador inválido" });
    if (!valid)
      return response
        .status(400)
        .json({ message: "El comentario no es válido" });
    if (request.user.doctor?.toString() === id)
      return response
        .status(400)
        .json({ message: "No puedes comentar tu propio perfil" });
    if (!(await canReview(request.user._id, id)))
      return response
        .status(403)
        .json({ message: "Puedes comentar después de completar una cita" });
    const doctor = await Doctor.findById(id);
    if (!doctor)
      return response.status(404).json({ message: "Médico no encontrado" });
    let comment = doctor.comentarios.find((item) => item.userId === userId);
    if (comment) Object.assign(comment, { nombre, texto, fecha: new Date() });
    else {
      if (doctor.comentarios.length >= MAX_EMBEDDED_REVIEWS)
        return response.status(409).json({
          message: "Este perfil alcanzó el límite temporal de comentarios",
        });
      doctor.comentarios.push({ userId, nombre, texto });
      comment = doctor.comentarios.at(-1);
    }
    await doctor.save();
    request.app.get("io").emit("nuevo_comentario", {
      medicoId: doctor.id,
      comentario: commentView(comment),
    });
    return response.json({
      message: "Comentario guardado",
      comentario: commentView(comment, request.user.id),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateComment(request, response, next) {
  try {
    const { valid, text: texto } = validateComment({
      ...request.body,
      userId: request.user.id,
      nombre: request.user.nombre,
    });
    if (!valid)
      return response
        .status(400)
        .json({ message: "El comentario no es válido" });
    const owned = await ownedComment(request, response, "editar");
    if (!owned) return;
    const { doctor, comment } = owned;
    Object.assign(comment, {
      texto,
      nombre: request.user.nombre,
      fecha: new Date(),
    });
    await doctor.save();
    request.app.get("io").emit("nuevo_comentario", {
      medicoId: doctor.id,
      comentario: commentView(comment),
    });
    return response.json({
      message: "Comentario actualizado",
      comentario: commentView(comment, request.user.id),
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteComment(request, response, next) {
  try {
    const owned = await ownedComment(request, response, "eliminar");
    if (!owned) return;
    const { doctor, comment } = owned;
    comment.deleteOne();
    await doctor.save();
    request.app.get("io").emit("comentario_eliminado", {
      medicoId: doctor.id,
      comentarioId: request.params.commentId,
    });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
}

export async function listComments(request, response, next) {
  try {
    if (!validId(request.params.id))
      return response.status(400).json({ message: "Identificador inválido" });
    const doctor = await Doctor.findById(request.params.id).select(
      "comentarios",
    );
    if (!doctor)
      return response.status(404).json({ message: "Médico no encontrado" });
    const requestedLimit = Number.parseInt(request.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;
    return response.json(
      doctor.comentarios
        .slice(-limit)
        .reverse()
        .map((comment) => commentView(comment, request.user?.id)),
    );
  } catch (error) {
    return next(error);
  }
}
