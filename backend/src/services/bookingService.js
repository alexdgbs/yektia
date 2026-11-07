import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { Doctor } from "../models/Doctor.js";
import { containsUnsafeControlCharacters } from "../utils/validation.js";

const reject = (status, message) => {
  throw Object.assign(new Error(message), { status });
};

export const appointmentDayKey = (startsAt, timezoneOffset = -360) =>
  new Date(new Date(startsAt).getTime() + timezoneOffset * 60000)
    .toISOString()
    .slice(0, 10);
export const appointmentDayBounds = (dayKey, timezoneOffset = -360) => {
  const startsAt = new Date(
    new Date(dayKey).getTime() - timezoneOffset * 60000,
  );
  return { startsAt, endsAt: new Date(startsAt.getTime() + 86400000) };
};

export async function bookAppointment(user, input) {
  return mongoose.connection.transaction(async (session) => {
    const slot = await AvailabilitySlot.findOneAndUpdate(
      { _id: input.slotId, status: "open", startsAt: { $gt: new Date() } },
      { status: "booked" },
      { new: true, session },
    );
    if (!slot) reject(409, "Ese horario ya no está disponible");
    if (user.doctor?.toString() === slot.doctor.toString())
      reject(400, "No puedes agendar una cita contigo mismo");
    const doctor = await Doctor.findById(slot.doctor)
      .select("timezoneOffset")
      .session(session);
    const offset = doctor?.timezoneOffset ?? -360;
    const dayKey = appointmentDayKey(slot.startsAt, offset);
    const { startsAt, endsAt } = appointmentDayBounds(dayKey, offset);
    const bookingKey = `${user._id}:${slot.doctor}:${dayKey}`;
    const sameDaySlots = await AvailabilitySlot.find({
      doctor: slot.doctor,
      startsAt: { $gte: startsAt, $lt: endsAt },
    })
      .distinct("_id")
      .session(session);
    if (
      await Appointment.exists({
        doctor: slot.doctor,
        patient: user._id,
        status: { $ne: "cancelled" },
        $or: [{ bookingKey }, { slot: { $in: sameDaySlots } }],
      }).session(session)
    )
      reject(409, "Ya tienes una cita con este especialista ese día");
    const reason =
      typeof input.reason === "string" ? input.reason.trim().slice(0, 300) : "";
    if (reason && containsUnsafeControlCharacters(reason))
      reject(400, "El motivo contiene caracteres no válidos");
    const [appointment] = await Appointment.create(
      [
        {
          doctor: slot.doctor,
          patient: user._id,
          slot: slot._id,
          bookingKey,
          reason,
        },
      ],
      { session },
    );
    return appointment;
  });
}
