import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { Doctor } from "../models/Doctor.js";
import { createSocketTicket, sessionHash } from "../middleware/auth.js";
import {
  isValidPersonName,
  isValidPhone,
  MAX_FAVORITE_DOCTORS,
} from "../utils/constants.js";

const SESSION_DAYS = 7;
const MAX_ACTIVE_SESSIONS = 5;
const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const cookieName = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-yektia_session"
    : "yektia_session";
const cookieOptions = () => {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
};
const isAdminEmail = (email) =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean)
    .includes(email);
const googleClient = new OAuth2Client();

export async function createSession(request, response, user) {
  const token = randomBytes(32).toString("base64url");
  const session = await Session.create({
    tokenHash: sessionHash(token),
    user: user._id,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
  });
  // Rotacion: solo quedan las sesiones activas mas recientes.
  const sessions = await Session.find({ user: user._id })
    .sort({ createdAt: -1, _id: -1 })
    .select("_id");
  const old = sessions.slice(MAX_ACTIVE_SESSIONS).map((item) => item._id);
  if (old.length) await Session.deleteMany({ _id: { $in: old } });
  response.cookie(cookieName(), token, cookieOptions());
  return session;
}

export async function googleLogin(request, response, next) {
  try {
    const credential =
      typeof request.body.credential === "string"
        ? request.body.credential.trim()
        : "";
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId)
      return response
        .status(503)
        .json({ message: "El acceso con Google no está configurado" });
    if (!credential)
      return response
        .status(400)
        .json({ message: "Falta la credencial de Google" });

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      return response
        .status(401)
        .json({ message: "La credencial de Google es inválida o venció" });
    }

    const email = normalizeEmail(payload?.email);
    const googleSub = typeof payload?.sub === "string" ? payload.sub : "";
    if (!googleSub || !validEmail(email) || payload?.email_verified !== true) {
      return response
        .status(401)
        .json({ message: "Google no confirmó este correo" });
    }

    let user = await User.findOne({ $or: [{ googleSub }, { email }] });
    let isNew = !user;
    if (!user) {
      const nombre =
        typeof payload.name === "string"
          ? payload.name.trim().slice(0, 80)
          : email.split("@")[0];
      try {
        user = await User.create({
          nombre,
          email,
          googleSub,
          role: isAdminEmail(email) ? "admin" : "patient",
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        // Otro login creo la cuenta a la vez: se usa la existente.
        user = await User.findOne({ $or: [{ googleSub }, { email }] });
        if (!user) throw error;
        isNew = false;
      }
    }
    if (!isNew) {
      if (user.googleSub && user.googleSub !== googleSub)
        return response.status(409).json({
          message: "Este correo ya está vinculado a otra cuenta de Google",
        });
      user.googleSub = googleSub;
      // El rol de admin sube y baja con ADMIN_EMAILS.
      if (isAdminEmail(email)) {
        if (user.role !== "admin") user.role = "admin";
      } else if (user.role === "admin") {
        user.role = user.doctor ? "doctor" : "patient";
      }
      if (user.isModified()) await user.save();
    }

    await createSession(request, response, user);
    return response.json({ user: user.toPublicJSON(), isNew });
  } catch (error) {
    return next(error);
  }
}

export async function me(request, response, next) {
  try {
    // Lectura sin efectos: no se toca el nombre ni se guarda nada.
    return response.json({ user: request.user?.toPublicJSON() || null });
  } catch (error) {
    return next(error);
  }
}

export function socketTicket(request, response) {
  return response.json({ ticket: createSocketTicket(request.session) });
}

export async function updateMe(request, response, next) {
  try {
    // Parcial: solo se actualizan los campos presentes en el body.
    const updates = {};
    if (typeof request.body.nombre === "string") {
      const nombre = request.body.nombre.trim();
      if (nombre.length < 2 || nombre.length > 80 || !isValidPersonName(nombre))
        return response.status(400).json({ message: "Usa un nombre válido" });
      updates.nombre = nombre;
    }
    if (typeof request.body.telefono === "string") {
      const telefono = request.body.telefono.trim();
      if (telefono && !isValidPhone(telefono))
        return response
          .status(400)
          .json({ message: "El teléfono debe tener 10 números" });
      updates.telefono = telefono;
    }
    if (request.user.role === "doctor" && updates.nombre !== undefined) {
      const doctor = await Doctor.findById(request.user.doctor).select(
        "nombre",
      );
      updates.nombre = doctor?.nombre || request.user.nombre;
    }
    Object.assign(request.user, updates);
    if (request.user.isModified()) await request.user.save();
    return response.json({ user: request.user.toPublicJSON() });
  } catch (error) {
    return next(error);
  }
}

export async function syncFavorites(request, response, next) {
  try {
    const requested = Array.isArray(request.body.doctorIds)
      ? [...new Set(request.body.doctorIds)]
          .filter((id) => mongoose.isValidObjectId(id))
          .slice(0, MAX_FAVORITE_DOCTORS)
      : [];
    const doctors = await Doctor.find({
      _id: { $in: requested },
      verificationStatus: "verified",
    }).select("_id");
    request.user.favoriteDoctors = doctors.map((doctor) => doctor._id);
    await request.user.save();
    return response.json({ user: request.user.toPublicJSON() });
  } catch (error) {
    return next(error);
  }
}

export async function logout(request, response, next) {
  try {
    if (request.body?.all === true)
      await Session.deleteMany({ user: request.user._id });
    else if (request.sessionId)
      await Session.deleteOne({ _id: request.sessionId });
    response.clearCookie(cookieName(), {
      ...cookieOptions(),
      maxAge: undefined,
    });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
}
