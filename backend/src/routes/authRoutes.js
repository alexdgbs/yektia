import { Router } from "express";
import {
  googleLogin,
  logout,
  me,
  socketTicket,
  syncFavorites,
  updateMe,
} from "../controllers/authController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { interactionRateLimit } from "../middleware/rateLimit.js";

export const authRouter = Router();
authRouter.post("/google", interactionRateLimit, googleLogin);
authRouter.get("/me", optionalAuth, me);
authRouter.post("/socket-ticket", requireAuth, socketTicket);
authRouter.patch("/me", requireAuth, interactionRateLimit, updateMe);
authRouter.put(
  "/me/favorites",
  requireAuth,
  interactionRateLimit,
  syncFavorites,
);
authRouter.post("/logout", requireAuth, logout);
