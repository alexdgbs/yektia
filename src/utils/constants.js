// Las constantes viven en shared/ para que el backend use las mismas.
export {
  APPOINTMENT_DURATIONS,
  isValidAppointmentDuration,
  isValidPersonName,
  isValidPhone,
  isValidTimezoneOffset,
  JSON_BODY_LIMIT,
  MAX_CONSULTATION_PRICE,
  MAX_DOCUMENT_BYTES,
  MAX_FAVORITE_DOCTORS,
  MEXICO_CITY_OFFSET_MINUTES,
  PERSON_NAME_PATTERN,
  PHONE_PATTERN,
  TIME_PATTERN,
  TIMEZONE_OFFSET_MAX_MINUTES,
  TIMEZONE_OFFSET_MIN_MINUTES,
  timeToMinutes,
} from "../../shared/index.js";
