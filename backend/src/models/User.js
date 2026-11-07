import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    googleSub: { type: String, sparse: true, unique: true, index: true },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      default: "patient",
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medico",
      sparse: true,
      unique: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    telefono: { type: String, default: "", trim: true, maxlength: 30 },
    favoriteDoctors: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Medico" }],
      default: [],
      validate: [(items) => items.length <= 100, "Máximo 100 favoritos"],
    },
    medicalDecision: {
      type: new mongoose.Schema(
        {
          status: {
            type: String,
            enum: ["changes_requested", "approved", "rejected"],
          },
          note: { type: String, default: "", maxlength: 1000 },
          decidedAt: { type: Date },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this.id,
    nombre: this.nombre,
    email: this.email,
    telefono: this.telefono || "",
    role: this.role,
    doctorId: this.doctor?.toString?.() || null,
    favoriteDoctorIds: (this.favoriteDoctors || []).map((id) => id.toString()),
    medicalDecision: this.medicalDecision || null,
  };
};

export const User =
  mongoose.models.Usuario || mongoose.model("Usuario", userSchema);
