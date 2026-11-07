// Citas huérfanas: citas cuyo médico ya no existe o cuyo perfil fue
// retirado del directorio (verificationStatus "removed"). El paciente las
// sigue viendo como "Profesional retirado" sin poder hacer nada con ellas.
//
// Uso (con MONGO_URI en backend/.env):
//   cd backend
//   npm run clean:orphans            # solo lista las huérfanas
//   npm run clean:orphans -- --borrar  # las borra junto con su hueco
//
// Sin --borrar no se borra nada.
import "dotenv/config";
import mongoose from "mongoose";
import { Appointment } from "../src/models/Appointment.js";
import { AvailabilitySlot } from "../src/models/AvailabilitySlot.js";
import { Doctor } from "../src/models/Doctor.js";
import { User } from "../src/models/User.js";

// Los imports de Doctor y User solo registran los modelos para el populate.
void Doctor;
void User;

const shouldDelete = process.argv.includes("--borrar");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("Falta la variable MONGO_URI en backend/.env");
  await mongoose.connect(uri);

  const appointments = await Appointment.find({})
    .populate({ path: "doctor", select: "nombre verificationStatus" })
    .populate({ path: "patient", select: "nombre email" })
    .sort({ createdAt: -1 });
  const orphans = appointments.filter(
    (appointment) =>
      !appointment.doctor ||
      appointment.doctor.verificationStatus === "removed",
  );

  if (!orphans.length) {
    console.log("No hay citas huérfanas.");
    return;
  }
  console.log(`Citas huérfanas: ${orphans.length}`);
  for (const appointment of orphans) {
    const doctorName =
      appointment.doctor?.nombre || "médico eliminado de la base";
    const patientName =
      appointment.patient?.nombre ||
      appointment.patient?.email ||
      "paciente desconocido";
    console.log(
      `- ${appointment._id} | ${patientName} | ${doctorName} | ${appointment.status} | ${appointment.slot}`,
    );
  }

  if (!shouldDelete) {
    console.log(
      "No se borró nada. Para borrarlas, corre el script con --borrar.",
    );
    return;
  }

  let slotsDeleted = 0;
  for (const appointment of orphans) {
    if (appointment.slot) {
      const result = await AvailabilitySlot.deleteOne({
        _id: appointment.slot,
      });
      slotsDeleted += result.deletedCount || 0;
    }
    await Appointment.deleteOne({ _id: appointment._id });
  }
  console.log(
    `Borradas ${orphans.length} citas huérfanas y ${slotsDeleted} huecos.`,
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
