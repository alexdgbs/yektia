import {
  APPOINTMENT_DURATIONS,
  MAX_CONSULTATION_PRICE,
  MEXICO_CITY_OFFSET_MINUTES,
  TIME_PATTERN,
  TIMEZONE_OFFSET_MAX_MINUTES,
  TIMEZONE_OFFSET_MIN_MINUTES,
} from "../utils/constants.js";
import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  userId: { type: String, required: true, trim: true },
  estrellas: { type: Number, required: true, min: 1, max: 5 },
});
const commentSchema = new mongoose.Schema({
  userId: { type: String, required: true, trim: true },
  nombre: { type: String, required: true, trim: true, maxlength: 80 },
  texto: { type: String, required: true, trim: true, maxlength: 800 },
  fecha: { type: Date, default: Date.now },
});
const scheduleRuleSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    start: { type: String, required: true, match: TIME_PATTERN },
    end: { type: String, required: true, match: TIME_PATTERN },
  },
  { _id: false },
);
const doctorSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    especialidad: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "", trim: true, maxlength: 500 },
    cedula: { type: String, default: "", trim: true },
    telefono: { type: String, default: "", trim: true, maxlength: 30 },
    imagen: { type: String, default: "", trim: true },
    ubicacion: { type: String, default: "", trim: true, maxlength: 160 },
    disponibilidad: { type: String, default: "", trim: true },
    precio: {
      type: Number,
      default: null,
      min: 0,
      max: MAX_CONSULTATION_PRICE,
    },
    idiomas: { type: [String], default: [] },
    seguros: { type: [String], default: [] },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "removed"],
      default: "pending",
      index: true,
    },
    appointmentDuration: {
      type: Number,
      enum: APPOINTMENT_DURATIONS,
      default: 45,
    },
    timezoneOffset: {
      type: Number,
      min: TIMEZONE_OFFSET_MIN_MINUTES,
      max: TIMEZONE_OFFSET_MAX_MINUTES,
      default: MEXICO_CITY_OFFSET_MINUTES,
    },
    weeklySchedule: { type: [scheduleRuleSchema], default: [] },
    blockedDates: { type: [String], default: [] },
    availabilitySyncedAt: { type: Date, default: null },
    valoraciones: { type: [ratingSchema], default: [] },
    comentarios: { type: [commentSchema], default: [] },
  },
  { timestamps: true },
);

// Vista publica: sin telefono ni cedula. El telefono solo lo ve el propio
// medico (owner) para editar su perfil; a nadie mas se le sirve.
doctorSchema.methods.toPublicJSON = function toPublicJSON(
  viewerUserId = "",
  options = {},
) {
  const data = this.toObject();
  data.promedio = data.valoraciones.length
    ? data.valoraciones.reduce((sum, item) => sum + item.estrellas, 0) /
      data.valoraciones.length
    : 0;
  data.ratingCount = data.valoraciones.length;
  data.myRating =
    data.valoraciones.find((item) => item.userId === viewerUserId?.toString())
      ?.estrellas || 0;
  data.comentarios = data.comentarios.map(
    ({ _id, userId, nombre, texto, fecha }) => ({
      _id,
      nombre,
      texto,
      fecha,
      isMine: Boolean(viewerUserId && userId === viewerUserId.toString()),
    }),
  );
  delete data.weeklySchedule;
  delete data.blockedDates;
  delete data.timezoneOffset;
  delete data.availabilitySyncedAt;
  delete data.valoraciones;
  delete data.cedula;
  delete data.actualizado;
  delete data.fuente;
  delete data.__v;
  if (!options.owner) delete data.telefono;
  return data;
};

doctorSchema.index({ especialidad: 1, nombre: 1 });
doctorSchema.index(
  { cedula: 1 },
  {
    unique: true,
    partialFilterExpression: { cedula: { $type: "string", $gt: "" } },
  },
);

export const Doctor =
  mongoose.models.Medico || mongoose.model("Medico", doctorSchema);
