export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Yektia API",
    version: "1.1.0",
    description: "API de directorio, verificación profesional y citas médicas",
  },
  servers: [{ url: "/api" }],
  security: [{ session: [] }],
  components: {
    securitySchemes: {
      session: {
        type: "apiKey",
        in: "cookie",
        name: "__Host-yektia_session",
        description:
          "Cookie HttpOnly; en desarrollo se llama yektia_session. Las mutaciones con sesión requieren Origin autorizado.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string" },
          requestId: { type: "string" },
        },
      },
      Slot: {
        type: "object",
        properties: {
          _id: { type: "string" },
          startsAt: { type: "string", format: "date-time" },
          endsAt: { type: "string", format: "date-time" },
          status: { enum: ["open", "booked"] },
        },
      },
      Appointment: {
        type: "object",
        properties: {
          id: { type: "string" },
          reason: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          status: { enum: ["pending", "confirmed", "cancelled", "completed"] },
          doctor: {
            type: ["object", "null"],
            properties: {
              _id: { type: "string" },
              nombre: { type: "string" },
              especialidad: { type: "string" },
            },
          },
          patient: {
            type: ["object", "null"],
            properties: {
              _id: { type: "string" },
              nombre: { type: "string" },
              email: { type: "string", format: "email" },
            },
          },
          slot: {
            oneOf: [{ $ref: "#/components/schemas/Slot" }, { type: "null" }],
          },
        },
      },
      Schedule: {
        type: "object",
        required: ["duration", "timezoneOffset", "rules"],
        properties: {
          duration: { enum: [15, 30, 45, 60, 90] },
          timezoneOffset: { type: "integer", minimum: -720, maximum: 840 },
          rules: {
            type: "array",
            minItems: 1,
            maxItems: 7,
            description: "Días consecutivos con el mismo rango horario",
            items: {
              type: "object",
              required: ["day", "start", "end"],
              properties: {
                day: { type: "integer", minimum: 0, maximum: 6 },
                start: { type: "string", example: "09:00" },
                end: { type: "string", example: "14:00" },
              },
            },
          },
          blockedDates: {
            type: "array",
            items: { type: "string", format: "date" },
          },
        },
      },
      MedicalApplicationInput: {
        type: "object",
        required: ["legalName", "professionalLicense", "specialty"],
        properties: {
          legalName: { type: "string", maxLength: 120 },
          professionalLicense: { type: "string", pattern: "^[0-9]+$" },
          specialty: { type: "string", maxLength: 100 },
          specialtyLicense: { type: "string" },
          phone: { type: "string" },
          location: { type: "string", maxLength: 160 },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Estado del servicio",
        responses: { 200: { description: "Servicio disponible" } },
      },
    },
    "/medicos": {
      get: {
        summary: "Lista especialistas verificados",
        responses: { 200: { description: "Directorio disponible" } },
      },
    },
    "/medicos/{id}": {
      get: {
        summary: "Obtiene un especialista",
        responses: {
          200: { description: "Perfil encontrado" },
          404: { description: "Perfil inexistente" },
        },
      },
    },
    "/medicos/{id}/valorar": {
      post: {
        summary: "Valora después de una cita completada",
        responses: {
          200: { description: "Valoración guardada" },
          403: { description: "Cita completada requerida" },
        },
      },
    },
    "/medicos/{id}/comentarios/{commentId}": {
      patch: {
        summary: "Edita el comentario de la cuenta autenticada",
        responses: {
          200: { description: "Comentario actualizado" },
          403: { description: "Autor requerido" },
        },
      },
      delete: {
        summary: "Elimina el comentario de la cuenta autenticada",
        responses: {
          204: { description: "Comentario eliminado" },
          403: { description: "Autor requerido" },
        },
      },
    },
    "/medicos/me/profile": {
      patch: {
        summary:
          "Actualiza la información pública del perfil médico verificado",
        responses: {
          200: { description: "Perfil actualizado" },
          403: { description: "Rol médico requerido" },
        },
      },
    },
    "/auth/me": {
      patch: {
        summary: "Actualiza los datos de la cuenta autenticada",
        responses: {
          200: { description: "Cuenta actualizada" },
          401: { description: "Sesión requerida" },
        },
      },
    },
    "/auth/google": {
      post: {
        summary: "Valida una credencial de Google y crea una sesión segura",
        responses: {
          200: { description: "Sesión iniciada" },
          401: { description: "Credencial inválida" },
        },
      },
    },
    "/appointments": {
      get: {
        summary: "Separa consultas personales y citas de la práctica médica",
        responses: { 200: { description: "Listas personal y practice" } },
      },
      post: {
        summary: "Solicita una cita como paciente o médico",
        responses: {
          201: { description: "Solicitud creada" },
          400: { description: "No se permite agendar consigo mismo" },
          409: { description: "Horario ocupado" },
        },
      },
    },
    "/appointments/schedule/me": {
      get: {
        summary: "Consulta la agenda semanal del médico",
        responses: { 200: { description: "Agenda configurada" } },
      },
      put: {
        summary: "Actualiza reglas semanales, duración y fechas bloqueadas",
        responses: {
          200: { description: "Agenda actualizada" },
          400: { description: "Reglas inválidas" },
          409: { description: "La agenda dejaría fuera citas activas" },
        },
      },
    },
    "/medical-applications/me": {
      get: {
        summary: "Consulta la solicitud médica de la cuenta",
        responses: { 200: { description: "Solicitud actual" } },
      },
      put: {
        summary: "Guarda una solicitud médica",
        responses: { 200: { description: "Borrador guardado" } },
      },
    },
    "/medical-applications/me/submit": {
      post: {
        summary: "Envía una solicitud médica a revisión",
        responses: {
          200: { description: "Solicitud enviada" },
          400: { description: "Faltan documentos" },
        },
      },
    },
    "/medical-applications": {
      get: {
        summary: "Lista solicitudes para revisión administrativa",
        responses: {
          200: { description: "Solicitudes disponibles" },
          403: { description: "Rol administrativo requerido" },
        },
      },
    },
    "/medical-applications/{id}/review": {
      patch: {
        summary: "Registra una decisión administrativa",
        responses: {
          200: { description: "Decisión registrada" },
          409: { description: "Solicitud no revisable" },
        },
      },
    },
    "/medical-applications/{id}": {
      delete: {
        summary: "Elimina una solicitud rechazada, sus documentos y auditoría",
        responses: {
          204: { description: "Solicitud eliminada" },
          409: { description: "La solicitud no está rechazada" },
        },
      },
    },
    "/medical-applications/{id}/doctor": {
      delete: {
        summary:
          "Retira un perfil médico activo del directorio y cancela su agenda futura",
        responses: {
          200: { description: "Perfil retirado" },
          409: { description: "El perfil no está activo" },
        },
      },
    },
    "/medical-applications/{id}/personal-data": {
      delete: {
        summary:
          "Elimina irreversiblemente los datos profesionales tras retirar el perfil",
        responses: {
          204: {
            description:
              "Datos eliminados; referencias históricas anonimizadas",
          },
          400: { description: "Confirmación requerida" },
          409: { description: "Primero debe retirarse el perfil" },
        },
      },
    },
  },
};

const jsonBody = (schema) => ({
  required: true,
  content: { "application/json": { schema } },
});
const jsonResponse = (description, schema) => ({
  description,
  content: { "application/json": { schema } },
});
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
for (const [path, item] of Object.entries(openapi.paths)) {
  const names = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (names.length)
    item.parameters = names.map((name) => ({
      name,
      in: "path",
      required: true,
      schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
    }));
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const operation = item[method];
    if (!operation) continue;
    const publicRoute =
      path === "/health" ||
      path === "/auth/google" ||
      (method === "get" && path.startsWith("/medicos"));
    if (publicRoute) operation.security = [];
    else
      operation.responses[401] = jsonResponse("Sesión requerida", ref("Error"));
    for (const status of Object.keys(operation.responses))
      if (Number(status) >= 400)
        operation.responses[status] = jsonResponse(
          operation.responses[status].description,
          ref("Error"),
        );
  }
}
openapi.paths["/auth/google"].post.requestBody = jsonBody({
  type: "object",
  required: ["credential"],
  properties: { credential: { type: "string" } },
});
openapi.paths["/auth/logout"] = {
  post: {
    summary: "Invalida la sesión actual y borra la cookie",
    responses: {
      204: { description: "Sesión cerrada" },
      401: jsonResponse("Sesión requerida", ref("Error")),
    },
  },
};
openapi.paths["/appointments"].post.requestBody = jsonBody({
  type: "object",
  required: ["slotId"],
  properties: {
    slotId: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
    reason: { type: "string", maxLength: 300 },
  },
});
openapi.paths["/appointments"].post.responses[201] = jsonResponse(
  "Cita reservada de forma transaccional",
  ref("Appointment"),
);
openapi.paths["/appointments"].post.responses[503] = jsonResponse(
  "MongoDB requiere replica set para reservar",
  ref("Error"),
);
openapi.paths["/appointments"].get.responses[200] = jsonResponse(
  "Consultas personales y de la práctica",
  {
    type: "object",
    properties: {
      personal: { type: "array", items: ref("Appointment") },
      practice: { type: "array", items: ref("Appointment") },
    },
  },
);
openapi.paths["/appointments/{id}"] = {
  parameters: [
    { name: "id", in: "path", required: true, schema: { type: "string" } },
  ],
  patch: {
    summary: "Confirma, cancela o completa una cita",
    description:
      "Confirmar y completar requieren al médico tratante. El paciente puede cancelar hasta 24 horas antes. Solo puede completarse después de terminar.",
    requestBody: jsonBody({
      type: "object",
      required: ["status"],
      properties: { status: { enum: ["confirmed", "cancelled", "completed"] } },
    }),
    responses: {
      200: jsonResponse("Cita actualizada", ref("Appointment")),
      400: jsonResponse("Transición inválida", ref("Error")),
      401: jsonResponse("Sesión requerida", ref("Error")),
      404: jsonResponse("Cita no encontrada", ref("Error")),
      409: jsonResponse("Restricción temporal", ref("Error")),
    },
  },
};
openapi.paths["/appointments/availability/{doctorId}"] = {
  parameters: [
    {
      name: "doctorId",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  get: {
    security: [],
    summary: "Horarios futuros del especialista",
    responses: {
      200: jsonResponse("Horarios disponibles y reservados", {
        type: "array",
        items: ref("Slot"),
      }),
      404: jsonResponse("Especialista no encontrado", ref("Error")),
    },
  },
};
openapi.paths["/appointments/schedule/me"].put.requestBody = jsonBody(
  ref("Schedule"),
);
for (const method of ["get", "put"])
  openapi.paths["/appointments/schedule/me"][method].responses[200] =
    jsonResponse("Agenda del médico", ref("Schedule"));
openapi.paths["/medical-applications/me"].put.requestBody = jsonBody(
  ref("MedicalApplicationInput"),
);
openapi.paths["/medical-applications/{id}/review"].patch.requestBody = jsonBody(
  {
    type: "object",
    required: ["status"],
    properties: {
      status: { enum: ["approved", "rejected", "changes_requested"] },
      reviewNote: {
        type: "string",
        maxLength: 1000,
        description: "Obligatoria al rechazar o pedir cambios",
      },
    },
  },
);
openapi.paths["/medical-applications/me/documents/{type}"] = {
  parameters: [
    {
      name: "type",
      in: "path",
      required: true,
      schema: {
        enum: ["identity", "professional_license", "specialty_license"],
      },
    },
  ],
  put: {
    summary: "Carga un documento privado de hasta 5 MB",
    description:
      "Paciente con solicitud editable. Se comprueba MIME y firma binaria; el cuerpo es el archivo, sin multipart.",
    parameters: [
      { name: "X-File-Name", in: "header", schema: { type: "string" } },
    ],
    requestBody: {
      required: true,
      content: Object.fromEntries(
        ["application/pdf", "image/jpeg", "image/png"].map((mime) => [
          mime,
          { schema: { type: "string", format: "binary" } },
        ]),
      ),
    },
    responses: {
      200: { description: "Documento guardado" },
      400: jsonResponse("Tipo o firma inválidos", ref("Error")),
      401: jsonResponse("Sesión requerida", ref("Error")),
      403: jsonResponse("Rol paciente requerido", ref("Error")),
      409: jsonResponse("Solicitud no editable", ref("Error")),
      413: jsonResponse("Supera 5 MB", ref("Error")),
    },
  },
};
openapi.paths["/medical-applications/{id}/documents/{documentId}"] = {
  parameters: ["id", "documentId"].map((name) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
  })),
  get: {
    summary: "Descarga privada exclusiva para administradores",
    responses: {
      200: {
        description: "Documento sin caché",
        content: Object.fromEntries(
          ["application/pdf", "image/jpeg", "image/png"].map((mime) => [
            mime,
            { schema: { type: "string", format: "binary" } },
          ]),
        ),
      },
      401: jsonResponse("Sesión requerida", ref("Error")),
      403: jsonResponse("Rol administrador requerido", ref("Error")),
      404: jsonResponse("Documento no encontrado", ref("Error")),
    },
  },
};
