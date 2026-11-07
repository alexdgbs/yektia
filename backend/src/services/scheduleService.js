import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { MEXICO_CITY_OFFSET_MINUTES } from "../utils/constants.js";
import { dateKeyAtOffset } from "../utils/dates.js";

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const minutes = (value) => {
  const match = TIME.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : -1;
};
export const isCalendarDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export function validateSchedule(input) {
  const duration = Number(input.duration);
  const timezoneOffset = Number(input.timezoneOffset);
  const rules = Array.isArray(input.rules)
    ? input.rules.map((rule) => ({
        day: Number(rule.day),
        start: String(rule.start || ""),
        end: String(rule.end || ""),
      }))
    : [];
  const blockedDates = [
    ...new Set(
      Array.isArray(input.blockedDates) ? input.blockedDates.map(String) : [],
    ),
  ]
    .filter(isCalendarDate)
    .slice(0, 120);
  if (
    ![15, 30, 45, 60, 90].includes(duration) ||
    !Number.isInteger(timezoneOffset) ||
    timezoneOffset < -720 ||
    timezoneOffset > 840 ||
    rules.length < 1 ||
    rules.length > 7
  )
    return null;
  for (const rule of rules)
    if (
      !Number.isInteger(rule.day) ||
      rule.day < 0 ||
      rule.day > 6 ||
      minutes(rule.start) < 0 ||
      minutes(rule.end) <= minutes(rule.start)
    )
      return null;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const sorted = [...rules].sort(
    (a, b) => order.indexOf(a.day) - order.indexOf(b.day),
  );
  if (
    new Set(sorted.map((rule) => rule.day)).size !== sorted.length ||
    sorted.some(
      (rule) => rule.start !== sorted[0]?.start || rule.end !== sorted[0]?.end,
    ) ||
    sorted.some(
      (rule, index) =>
        index &&
        order.indexOf(rule.day) !== order.indexOf(sorted[index - 1].day) + 1,
    )
  )
    return null;
  return { duration, timezoneOffset, rules, blockedDates };
}

export function buildUpcomingSlots(doctor, now = new Date(), days = 60) {
  const offset = doctor.timezoneOffset ?? MEXICO_CITY_OFFSET_MINUTES;
  const shifted = new Date(now.getTime() + offset * 60_000);
  const base = new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ),
  );
  const blocked = new Set(doctor.blockedDates || []);
  const slots = [];
  for (let index = 0; index < days; index += 1) {
    const localDate = new Date(base.getTime() + index * 86_400_000);
    const key = localDate.toISOString().slice(0, 10);
    if (blocked.has(key)) continue;
    const rules = (doctor.weeklySchedule || []).filter(
      (rule) => rule.day === localDate.getUTCDay(),
    );
    for (const rule of rules)
      for (
        let minute = minutes(rule.start);
        minute + doctor.appointmentDuration <= minutes(rule.end);
        minute += doctor.appointmentDuration
      ) {
        const startsAt = new Date(
          localDate.getTime() + minute * 60_000 - offset * 60_000,
        );
        if (startsAt <= now) continue;
        slots.push({
          doctor: doctor._id,
          startsAt,
          endsAt: new Date(
            startsAt.getTime() + doctor.appointmentDuration * 60_000,
          ),
          status: "open",
        });
      }
  }
  return slots;
}

export function slotMatchesSchedule(doctor, startsAt) {
  const offset = doctor.timezoneOffset ?? MEXICO_CITY_OFFSET_MINUTES;
  const local = new Date(startsAt.getTime() + offset * 60_000);
  if ((doctor.blockedDates || []).includes(dateKeyAtOffset(startsAt, offset)))
    return false;
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  return (doctor.weeklySchedule || []).some(
    (rule) =>
      rule.day === local.getUTCDay() &&
      minute >= minutes(rule.start) &&
      minute + doctor.appointmentDuration <= minutes(rule.end) &&
      (minute - minutes(rule.start)) % doctor.appointmentDuration === 0,
  );
}

export async function synchronizeAvailability(doctor) {
  const slots = buildUpcomingSlots(doctor);
  const desired = new Set(slots.map((slot) => slot.startsAt.toISOString()));
  const existing = await AvailabilitySlot.find({
    doctor: doctor._id,
    startsAt: { $gt: new Date() },
  }).select("_id startsAt status");
  const obsolete = existing
    .filter(
      (slot) =>
        slot.status === "open" && !desired.has(slot.startsAt.toISOString()),
    )
    .map((slot) => slot._id);
  if (obsolete.length)
    await AvailabilitySlot.deleteMany({
      _id: { $in: obsolete },
      status: "open",
    });
  const present = new Set(existing.map((slot) => slot.startsAt.toISOString()));
  const missing = slots.filter(
    (slot) => !present.has(slot.startsAt.toISOString()),
  );
  if (missing.length) {
    try {
      await AvailabilitySlot.insertMany(missing, { ordered: false });
    } catch (error) {
      if (!error?.writeErrors?.every((item) => item.code === 11000))
        throw error;
    }
  }
  return slots.length;
}
