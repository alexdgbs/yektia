import { apiRequest } from "./apiConfig";

export const doctorsApi = {
  list: (params = {}) => {
    const search = new URLSearchParams();
    if (params.q?.trim()) search.set("q", params.q.trim());
    if (params.especialidad?.trim())
      search.set("especialidad", params.especialidad.trim());
    const query = search.toString();
    return apiRequest(query ? `/medicos?${query}` : "/medicos");
  },
  get: (doctorId) => apiRequest(`/medicos/${encodeURIComponent(doctorId)}`),
  rate: (doctorId, payload) =>
    apiRequest(`/medicos/${doctorId}/valorar`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  removeRating: (doctorId) =>
    apiRequest(`/medicos/${doctorId}/valorar`, { method: "DELETE" }),
  comment: (doctorId, payload) =>
    apiRequest(`/medicos/${doctorId}/comentar`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateComment: (doctorId, commentId, payload) =>
    apiRequest(`/medicos/${doctorId}/comentarios/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteComment: (doctorId, commentId) =>
    apiRequest(`/medicos/${doctorId}/comentarios/${commentId}`, {
      method: "DELETE",
    }),
};
