export const date = (value) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const APPOINTMENT = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
};
export const APPLICATION = {
  draft: "Borrador",
  submitted: "En revisión",
  changes_requested: "Requiere cambios",
  approved: "Aprobada",
  rejected: "Rechazada",
  withdrawn: "Retirada",
};
export const DOCUMENTS = [
  { type: "identity", label: "Identificación oficial" },
  { type: "professional_license", label: "Cédula profesional" },
  {
    type: "specialty_license",
    label: "Cédula de especialidad",
    optional: true,
  },
];
