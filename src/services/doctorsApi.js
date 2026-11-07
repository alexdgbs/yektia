import { apiRequest } from "./apiConfig";

export const doctorsApi = {
  list: () => apiRequest("/medicos"),
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
