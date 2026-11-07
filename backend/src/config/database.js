import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";

async function migrateAppointmentIndexes() {
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
}

export async function connectDatabase(uri) {
  if (!uri) throw new Error("Falta la variable MONGO_URI en backend/.env");
  await mongoose.connect(uri);
  await migrateAppointmentIndexes();
  console.log("Base de datos conectada");
}
