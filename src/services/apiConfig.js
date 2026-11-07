const configuredRestUrl = import.meta.env.VITE_API_REST?.trim().replace(
  /\/+$/,
  "",
);

const configuredApiUrl = configuredRestUrl
  ? configuredRestUrl.endsWith("/api")
    ? configuredRestUrl
    : `${configuredRestUrl}/api`
  : "";

export const API_URL = configuredApiUrl || (import.meta.env.PROD ? "/api" : "");

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL?.trim().replace(/\/+$/, "") ||
  configuredApiUrl.replace(/\/api$/, "");

async function parseResponse(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (error) {
      console.warn("La respuesta no era JSON válido.", error);
      return null;
    }
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

export async function apiRequest(path, options = {}) {
  if (!API_URL) {
    const error = new Error(
      "Configura VITE_API_REST con la URL pública del backend de Yektia.",
    );
    error.code = "API_NOT_CONFIGURED";
    throw error;
  }

  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(options.body && !isFormData
      ? { "Content-Type": "application/json" }
      : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (error) {
    throw new Error("No fue posible conectar con Yektia. Intenta de nuevo.", {
      cause: error,
    });
  }

  const body = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(body?.message || `HTTP_${response.status}`);
    error.code = body?.code;
    error.status = response.status;
    throw error;
  }

  return body;
}
