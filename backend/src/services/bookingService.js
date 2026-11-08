import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { Doctor } from "../models/Doctor.js";
import { containsUnsafeControlCharacters } from "../utils/validation.js";
import { MEXICO_CITY_OFFSET_MINUTES } from "../utils/constants.js";
import { dateKeyAtOffset } from "../utils/dates.js";
import { sessionQuery, transactionNotSupported } from "./transaction.js";

const reject = (status, message) => {
  throw Object.assign(new Error(message), { status });
};

export const appointmentDayKey = (
  startsAt,
  timezoneOffset = MEXICO_CITY_OFFSET_MINUTES,
) => dateKeyAtOffset(startsAt, timezoneOffset);
export const appointmentDayBounds = (
  dayKey,
  timezoneOffset = MEXICO_CITY_OFFSET_MINUTES,
) => {
  const startsAt = new Date(
    new Date(dayKey).getTime() - timezoneOffset * 60000,
  );
  return { startsAt, endsAt: new Date(startsAt.getTime() + 86400000) };
};

const cleanReason = (input) => {
  const reason =
    typeof input.reason === "string" ? input.reason.trim().slice(0, 300) : "";
  if (reason && containsUnsafeControlCharacters(reason))
    reject(400, "El motivo contiene caracteres no válidos");
  return reason;
};

const sameDayCheck = async (user, slot, session) => {
  const doctor = await sessionQuery(
    Doctor.findById(slot.doctor).select("timezoneOffset"),
    session,
  );
  const offset = doctor?.timezoneOffset ?? MEXICO_CITY_OFFSET_MINUTES;
  const dayKey = appointmentDayKey(slot.startsAt, offset);
  const { startsAt, endsAt } = appointmentDayBounds(dayKey, offset);
  const bookingKey = `${user._id}:${slot.doctor}:${dayKey}`;
  const sameDaySlots = await sessionQuery(
    AvailabilitySlot.find({
      doctor: slot.doctor,
      startsAt: { $gte: startsAt, $lt: endsAt },
    }).distinct("_id"),
    session,
  );
  const duplicate = await sessionQuery(
    Appointment.exists({
      doctor: slot.doctor,
      patient: user._id,
      status: { $ne: "cancelled" },
      $or: [{ bookingKey }, { slot: { $in: sameDaySlots } }],
    }),
    session,
  );
  return { bookingKey, duplicate };
};

// Con transaccion: el aborto revierte el hueco y la cita juntos.
async function bookWithTransaction(user, input, reason, session) {
  const slot = await AvailabilitySlot.findOneAndUpdate(
    { _id: input.slotId, status: "open", startsAt: { $gt: new Date() } },
    { status: "booked" },
    { new: true, session },
  );
  if (!slot) reject(409, "Ese horario ya no está disponible");
  if (user.doctor?.toString() === slot.doctor.toString())
    reject(400, "No puedes agendar una cita contigo mismo");
  const { bookingKey, duplicate } = await sameDayCheck(user, slot, session);
  if (duplicate)
    reject(409, "Ya tienes una cita con este especialista ese día");
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
}

// Sin replica set no hay transacciones: el hueco se reclama con una sola
// operacion atomica y el bookingKey (indice unico) impide la doble reserva
// del mismo dia. Si algo falla despues, el hueco se libera.
async function bookWithoutTransaction(user, input, reason) {
  const slot = await AvailabilitySlot.findOneAndUpdate(
    { _id: input.slotId, status: "open", startsAt: { $gt: new Date() } },
    { status: "booked" },
    { new: true },
  );
  if (!slot) reject(409, "Ese horario ya no está disponible");
  try {
    if (user.doctor?.toString() === slot.doctor.toString())
      reject(400, "No puedes agendar una cita contigo mismo");
    const { bookingKey, duplicate } = await sameDayCheck(user, slot, null);
    if (duplicate)
      reject(409, "Ya tienes una cita con este especialista ese día");
    const [appointment] = await Appointment.create([
      {
        doctor: slot.doctor,
        patient: user._id,
        slot: slot._id,
        bookingKey,
        reason,
      },
    ]);
    return appointment;
  } catch (error) {
    await AvailabilitySlot.updateOne(
      { _id: slot._id, status: "booked" },
      { status: "open" },
    ).catch(() => {});
    if (error?.code === 11000)
      reject(409, "Ya tienes una cita con este especialista ese día");
    throw error;
  }
}

export async function bookAppointment(user, input) {
  const reason = cleanReason(input);
  try {
    return await mongoose.connection.transaction(async (session) =>
      bookWithTransaction(user, input, reason, session),
    );
  } catch (error) {
    if (error?.status || !transactionNotSupported(error)) throw error;
    return bookWithoutTransaction(user, input, reason);
  }
}
