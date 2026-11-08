import {
  appointmentDayBounds,
  appointmentDayKey,
} from "../src/services/bookingService.js";
import assert from "node:assert/strict";
import { test } from "vitest";
import mongoose from "mongoose";
import {
  buildUpcomingSlots,
  isCalendarDate,
  slotMatchesSchedule,
  validateSchedule,
} from "../src/services/scheduleService.js";

test("rejects impossible calendar dates", () => {
  assert.equal(isCalendarDate("2026-02-28"), true);
  assert.equal(isCalendarDate("2026-02-29"), false);
  assert.equal(isCalendarDate("2026-13-01"), false);
  assert.equal(
    validateSchedule({
      duration: 45,
      timezoneOffset: -360,
      rules: [{ day: 1, start: "09:00", end: "14:00" }],
      blockedDates: ["2026-02-31"],
    }).blockedDates.length,
    0,
  );
});
import { patientCancellationAllowed } from "../src/controllers/appointmentsController.js";

test("validates weekly schedules and rejects overlapping periods", () => {
  assert.deepEqual(
    validateSchedule({
      duration: 45,
      timezoneOffset: -360,
      rules: [{ day: 1, start: "09:00", end: "14:00" }],
      blockedDates: ["2026-08-17"],
    }),
    {
      duration: 45,
      timezoneOffset: -360,
      rules: [{ day: 1, start: "09:00", end: "14:00" }],
      blockedDates: ["2026-08-17"],
    },
  );
  assert.equal(
    validateSchedule({
      duration: 45,
      timezoneOffset: -360,
      rules: [
        { day: 1, start: "09:00", end: "12:00" },
        { day: 1, start: "11:00", end: "13:00" },
      ],
    }),
    null,
  );
  assert.deepEqual(
    validateSchedule({
      duration: 45,
      timezoneOffset: -360,
      rules: [
        { day: 1, start: "09:00", end: "18:00" },
        { day: 2, start: "09:00", end: "18:00" },
        { day: 3, start: "09:00", end: "18:00" },
        { day: 4, start: "09:00", end: "18:00" },
        { day: 5, start: "09:00", end: "14:00" },
      ],
    }),
    {
      duration: 45,
      timezoneOffset: -360,
      rules: [
        { day: 1, start: "09:00", end: "18:00" },
        { day: 2, start: "09:00", end: "18:00" },
        { day: 3, start: "09:00", end: "18:00" },
        { day: 4, start: "09:00", end: "18:00" },
        { day: 5, start: "09:00", end: "14:00" },
      ],
      blockedDates: [],
    },
  );
  // Horarios distintos en días distintos sí se aceptan.
  assert.notEqual(
    validateSchedule({
      duration: 45,
      timezoneOffset: -360,
      rules: [
        { day: 1, start: "09:00", end: "12:00" },
        { day: 2, start: "10:00", end: "13:00" },
      ],
    }),
    null,
  );
});

test("generates fixed-duration slots and respects blocked dates", () => {
  const doctor = {
    _id: new mongoose.Types.ObjectId(),
    appointmentDuration: 45,
    timezoneOffset: -360,
    weeklySchedule: [{ day: 1, start: "09:00", end: "11:00" }],
    blockedDates: ["2026-08-24"],
  };
  const slots = buildUpcomingSlots(
    doctor,
    new Date("2026-08-16T12:00:00.000Z"),
    10,
  );
  assert.equal(slots.length, 2);
  assert.equal(slots[0].startsAt.toISOString(), "2026-08-17T15:00:00.000Z");
  assert.equal(slots[0].endsAt.toISOString(), "2026-08-17T15:45:00.000Z");
  assert.equal(slotMatchesSchedule(doctor, slots[0].startsAt), true);
  assert.equal(
    slotMatchesSchedule(
      { ...doctor, blockedDates: ["2026-08-17"] },
      slots[0].startsAt,
    ),
    false,
  );
});

test("patient cancellations close 24 hours before the appointment", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");
  assert.equal(
    patientCancellationAllowed("2026-08-17T12:00:00.000Z", now),
    true,
  );
  assert.equal(
    patientCancellationAllowed("2026-08-17T11:59:59.999Z", now),
    false,
  );
});

test("groups appointments by the doctor's local calendar day", () => {
  const startsAt = "2026-08-18T04:30:00.000Z";
  assert.equal(appointmentDayKey(startsAt, -360), "2026-08-17");
  const bounds = appointmentDayBounds("2026-08-17", -360);
  assert.equal(bounds.startsAt.toISOString(), "2026-08-17T06:00:00.000Z");
  assert.equal(bounds.endsAt.toISOString(), "2026-08-18T06:00:00.000Z");
});
