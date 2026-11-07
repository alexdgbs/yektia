import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-dist";
import express from "express";
import { randomUUID } from "node:crypto";
import { doctorsRouter } from "./routes/doctorsRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { appointmentsRouter } from "./routes/appointmentsRoutes.js";
import { medicalApplicationsRouter } from "./routes/medicalApplicationsRoutes.js";
import { openapi } from "./openapi.js";

export function createApp({ frontendUrls, io }) {
  const app = express();
  app.set("io", io);
  app.set("trust proxy", 1);
  app.use(
    helmet({
      strictTransportSecurity:
        process.env.NODE_ENV === "production" ? undefined : false,
      contentSecurityPolicy: {
        directives: {
          "upgrade-insecure-requests":
            process.env.NODE_ENV === "production" ? [] : null,
        },
      },
    }),
  );
  app.use((request, response, next) => {
    request.id = request.get("x-request-id") || randomUUID();
    response.set("x-request-id", request.id);
    next();
  });
  const allowedOrigins = new Set(frontendUrls);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin.replace(/[\\/]+$/, "")))
          return callback(null, true);
        return callback(null, false);
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "X-File-Name", "X-Request-Id"],
      credentials: true,
    }),
  );
  app.use((request, response, next) => {
    const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(
      request.method,
    );
    const usesSession = /(?:^|;\s*)(?:__Host-)?(?:yektia|caresync)_session=/.test(
      request.get("cookie") || "",
    );
    if (!mutating || !usesSession) return next();
    const origin = request.get("origin")?.replace(/[\\/]+$/, "");
    if (origin && allowedOrigins.has(origin)) return next();
    return response.status(403).json({
      message: "Origen de solicitud no autorizado",
      requestId: request.id,
    });
  });
  app.use(express.json({ limit: "32kb" }));
  app.get("/api/health", (_request, response) =>
    response.json({ status: "ok", service: "yektia-api" }),
  );
  app.get("/api/openapi.json", (_request, response) => response.json(openapi));
  app.get("/api/docs", (_request, response) =>
    response
      .type("html")
      .send(
        '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Yektia API</title><link rel="stylesheet" href="/api/docs/assets/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="/api/docs/assets/swagger-ui-bundle.js"></script><script src="/api/docs/init.js"></script></body></html>',
      ),
  );
  app.get("/api/docs/init.js", (_request, response) =>
    response
      .type("js")
      .send(
        'SwaggerUIBundle({url:"/api/openapi.json",dom_id:"#swagger-ui",supportedSubmitMethods:[],validatorUrl:null});',
      ),
  );
  app.use(
    "/api/docs/assets",
    express.static(swaggerUi.getAbsoluteFSPath(), { index: false }),
  );
  app.use("/api/auth", authRouter);
  app.use("/api/appointments", appointmentsRouter);
  app.use("/api/medical-applications", medicalApplicationsRouter);
  app.use("/api/medicos", doctorsRouter);
  app.use((request, response) =>
    response
      .status(404)
      .json({ message: "Ruta no encontrada", requestId: request.id }),
  );
  app.use((error, request, response, _next) => {
    console.error(request.id, error);
    if (error?.type === "entity.too.large")
      return response.status(413).json({
        message: "El archivo supera el límite de 5 MB",
        requestId: request.id,
      });
    return response
      .status(500)
      .json({ message: "Error interno del servidor", requestId: request.id });
  });
  return app;
}
