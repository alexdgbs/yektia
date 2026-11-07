import { Router } from "express";
import {
  createAppointment,
  getMySchedule,
  listAppointments,
  listAvailability,
  updateAppointment,
  updateMySchedule,
} from "../controllers/appointmentsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { interactionRateLimit } from "../middleware/rateLimit.js";

export const appointmentsRouter = Router();
appointmentsRouter.get("/availability/:doctorId", listAvailability);
appointmentsRouter.get(
  "/schedule/me",
  requireAuth,
  requireRole("doctor"),
  getMySchedule,
);
appointmentsRouter.put(
  "/schedule/me",
  requireAuth,
  requireRole("doctor"),
  interactionRateLimit,
  updateMySchedule,
);
appointmentsRouter.get("/", requireAuth, listAppointments);
appointmentsRouter.post(
  "/",
  requireAuth,
  requireRole("patient", "doctor"),
  interactionRateLimit,
  createAppointment,
);
appointmentsRouter.patch(
  "/:id",
  requireAuth,
  interactionRateLimit,
  updateAppointment,
);
