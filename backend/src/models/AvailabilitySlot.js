import mongoose from "mongoose";

const availabilitySlotSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medico",
      required: true,
      index: true,
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["open", "booked"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true },
);

availabilitySlotSchema.index({ doctor: 1, startsAt: 1 }, { unique: true });

export const AvailabilitySlot =
  mongoose.models.Horario || mongoose.model("Horario", availabilitySlotSchema);
