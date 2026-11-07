import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medico",
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Horario",
      required: true,
      index: true,
    },
    bookingKey: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      select: false,
    },
    reason: { type: String, trim: true, maxlength: 300, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

export const Appointment =
  mongoose.models.Cita || mongoose.model("Cita", appointmentSchema);
