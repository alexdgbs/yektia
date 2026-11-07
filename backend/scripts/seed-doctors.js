// Doctores de ejemplo para el directorio de Yektia.
//
// Uso (con MONGO_URI en backend/.env):
//   cd backend
//   npm run seed:doctors
//
// No borra nada: por cada doctor de ejemplo revisa su cédula y solo lo crea
// si aún no existe. Mariana Torres (cédula 006210025) es la excepción: el
// seed completa sus datos si ya existe (descripción, precio, idiomas,
// horarios) y solo la crea si no está. Los perfiles quedan con
// verificationStatus "verified" para que aparezcan en el directorio, y los
// de ejemplo con fuente "ejemplo" para distinguirlos de los perfiles reales.
// Las cédulas y los datos de ejemplo son inventados para la demostración,
// no corresponden a médicos reales.
import "dotenv/config";
import mongoose from "mongoose";
import { Doctor } from "../src/models/Doctor.js";

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
    completar: true,
    nombre: "Mariana Torres",
    especialidad: "Medicina General",
    descripcion:
      "Médica general con atención en salud preventiva, seguimiento de enfermedades comunes y orientación para toda la familia.",
    cedula: "006210025",
    telefono: "",
    ubicacion: "Consultorio Médico Vitala, Guadalajara, Jalisco",
    disponibilidad: "Lun a vie, 9:00–18:00",
    precio: "600",
    idiomas: ["Español", "Inglés"],
    seguros: [],
    verificationStatus: "verified",
    appointmentDuration: 45,
    timezoneOffset: -360,
    weeklySchedule: WEEKDAYS,
    fuente: "",
  },
  {
    nombre: "Dra. Lucía Mendoza Ruiz",
    especialidad: "Pediatría",
    descripcion:
      "Pediatra con enfoque en el seguimiento del crecimiento y la salud preventiva de niñas y niños.",
    cedula: "1000001",
    telefono: "3312345678",
    ubicacion: "Consultorio 204, Av. Chapultepec Sur 123, Guadalajara, Jalisco",
    disponibilidad: "Lun a vie, 9:00–18:00",
    precio: "650",
    idiomas: ["Español", "Inglés"],
    seguros: ["GNP", "AXA"],
    verificationStatus: "verified",
    appointmentDuration: 45,
    timezoneOffset: -360,
    weeklySchedule: WEEKDAYS,
    fuente: "ejemplo",
  },
  {
    nombre: "Dr. Carlos Hernández Vega",
    especialidad: "Cardiología",
    descripcion:
      "Cardiólogo enfocado en la prevención y el seguimiento de enfermedades del corazón.",
    cedula: "1000002",
    telefono: "3312345679",
    ubicacion: "Consultorio 310, Av. Américas 1500, Guadalajara, Jalisco",
    disponibilidad: "Lun a vie, 9:00–18:00",
    precio: "900",
    idiomas: ["Español"],
    seguros: ["MetLife"],
    verificationStatus: "verified",
    appointmentDuration: 45,
    timezoneOffset: -360,
    weeklySchedule: WEEKDAYS,
    fuente: "ejemplo",
  },
  {
    nombre: "Dra. Ana Sofía Ramírez Torres",
    especialidad: "Dermatología",
    descripcion:
      "Dermatóloga con atención en cuidado de la piel, acné y revisión de lunares.",
    cedula: "1000003",
    telefono: "3312345680",
    ubicacion: "Consultorio 112, Calle Morelos 456, Guadalajara, Jalisco",
    disponibilidad: "Lun a vie, 10:00–18:00",
    precio: "750",
    idiomas: ["Español", "Inglés"],
    seguros: [],
    verificationStatus: "verified",
    appointmentDuration: 30,
    timezoneOffset: -360,
    weeklySchedule: WEEKDAYS.map((rule) => ({
      ...rule,
      start: "10:00",
      end: rule.day === 5 ? "14:00" : "18:00",
    })),
    fuente: "ejemplo",
  },
  {
    nombre: "Dr. Jorge Luis Navarro Peña",
    especialidad: "Traumatología",
    descripcion:
      "Traumatólogo con atención en lesiones deportivas y rehabilitación de huesos y articulaciones.",
    cedula: "1000004",
    telefono: "3312345681",
    ubicacion: "Consultorio 205, Av. Vallarta 2345, Guadalajara, Jalisco",
    disponibilidad: "Lun a vie, 9:00–17:00",
    precio: "800",
    idiomas: ["Español"],
    seguros: ["GNP"],
    verificationStatus: "verified",
    appointmentDuration: 45,
    timezoneOffset: -360,
    weeklySchedule: WEEKDAYS.map((rule) => ({
      ...rule,
      end: rule.day === 5 ? "14:00" : "17:00",
    })),
    fuente: "ejemplo",
  },
  {
    nombre: "Dra. María Fernanda Castillo León",
    especialidad: "Ginecología",
    descripcion:
      "Ginecóloga con atención en salud reproductiva y seguimiento del embarazo.",
    cedula: "1000005",
    telefono: "3312345682",
    ubicacion:
      "Consultorio 108, Av. López Mateos Sur 789, Guadalajara, Jalisco",
    disponibilidad: "Lun a vie, 9:00–18:00",
    precio: "700",
    idiomas: ["Español", "Inglés"],
    seguros: ["AXA", "MetLife"],
    verificationStatus: "verified",
    appointmentDuration: 45,
    timezoneOffset: -360,
    weeklySchedule: WEEKDAYS,
    fuente: "ejemplo",
  },
];

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Falta la variable MONGO_URI en backend/.env");
  await mongoose.connect(uri);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const doctor of EXAMPLE_DOCTORS) {
    if (doctor.completar) {
      const fields = { ...doctor };
      delete fields.completar;
      const result = await Doctor.updateOne(
        { cedula: doctor.cedula },
        {
          $set: {
            descripcion: fields.descripcion,
            precio: fields.precio,
            idiomas: fields.idiomas,
            ubicacion: fields.ubicacion,
            disponibilidad: fields.disponibilidad,
            weeklySchedule: fields.weeklySchedule,
            appointmentDuration: fields.appointmentDuration,
            timezoneOffset: fields.timezoneOffset,
            verificationStatus: fields.verificationStatus,
          },
          $setOnInsert: {
            nombre: fields.nombre,
            especialidad: fields.especialidad,
            cedula: fields.cedula,
            telefono: fields.telefono,
            seguros: fields.seguros,
            fuente: fields.fuente,
          },
        },
        { upsert: true },
      );
      if (result.upsertedCount) created += 1;
      else if (result.modifiedCount) updated += 1;
      else skipped += 1;
      continue;
    }
    const existing = await Doctor.findOne({ cedula: doctor.cedula });
    if (existing) {
      skipped += 1;
      continue;
    }
    await Doctor.create(doctor);
    created += 1;
  }
  console.log(
    `Doctores de ejemplo: ${created} creados, ${updated} actualizados, ${skipped} ya existían.`,
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
