// Doctores de ejemplo para el directorio. Uso: cd backend && npm run seed:doctors
// Si el doctor ya existe, solo completa lo que le falte: nunca reescribe sus
// datos reales (teléfono, descripción, precio, horario o verificación). Si
// corres el seed dos veces, la segunda no cambia nada. Los datos son
// inventados para la demostración, no corresponden a médicos reales.
import "dotenv/config";
import mongoose from "mongoose";
import { Doctor } from "../src/models/Doctor.js";
import { MEXICO_CITY_OFFSET_MINUTES } from "../src/utils/constants.js";

const WEEKDAYS = [
  { day: 1, start: "09:00", end: "18:00" },
  { day: 2, start: "09:00", end: "18:00" },
  { day: 3, start: "09:00", end: "18:00" },
  { day: 4, start: "09:00", end: "18:00" },
  { day: 5, start: "09:00", end: "14:00" },
];

const EXAMPLE_DOCTORS = [
  {
    // Perfil real de la doctora del proyecto: se completa si ya existe.
    nombre: "Mariana Torres",
    especialidad: "Medicina General",
    descripcion:
      "Médica general con atención en salud preventiva, seguimiento de enfermedades comunes y orientación para toda la familia.",
    cedula: "006210025",
    ubicacion: "Consultorio Médico Vitala, Guadalajara, Jalisco",
    disponibilidad: "Lun a jue, 9:00–18:00; vie, 9:00–14:00",
    precio: "600",
    idiomas: ["Español", "Inglés"],
    seguros: [],
    verificationStatus: "verified",
    appointmentDuration: 45,
    timezoneOffset: MEXICO_CITY_OFFSET_MINUTES,
    weeklySchedule: WEEKDAYS,
  },
  {
    nombre: "Dra. Lucía Mendoza Ruiz",
    especialidad: "Pediatría",
    descripcion:
      "Pediatra con diez años de experiencia en consulta infantil. Acompaña a las familias desde el nacimiento hasta la adolescencia, con controles de crecimiento y vacunación al día.",
    cedula: "7845123",
    cedulaAnterior: "1000001",
    telefono: "3318092456",
    ubicacion: "Consultorio 204, Av. Chapultepec Sur 123, Guadalajara, Jalisco",
    disponibilidad: "Lun a jue, 9:00–18:00; vie, 9:00–14:00",
    precio: "650",
    idiomas: ["Español", "Inglés"],
    seguros: ["GNP", "AXA"],
    verificationStatus: "verified",
    appointmentDuration: 45,
    timezoneOffset: MEXICO_CITY_OFFSET_MINUTES,
    weeklySchedule: WEEKDAYS,
  },
  {
    nombre: "Dr. Carlos Hernández Vega",
    especialidad: "Cardiología",
    descripcion:
      "Cardiólogo dedicado a la prevención de enfermedades del corazón. Realiza electrocardiogramas y seguimiento de presión arterial en consulta.",
    cedula: "2390871",
    cedulaAnterior: "1000002",
    telefono: "3325670193",
    ubicacion: "Consultorio 310, Av. Américas 1500, Guadalajara, Jalisco",
    disponibilidad: "Lun a jue, 8:00–16:00; vie, 9:00–13:00",
    precio: "900",
    idiomas: ["Español"],
    seguros: ["MetLife"],
    verificationStatus: "verified",
    appointmentDuration: 30,
    timezoneOffset: MEXICO_CITY_OFFSET_MINUTES,
    weeklySchedule: [
      { day: 1, start: "08:00", end: "16:00" },
      { day: 2, start: "08:00", end: "16:00" },
      { day: 3, start: "08:00", end: "16:00" },
      { day: 4, start: "08:00", end: "16:00" },
      { day: 5, start: "09:00", end: "13:00" },
    ],
  },
  {
    nombre: "Dra. Ana Sofía Ramírez Torres",
    especialidad: "Dermatología",
    descripcion:
      "Dermatóloga con práctica en acné y revisión de lunares. Explica cada tratamiento en consulta y da seguimiento por mensaje entre visitas.",
    cedula: "5190346",
    cedulaAnterior: "1000003",
    telefono: "3334108725",
    ubicacion: "Consultorio 112, Calle Morelos 456, Guadalajara, Jalisco",
    disponibilidad: "Mar a sáb, 10:00–19:00",
    precio: "750",
    idiomas: ["Español", "Inglés"],
    seguros: [],
    verificationStatus: "verified",
    appointmentDuration: 30,
    timezoneOffset: MEXICO_CITY_OFFSET_MINUTES,
    weeklySchedule: [
      { day: 2, start: "10:00", end: "19:00" },
      { day: 3, start: "10:00", end: "19:00" },
      { day: 4, start: "10:00", end: "19:00" },
      { day: 5, start: "10:00", end: "19:00" },
      { day: 6, start: "10:00", end: "19:00" },
    ],
  },
  {
    nombre: "Dr. Jorge Luis Navarro Peña",
    especialidad: "Traumatología",
    descripcion:
      "Traumatólogo que atiende lesiones deportivas y de trabajo. Coordina la rehabilitación con fisioterapia en el mismo consultorio.",
    cedula: "9021485",
    cedulaAnterior: "1000004",
    telefono: "3312956840",
    ubicacion: "Consultorio 205, Av. Vallarta 2345, Guadalajara, Jalisco",
    disponibilidad: "Lun, mié y vie, 9:00–17:00",
    precio: "800",
    idiomas: ["Español"],
    seguros: ["GNP"],
    verificationStatus: "verified",
    appointmentDuration: 60,
    timezoneOffset: MEXICO_CITY_OFFSET_MINUTES,
    weeklySchedule: [
      { day: 1, start: "09:00", end: "17:00" },
      { day: 3, start: "09:00", end: "17:00" },
      { day: 5, start: "09:00", end: "17:00" },
    ],
  },
  {
    nombre: "Dra. María Fernanda Castillo León",
    especialidad: "Ginecología",
    descripcion:
      "Ginecóloga con enfoque en salud reproductiva y control del embarazo. Atiende en consulta privada con citas de 45 minutos sin prisas.",
    cedula: "6102759",
    cedulaAnterior: "1000005",
    telefono: "3347081239",
    ubicacion:
      "Consultorio 108, Av. López Mateos Sur 789, Guadalajara, Jalisco",
    disponibilidad: "Lun a vie, 8:30–15:30",
    precio: "700",
    idiomas: ["Español", "Inglés"],
    seguros: ["AXA", "MetLife"],
    verificationStatus: "verified",
    appointmentDuration: 45,
    timezoneOffset: MEXICO_CITY_OFFSET_MINUTES,
    weeklySchedule: WEEKDAYS.map((rule) => ({
      ...rule,
      start: "08:30",
      end: "15:30",
    })),
  },
];

// Vacío para el seed: texto en blanco, lista vacía o campo sin valor.
const isMissing = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Falta la variable MONGO_URI en backend/.env");
  await mongoose.connect(uri);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const doctor of EXAMPLE_DOCTORS) {
    const { cedulaAnterior, ...fields } = doctor;
    try {
      // Por nombre (o por la cédula anterior): así el seed actualiza en su
      // lugar a los doctores que ya existen, sin crear duplicados.
      const query = cedulaAnterior
        ? { $or: [{ nombre: fields.nombre }, { cedula: cedulaAnterior }] }
        : { nombre: fields.nombre };
      const existing = await Doctor.findOne(query);
      if (existing) {
        // Solo completa lo que falte: nunca reescribe datos reales
        // (teléfono, descripción, precio, horario o verificación).
        let touched = false;
        for (const [key, value] of Object.entries(fields)) {
          if (isMissing(existing[key])) {
            existing[key] = value;
            touched = true;
          }
        }
        if (touched) await existing.save();
        updated += 1;
      } else {
        // Otro doctor ya tiene esa cédula: se salta este y se sigue.
        const clash = fields.cedula
          ? await Doctor.findOne({ cedula: fields.cedula })
          : null;
        if (clash) {
          console.warn(
            `Sin sembrar ${fields.nombre}: su cédula ya la tiene otro doctor.`,
          );
          skipped += 1;
          continue;
        }
        await Doctor.create(fields);
        created += 1;
      }
    } catch (error) {
      // Un doctor no tumba el resto del seed (p. ej. cédula duplicada).
      console.warn(`Sin sembrar ${fields.nombre}: ${error.message}`);
      skipped += 1;
    }
  }
  console.log(
    `Doctores de ejemplo: ${created} creados, ${updated} actualizados, ${skipped} omitidos.`,
  );
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
