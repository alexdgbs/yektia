import mongoose from "mongoose";

const medicalApplicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      unique: true,
      index: true,
    },
    legalName: { type: String, required: true, trim: true, maxlength: 120 },
    professionalLicense: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    specialty: { type: String, required: true, trim: true, maxlength: 100 },
    specialtyLicense: { type: String, default: "", trim: true, maxlength: 30 },
    phone: { type: String, default: "", trim: true, maxlength: 30 },
    location: { type: String, default: "", trim: true, maxlength: 160 },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "changes_requested",
        "approved",
        "rejected",
        "withdrawn",
      ],
      default: "draft",
      index: true,
    },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },
    reviewNote: { type: String, default: "", trim: true, maxlength: 1000 },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medico",
      default: null,
    },
  },
  { timestamps: true },
);

export const MedicalApplication =
  mongoose.models.SolicitudMedica ||
  mongoose.model("SolicitudMedica", medicalApplicationSchema);
