import mongoose from "mongoose";

// La BD puede no ser replica set: las transacciones solo se usan si la BD
// las soporta. Sin transaccion, cada operacion compensa por su cuenta.
export const transactionNotSupported = (error) =>
  error?.code === 20 ||
  /replica set|transaction numbers/i.test(error?.message || "");

// Ejecuta work con sesion si la BD soporta transacciones; si no, sin sesion.
export async function withOptionalTransaction(work) {
  try {
    return await mongoose.connection.transaction(async (session) =>
      work(session),
    );
  } catch (error) {
    if (!transactionNotSupported(error)) throw error;
    return work(null);
  }
}

// Opciones de sesion para escrituras: solo se pasan si hay sesion.
export const sessionOptions = (session) => (session ? { session } : {});

// Aplica la sesion a una consulta solo cuando existe.
export const sessionQuery = (query, session) =>
  session ? query.session(session) : query;

// Arma un update que restaura los valores previos de un documento: los
// campos que eran undefined se quitan en vez de quedarse con el valor nuevo.
export function restoreUpdate(before) {
  const set = {};
  const unset = {};
  for (const [key, value] of Object.entries(before || {})) {
    if (key === "_id" || key === "__v" || key === "createdAt") continue;
    if (value === undefined) unset[key] = 1;
    else set[key] = value;
  }
  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;
  return update;
}
