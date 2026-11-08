// Patrones de formulario compartidos: el mismo patrón en todos los
// formularios, para que un cambio no se quede a medias en uno solo.
export const NAME_PATTERN = "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.' -]+";
export const NAME_TITLE = "Usa únicamente letras";
export const PHONE_PATTERN = "[0-9]{10}";
export const PHONE_TITLE = "Ingresa exactamente 10 números, sin espacios";
export const LICENSE_PATTERN = "[0-9]+";
export const LICENSE_TITLE = "Usa únicamente números";
export const SPECIALTY_PATTERN = "[^0-9]+";
export const SPECIALTY_TITLE = "La especialidad no puede contener números";
export const OPTIONAL_LICENSE_PATTERN = "[0-9]*";

// Solo dígitos, recortado a 10: lo que escriben los campos de teléfono.
export const digitsOnly = (value = "") =>
  String(value).replace(/\D/g, "").slice(0, 10);
