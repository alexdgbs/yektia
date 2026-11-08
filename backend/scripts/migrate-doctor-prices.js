// Migra los precios de medico guardados como texto a numero (una sola vez).
// Uso: MONGO_URI=... node scripts/migrate-doctor-prices.js
import "dotenv/config";
import mongoose from "mongoose";
import { Doctor } from "../src/models/Doctor.js";

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("Falta MONGO_URI");
  process.exitCode = 1;
} else {
  await mongoose.connect(uri);
  // Se lee con el driver directo: con el esquema nuevo, cargar un precio
  // como texto fallaria antes de poder convertirlo.
  const docs = await Doctor.collection
    .find({ precio: { $type: "string" } })
    .toArray();
  let migrated = 0;
  for (const doc of docs) {
    const value = Number(String(doc.precio).trim());
    const price =
      doc.precio.trim() !== "" && Number.isFinite(value) ? value : null;
    await Doctor.collection.updateOne(
      { _id: doc._id },
      { $set: { precio: price } },
    );
    migrated += 1;
  }
  console.log(`Precios migrados: ${migrated} de ${docs.length}`);
  await mongoose.disconnect();
}
