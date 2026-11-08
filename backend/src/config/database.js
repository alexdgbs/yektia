import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";

// Migración puntual: el índice único viejo de slot impedía reservar dos
// citas distintas. Una vez aplicada queda registrada y no vuelve a correr.
const MIGRATION_ID = "appointment-slot-index-v1";

async function migrateAppointmentIndexes() {
  const migrations = mongoose.connection.db.collection("migrations");
  if (await migrations.findOne({ _id: MIGRATION_ID })) return;
  let indexes;
  try {
    indexes = await Appointment.collection.indexes();
  } catch (error) {
    if (error?.codeName === "NamespaceNotFound") return;
    throw error;
  }
  const slotIndex = indexes.find((index) => index.name === "slot_1");
  if (slotIndex?.unique) {
    await Appointment.collection.dropIndex("slot_1");
    await Appointment.collection.createIndex({ slot: 1 }, { name: "slot_1" });
  }
  try {
    await migrations.insertOne({
      _id: MIGRATION_ID,
      appliedAt: new Date(),
    });
  } catch (error) {
    // Otro proceso aplicó la migración a la vez: ya quedó registrada.
    if (error?.code !== 11000) throw error;
  }
}

export async function connectDatabase(uri) {
  if (!uri) throw new Error("Falta la variable MONGO_URI en backend/.env");
  await mongoose.connect(uri);
  await migrateAppointmentIndexes();
  console.log("Base de datos conectada");
}
