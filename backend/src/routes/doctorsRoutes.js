import { Router } from "express";
import {
  addComment,
  deleteComment,
  getDoctor,
  listComments,
  listDoctors,
  rateDoctor,
  removeRating,
  updateComment,
  updateMyDoctorProfile,
} from "../controllers/doctorsController.js";
import { interactionRateLimit } from "../middleware/rateLimit.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";

export const doctorsRouter = Router();
doctorsRouter.get("/", optionalAuth, listDoctors);
doctorsRouter.get("/:id", optionalAuth, getDoctor);
doctorsRouter.post(
  "/:id/valorar",
  requireAuth,
  requireRole("patient", "doctor"),
  interactionRateLimit,
  rateDoctor,
);
doctorsRouter.delete(
  "/:id/valorar",
  requireAuth,
  requireRole("patient", "doctor"),
  interactionRateLimit,
  removeRating,
);
doctorsRouter.post(
  "/:id/comentar",
  requireAuth,
  requireRole("patient", "doctor"),
  interactionRateLimit,
  addComment,
);
doctorsRouter.patch(
  "/:id/comentarios/:commentId",
  requireAuth,
  requireRole("patient", "doctor"),
  interactionRateLimit,
  updateComment,
);
doctorsRouter.delete(
  "/:id/comentarios/:commentId",
  requireAuth,
  requireRole("patient", "doctor"),
  interactionRateLimit,
  deleteComment,
);
doctorsRouter.get("/:id/comentarios", optionalAuth, listComments);
doctorsRouter.patch(
  "/me/profile",
  requireAuth,
  requireRole("doctor"),
  interactionRateLimit,
  updateMyDoctorProfile,
);
