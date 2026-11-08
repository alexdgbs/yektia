import { Appointment } from "../models/Appointment.js";
import { isValidId, parseLimit, parseOffset } from "../utils/validation.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { User } from "../models/User.js";
import { Doctor } from "../models/Doctor.js";
import {
  slotMatchesSchedule,
  synchronizeAvailability,
  validateSchedule,
} from "../services/scheduleService.js";
import { bookAppointment } from "../services/bookingService.js";

const PATIENT_CANCELLATION_HOURS = 24;
export const patientCancellationAllowed = (startsAt, now = new Date()) =>
  new Date(startsAt).getTime() - now.getTime() >=
  PATIENT_CANCELLATION_HOURS * 60 * 60 * 1000;
// Sincroniza los huecos y deja constancia de cuándo se hizo.
const refreshAvailability = async (doctor) => {
  await synchronizeAvailability(doctor);
  doctor.availabilitySyncedAt = new Date();
  await doctor.save();
};
const appointmentView = (appointment) => ({
  id: appointment.id,
  doctor: appointment.doctor,
  patient: appointment.patient,
  slot: appointment.slot,
  reason: appointment.reason,
  status: appointment.status,
  createdAt: appointment.createdAt,
});

export async function listAvailability(request, response, next) {
  try {
    if (!isValidId(request.params.doctorId))
      return response.status(400).json({ message: "Especialista inválido" });
    const doctor = await Doctor.findOne({
      _id: request.params.doctorId,
      verificationStatus: "verified",
    });
    if (!doctor)
      return response
        .status(404)
        .json({ message: "Especialista no encontrado" });
    // Si los huecos están desactualizados, se sincronizan antes de responder:
    // si no, el primer visitante vería "sin horarios" aunque el doctor sí
    // tenga horario. Si la sincronización falla, se responde con lo guardado.
    if (
      !doctor.availabilitySyncedAt ||
      doctor.availabilitySyncedAt < new Date(Date.now() - 12 * 60 * 60 * 1000)
    ) {
      try {
        await refreshAvailability(doctor);
      } catch (error) {
        console.error("No se pudo sincronizar la disponibilidad.", error);
      }
    }
    const slots = await AvailabilitySlot.find({
      doctor: request.params.doctorId,
      status: "open",
      startsAt: { $gt: new Date() },
    })
      .select("startsAt endsAt status")
      .sort({ startsAt: 1 })
      .limit(1000);
    return response.json(slots);
  } catch (error) {
    return next(error);
  }
}

export async function getMySchedule(request, response, next) {
  try {
    const doctor = await Doctor.findOne({
      _id: request.user.doctor,
      verificationStatus: "verified",
    });
    if (!doctor)
      return response
        .status(404)
        .json({ message: "Perfil médico no encontrado" });
    await refreshAvailability(doctor);
    return response.json({
      duration: doctor.appointmentDuration,
      timezoneOffset: doctor.timezoneOffset,
      rules: doctor.weeklySchedule,
      blockedDates: doctor.blockedDates,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateMySchedule(request, response, next) {
  try {
    const schedule = validateSchedule(request.body);
    if (!schedule)
      return response
        .status(400)
        .json({ message: "Revisa los días, horas y duración de la agenda" });
    const doctor = await Doctor.findOne({
      _id: request.user.doctor,
      verificationStatus: "verified",
    });
    if (!doctor)
      return response
        .status(404)
        .json({ message: "Perfil médico no encontrado" });
    const activeAppointments = await Appointment.find({
      doctor: doctor._id,
      status: { $in: ["pending", "confirmed"] },
    }).populate({ path: "slot", match: { startsAt: { $gt: new Date() } } });
    const proposedSchedule = {
      ...doctor.toObject(),
      appointmentDuration: schedule.duration,
      timezoneOffset: schedule.timezoneOffset,
      weeklySchedule: schedule.rules,
      blockedDates: schedule.blockedDates,
    };
    const incompatibleAppointments = activeAppointments.filter(
      (appointment) =>
        appointment.slot &&
        !slotMatchesSchedule(proposedSchedule, appointment.slot.startsAt),
    );
    if (incompatibleAppointments.length)
      return response.status(409).json({
        message: `La nueva agenda deja fuera ${incompatibleAppointments.length} ${incompatibleAppointments.length === 1 ? "cita activa" : "citas activas"}. Cancélala o atiéndela antes de cambiar esos días u horarios.`,
      });
    doctor.appointmentDuration = schedule.duration;
    doctor.timezoneOffset = schedule.timezoneOffset;
    doctor.weeklySchedule = schedule.rules;
    doctor.blockedDates = schedule.blockedDates;
    await doctor.save();
    await refreshAvailability(doctor);
    request.app
      .get("io")
      ?.emit?.("agenda_actualizada", { doctorId: doctor.id });
    return response.json({
      duration: doctor.appointmentDuration,
      timezoneOffset: doctor.timezoneOffset,
      rules: doctor.weeklySchedule,
      blockedDates: doctor.blockedDates,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createAppointment(request, response, next) {
  try {
    if (!isValidId(request.body.slotId))
      return response
        .status(400)
        .json({ message: "Selecciona un horario válido" });
    const appointment = await bookAppointment(request.user, request.body);
    appointment.$session(null);
    const populated = await appointment.populate([
      { path: "doctor", select: "nombre especialidad verificationStatus" },
      { path: "patient", select: "nombre email" },
      { path: "slot" },
    ]);
    const io = request.app.get("io");
    io?.emit?.("agenda_actualizada", {
      doctorId: appointment.doctor._id.toString(),
    });
    io?.to?.(`user:${request.user.id}`)?.emit?.("cita_actualizada", {
      appointmentId: appointment.id,
    });
    const doctorUser = await User.findOne({
      doctor: appointment.doctor._id,
    }).select("_id");
    if (doctorUser)
      io?.to?.(`user:${doctorUser.id}`)?.emit?.("cita_actualizada", {
        appointmentId: appointment.id,
      });
    return response.status(201).json(appointmentView(populated));
  } catch (error) {
    if (error.status)
      return response.status(error.status).json({ message: error.message });
    if (error?.code === 11000)
      return response.status(409).json({
        message: error?.keyPattern?.bookingKey
          ? "Ya tienes una cita con este especialista ese día"
          : "Ese horario ya no está disponible",
      });
    if (error?.code === 20)
      return response
        .status(500)
        .json({ message: "No se pudo reservar, inténtalo más tarde" });
    return next(error);
  }
}

export async function listAppointments(request, response, next) {
  try {
    const limit = parseLimit(request.query.limit, 100);
    const offset = parseOffset(request.query.offset);
    const populate = [
      { path: "doctor", select: "nombre especialidad verificationStatus" },
      // El medico ve el nombre del paciente, no su correo.
      { path: "patient", select: "nombre" },
      { path: "slot" },
    ];
    const [personal, practice] = await Promise.all([
      Appointment.find({ patient: request.user._id })
        .populate(populate)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      request.user.role === "doctor"
        ? Appointment.find({ doctor: request.user.doctor })
            .populate(populate)
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
        : [],
    ]);
    return response.json({
      personal: personal.map(appointmentView),
      practice: practice.map(appointmentView),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateAppointment(request, response, next) {
  try {
    if (!isValidId(request.params.id))
      return response.status(400).json({ message: "Identificador inválido" });
    const professionalChange = ["confirmed", "completed"].includes(
      request.body.status,
    );
    if (
      !["confirmed", "cancelled", "completed"].includes(request.body.status) ||
      (professionalChange && request.user.role !== "doctor")
    )
      return response
        .status(400)
        .json({ message: "Cambio de estado inválido" });
    const ownerQuery = professionalChange
      ? { doctor: request.user.doctor }
      : request.user.role === "doctor"
        ? {
            $or: [
              { patient: request.user._id },
              { doctor: request.user.doctor },
            ],
          }
        : { patient: request.user._id };
    const allowedCurrentStatuses =
      request.body.status === "confirmed"
        ? ["pending"]
        : request.body.status === "completed"
          ? ["confirmed"]
          : ["pending", "confirmed"];
    // Una lectura para validar tiempos con el horario (inmutable); el cambio
    // de estado lo decide una sola operacion atomica con el filtro de estado.
    const current = await Appointment.findOne({
      _id: request.params.id,
      ...ownerQuery,
    }).populate([
      { path: "doctor", select: "nombre especialidad verificationStatus" },
      { path: "patient", select: "nombre" },
      { path: "slot" },
    ]);
    if (!current)
      return response.status(404).json({ message: "Cita no encontrada" });
    if (!current.slot?.startsAt || !current.slot?.endsAt)
      return response
        .status(409)
        .json({ message: "El horario de la cita ya no está disponible" });
    const now = new Date();
    if (request.body.status === "confirmed" && current.slot.startsAt <= now)
      return response
        .status(409)
        .json({ message: "No puedes confirmar una cita que ya comenzó" });
    if (request.body.status === "completed" && current.slot.endsAt > now)
      return response
        .status(409)
        .json({ message: "La cita puede completarse cuando termine" });
    if (request.body.status === "cancelled") {
      const treatingDoctor =
        request.user.role === "doctor" &&
        current.doctor?._id.toString() === request.user.doctor?.toString();
      const doctorRemoved =
        !current.doctor || current.doctor.verificationStatus === "removed";
      if (
        !treatingDoctor &&
        !doctorRemoved &&
        !patientCancellationAllowed(current.slot.startsAt)
      )
        return response.status(409).json({
          message:
            "Las cancelaciones en línea cierran 24 horas antes. Contacta al consultorio.",
        });
    }
    const update =
      request.body.status === "cancelled"
        ? { $set: { status: "cancelled" }, $unset: { bookingKey: 1 } }
        : { $set: { status: request.body.status } };
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: request.params.id,
        ...ownerQuery,
        status: { $in: allowedCurrentStatuses },
      },
      update,
      { new: true },
    ).populate([
      { path: "doctor", select: "nombre especialidad verificationStatus" },
      { path: "patient", select: "nombre" },
      { path: "slot" },
    ]);
    if (!appointment)
      return response.status(409).json({
        message: "La cita cambió de estado, vuelve a intentarlo",
      });
    if (request.body.status === "cancelled") {
      const doctor = appointment.doctor?._id
        ? await Doctor.findById(appointment.doctor._id)
        : null;
      if (doctor && slotMatchesSchedule(doctor, appointment.slot.startsAt))
        await AvailabilitySlot.updateOne(
          { _id: appointment.slot._id },
          { status: "open" },
        );
      else await AvailabilitySlot.deleteOne({ _id: appointment.slot._id });
    }
    const io = request.app.get("io");
    if (appointment.doctor?._id)
      io?.emit?.("agenda_actualizada", {
        doctorId: appointment.doctor._id.toString(),
      });
    io?.to?.(`user:${appointment.patient._id}`)?.emit?.("cita_actualizada", {
      appointmentId: appointment.id,
    });
    const doctorUser = appointment.doctor?._id
      ? await User.findOne({
          doctor: appointment.doctor._id,
        }).select("_id")
      : null;
    if (doctorUser)
      io?.to?.(`user:${doctorUser.id}`)?.emit?.("cita_actualizada", {
        appointmentId: appointment.id,
      });
    return response.json(appointmentView(appointment));
  } catch (error) {
    return next(error);
  }
}
