import { apiRequest, apiRequestBlob } from "./apiConfig";
import { doctorsApi } from "./doctorsApi";

function upload(path, file) {
  return apiRequest(path, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
}

export const accountApi = {
  googleLogin: (credential) =>
    apiRequest("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
  me: () => apiRequest("/auth/me"),
  socketTicket: () => apiRequest("/auth/socket-ticket", { method: "POST" }),
  updateMe: (payload) =>
    apiRequest("/auth/me", { method: "PATCH", body: JSON.stringify(payload) }),
  syncFavorites: (doctorIds) =>
    apiRequest("/auth/me/favorites", {
      method: "PUT",
      body: JSON.stringify({ doctorIds }),
    }),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  slots: (doctorId) => apiRequest(`/appointments/availability/${doctorId}`),
  mySchedule: () => apiRequest("/appointments/schedule/me"),
  updateSchedule: (payload) =>
    apiRequest("/appointments/schedule/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  appointments: () => apiRequest("/appointments"),
  createAppointment: (payload) =>
    apiRequest("/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAppointment: (id, status) =>
    apiRequest(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  // Mismo perfil que doctorsApi.get: una sola llamada para el mismo dato.
  doctorProfile: (id) => doctorsApi.get(id),
  updateDoctorProfile: (payload) =>
    apiRequest("/medicos/me/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  myMedicalApplication: () => apiRequest("/medical-applications/me"),
  saveMedicalApplication: (payload) =>
    apiRequest("/medical-applications/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  uploadMedicalDocument: (type, file) =>
    upload(`/medical-applications/me/documents/${type}`, file),
  deleteMedicalDocument: (type) =>
    apiRequest(`/medical-applications/me/documents/${type}`, {
      method: "DELETE",
    }),
  discardMedicalApplication: () =>
    apiRequest("/medical-applications/me", { method: "DELETE" }),
  submitMedicalApplication: () =>
    apiRequest("/medical-applications/me/submit", { method: "POST" }),
  medicalApplications: () => apiRequest("/medical-applications"),
  reviewMedicalApplication: (id, payload) =>
    apiRequest(`/medical-applications/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteMedicalApplication: (id) =>
    apiRequest(`/medical-applications/${id}`, { method: "DELETE" }),
  withdrawDoctor: (id, note) =>
    apiRequest(`/medical-applications/${id}/doctor`, {
      method: "DELETE",
      body: JSON.stringify({ note }),
    }),
  eraseDoctorData: (id, confirmation) =>
    apiRequest(`/medical-applications/${id}/personal-data`, {
      method: "DELETE",
      body: JSON.stringify({ confirmation }),
    }),
  applicationAudit: (id) => apiRequest(`/medical-applications/${id}/audit`),
  openMedicalDocument: async (applicationId, documentId) => {
    const blob = await apiRequestBlob(
      `/medical-applications/${applicationId}/documents/${documentId}`,
    );
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
