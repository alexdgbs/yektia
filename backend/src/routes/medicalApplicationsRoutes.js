import express, { Router } from "express";
import {
  applicationAudit,
  deleteApplication,
  deleteMyDocument,
  deleteMyDraft,
  downloadDocument,
  eraseDoctorData,
  getMyApplication,
  listApplications,
  reviewApplication,
  saveMyApplication,
  submitMyApplication,
  uploadDocument,
  withdrawDoctor,
} from "../controllers/medicalApplicationsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { interactionRateLimit } from "../middleware/rateLimit.js";

export const medicalApplicationsRouter = Router();
medicalApplicationsRouter.use(requireAuth);
medicalApplicationsRouter.get("/me", getMyApplication);
medicalApplicationsRouter.put(
  "/me",
  requireRole("patient"),
  interactionRateLimit,
  saveMyApplication,
);
medicalApplicationsRouter.put(
  "/me/documents/:type",
  requireRole("patient"),
  interactionRateLimit,
  express.raw({
    type: ["application/pdf", "image/jpeg", "image/png"],
    limit: "5mb",
  }),
  uploadDocument,
);
medicalApplicationsRouter.delete(
  "/me/documents/:type",
  requireRole("patient"),
  interactionRateLimit,
  deleteMyDocument,
);
medicalApplicationsRouter.delete(
  "/me",
  requireRole("patient"),
  interactionRateLimit,
  deleteMyDraft,
);
medicalApplicationsRouter.post(
  "/me/submit",
  requireRole("patient"),
  interactionRateLimit,
  submitMyApplication,
);
medicalApplicationsRouter.get("/", requireRole("admin"), listApplications);
medicalApplicationsRouter.get(
  "/:id/documents/:documentId",
  requireRole("admin"),
  downloadDocument,
);
medicalApplicationsRouter.get(
  "/:id/audit",
  requireRole("admin"),
  applicationAudit,
);
medicalApplicationsRouter.patch(
  "/:id/review",
  requireRole("admin"),
  interactionRateLimit,
  reviewApplication,
);
medicalApplicationsRouter.delete(
  "/:id/doctor",
  requireRole("admin"),
  interactionRateLimit,
  withdrawDoctor,
);
medicalApplicationsRouter.delete(
  "/:id/personal-data",
  requireRole("admin"),
  interactionRateLimit,
  eraseDoctorData,
);
medicalApplicationsRouter.delete(
  "/:id",
  requireRole("admin"),
  interactionRateLimit,
  deleteApplication,
);
