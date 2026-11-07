import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";

export const sessionTokenFromCookie = (header = "") => {
  const cookies = Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
  return (
    cookies["__Host-yektia_session"] ||
    cookies.yektia_session ||
    // Keep active sessions created before the Yektia rebrand valid until they expire.
    cookies["__Host-caresync_session"] ||
    cookies.caresync_session ||
    ""
  );
};
export const sessionHash = (token) =>
  createHash("sha256").update(token).digest("hex");

export function createSocketTicket(session) {
  const payload = Buffer.from(
    JSON.stringify({ sid: session.id, exp: Date.now() + 60_000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", session.tokenHash)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function socketTicketSessionId(ticket = "") {
  try {
    const [payload] = ticket.split(".");
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof parsed.sid === "string" ? parsed.sid : "";
  } catch {
    return "";
  }
}

export function verifySocketTicket(ticket, session) {
  try {
    const [payload, suppliedSignature, extra] = ticket.split(".");
    if (!payload || !suppliedSignature || extra) return false;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (
      parsed.sid !== session.id ||
      !Number.isFinite(parsed.exp) ||
      parsed.exp <= Date.now() ||
      parsed.exp > Date.now() + 65_000
    )
      return false;
    const expected = Buffer.from(
      createHmac("sha256", session.tokenHash)
        .update(payload)
        .digest("base64url"),
    );
    const supplied = Buffer.from(suppliedSignature);
    return (
      expected.length === supplied.length && timingSafeEqual(expected, supplied)
    );
  } catch {
    return false;
  }
}

export async function requireAuth(request, response, next) {
  try {
    const token = sessionTokenFromCookie(request.get("cookie"));
    if (!token)
      return response.status(401).json({
        message: "Inicia sesión para continuar",
        requestId: request.id,
      });
    const session = await Session.findOne({
      tokenHash: sessionHash(token),
      expiresAt: { $gt: new Date() },
    });
    if (!session)
      return response
        .status(401)
        .json({ message: "Sesión inválida", requestId: request.id });
    const user = await User.findById(session.user);
    if (!user)
      return response
        .status(401)
        .json({ message: "Sesión inválida", requestId: request.id });
    request.user = user;
    request.sessionId = session._id;
    request.session = session;
    if (Date.now() - session.lastSeenAt.getTime() > 5 * 60_000)
      Session.updateOne({ _id: session._id }, { lastSeenAt: new Date() }).catch(
        () => {},
      );
    return next();
  } catch {
    return response
      .status(401)
      .json({ message: "Sesión vencida o inválida", requestId: request.id });
  }
}

export async function optionalAuth(request, _response, next) {
  try {
    const token = sessionTokenFromCookie(request.get("cookie"));
    if (!token) return next();
    const session = await Session.findOne({
      tokenHash: sessionHash(token),
      expiresAt: { $gt: new Date() },
    });
    if (!session) return next();
    const user = await User.findById(session.user);
    if (user) {
      request.user = user;
      request.sessionId = session._id;
    }
    return next();
  } catch {
    return next();
  }
}

export const requireRole =
  (...roles) =>
  (request, response, next) =>
    roles.includes(request.user?.role)
      ? next()
      : response.status(403).json({
          message: "No tienes permiso para realizar esta acción",
          requestId: request.id,
        });
