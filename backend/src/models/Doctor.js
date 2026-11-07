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
    start: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    end: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
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
    precio: { type: String, default: "", trim: true },
    idiomas: { type: [String], default: [] },
    seguros: { type: [String], default: [] },
    actualizado: { type: String, default: "", trim: true },
    fuente: { type: String, default: "", trim: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "removed"],
      default: "pending",
      index: true,
    },
    appointmentDuration: {
      type: Number,
      enum: [15, 30, 45, 60, 90],
      default: 45,
    },
    timezoneOffset: { type: Number, min: -720, max: 840, default: -360 },
    weeklySchedule: { type: [scheduleRuleSchema], default: [] },
    blockedDates: { type: [String], default: [] },
    availabilitySyncedAt: { type: Date, default: null },
    valoraciones: { type: [ratingSchema], default: [] },
    comentarios: { type: [commentSchema], default: [] },
  },
  { timestamps: true },
);

doctorSchema.methods.toPublicJSON = function toPublicJSON(viewerUserId = "") {
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
