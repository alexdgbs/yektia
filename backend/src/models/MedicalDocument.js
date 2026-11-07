import mongoose from "mongoose";

const medicalDocumentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SolicitudMedica",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["identity", "professional_license", "specialty_license"],
      required: true,
    },
    originalName: { type: String, required: true, trim: true, maxlength: 180 },
    mimeType: {
      type: String,
      enum: ["application/pdf", "image/jpeg", "image/png"],
      required: true,
    },
    size: { type: Number, required: true, max: 5 * 1024 * 1024 },
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true },
);

medicalDocumentSchema.index({ application: 1, type: 1 }, { unique: true });
export const MedicalDocument =
  mongoose.models.DocumentoMedico ||
  mongoose.model("DocumentoMedico", medicalDocumentSchema);
