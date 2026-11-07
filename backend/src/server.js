import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import {
  sessionHash,
  sessionTokenFromCookie,
  socketTicketSessionId,
  verifySocketTicket,
} from "./middleware/auth.js";
import { Session } from "./models/Session.js";

const port = Number(process.env.PORT) || 5000;
const frontendUrls = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim().replace(/[\\/]+$/, ""))
  .filter(Boolean);
if (
  process.env.NODE_ENV === "production" &&
  (!process.env.MONGO_URI ||
    !process.env.FRONTEND_URL ||
    !process.env.GOOGLE_CLIENT_ID)
) {
  throw new Error(
    "Producción requiere MONGO_URI, FRONTEND_URL y GOOGLE_CLIENT_ID",
  );
}
const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: { origin: frontendUrls, methods: ["GET", "POST"], credentials: true },
});
io.use(async (socket, next) => {
  const token = sessionTokenFromCookie(socket.handshake.headers.cookie);
  try {
    const ticket = socket.handshake.auth?.ticket;
    const ticketSessionId = socketTicketSessionId(ticket);
    const session = ticketSessionId
      ? await Session.findOne({
          _id: ticketSessionId,
          expiresAt: { $gt: new Date() },
        })
      : token
        ? await Session.findOne({
            tokenHash: sessionHash(token),
            expiresAt: { $gt: new Date() },
          })
        : null;
    if (ticketSessionId && (!session || !verifySocketTicket(ticket, session)))
      return next(new Error("Credencial de tiempo real inválida"));
    if (session) socket.user = { sub: session.user.toString() };
    return next();
  } catch {
    return next(new Error("Sesión inválida"));
  }
});
io.on("connection", (socket) => {
  if (socket.user?.sub) socket.join(`user:${socket.user.sub}`);
});
httpServer.on("request", createApp({ frontendUrls, io }));

try {
  await connectDatabase(process.env.MONGO_URI);
  httpServer.listen(port, () =>
    console.log(`Yektia API disponible en http://localhost:${port}`),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
