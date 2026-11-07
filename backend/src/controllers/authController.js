import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { Doctor } from "../models/Doctor.js";
import { createSocketTicket } from "../middleware/auth.js";

const SESSION_DAYS = 7;
const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const hashToken = (value) => createHash("sha256").update(value).digest("hex");
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

async function createSession(request, response, user) {
  const token = randomBytes(32).toString("base64url");
  await Session.create({
    tokenHash: hashToken(token),
    user: user._id,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
  });
  response.cookie(cookieName(), token, cookieOptions());
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
    const isNew = !user;
    if (!user) {
      const nombre =
        typeof payload.name === "string"
          ? payload.name.trim().slice(0, 80)
          : email.split("@")[0];
      user = await User.create({
        nombre,
        email,
        googleSub,
        role: isAdminEmail(email) ? "admin" : "patient",
        emailVerifiedAt: new Date(),
      });
    } else {
      if (user.googleSub && user.googleSub !== googleSub)
        return response.status(409).json({
          message: "Este correo ya está vinculado a otra cuenta de Google",
        });
      user.googleSub = googleSub;
      if (!user.emailVerifiedAt) user.emailVerifiedAt = new Date();
      if (isAdminEmail(email) && user.role !== "admin") user.role = "admin";
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
    if (request.user?.role === "doctor" && request.user.doctor) {
      const doctor = await Doctor.findById(request.user.doctor).select(
        "nombre",
      );
      if (doctor?.nombre && request.user.nombre !== doctor.nombre) {
        request.user.nombre = doctor.nombre;
        await request.user.save();
      }
    }
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
    const nombre =
      typeof request.body.nombre === "string" ? request.body.nombre.trim() : "";
    const telefono =
      typeof request.body.telefono === "string"
        ? request.body.telefono.trim()
        : "";
    if (
      nombre.length < 2 ||
      nombre.length > 80 ||
      !/^[\p{L}\p{M}.' -]+$/u.test(nombre) ||
      (telefono && !/^\d{10}$/.test(telefono))
    )
      return response
        .status(400)
        .json({ message: "Usa un nombre válido y un teléfono de 10 números" });
    if (request.user.role === "doctor") {
      const doctor = await Doctor.findById(request.user.doctor).select(
        "nombre",
      );
      request.user.nombre = doctor?.nombre || request.user.nombre;
    } else request.user.nombre = nombre;
    request.user.telefono = telefono;
    await request.user.save();
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
          .slice(0, 100)
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
    if (request.sessionId) await Session.deleteOne({ _id: request.sessionId });
    response.clearCookie(cookieName(), {
      ...cookieOptions(),
      maxAge: undefined,
    });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
}
