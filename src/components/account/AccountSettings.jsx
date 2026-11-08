import { useEffect, useState } from "react";
import {
  NAME_PATTERN,
  NAME_TITLE,
  PHONE_PATTERN,
  PHONE_TITLE,
  digitsOnly,
} from "../../utils/patterns";
export default function AccountSettings({ auth }) {
  const [form, setForm] = useState({
    nombre: auth.user.nombre,
    telefono: auth.user.telefono || "",
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await auth.updateProfile(form);
      setMessage("Cuenta actualizada.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    setForm({ nombre: auth.user.nombre, telefono: auth.user.telefono || "" });
  }, [auth.user.nombre, auth.user.telefono]);
  return (
    <section className="settings-panel account-settings-panel">
      <header>
        <span className="eyebrow">Mi cuenta</span>
        <h2>Datos personales</h2>
        <p>
          {auth.user.role === "doctor"
            ? "El nombre profesional proviene de tu verificación médica."
            : "El correo de acceso no cambia desde aquí."}
        </p>
      </header>
      <form className="settings-grid account-settings-form" onSubmit={save}>
        <label>
          {auth.user.role === "doctor"
            ? "Nombre profesional verificado"
            : "Nombre"}
          <input
            disabled={auth.user.role === "doctor"}
            required
            minLength="2"
            maxLength="80"
            pattern={NAME_PATTERN}
            title={NAME_TITLE}
            value={form.nombre}
            placeholder="Tu nombre completo"
            onChange={(event) =>
              setForm({ ...form, nombre: event.target.value })
            }
          />
        </label>
        <label>
          Teléfono
          <input
            type="tel"
            inputMode="numeric"
            pattern={PHONE_PATTERN}
            title={PHONE_TITLE}
            maxLength="10"
            value={form.telefono}
            placeholder="10 dígitos"
            onChange={(event) =>
              setForm({
                ...form,
                telefono: digitsOnly(event.target.value),
              })
            }
          />
        </label>
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar cuenta"}
        </button>
        {message && <small role="status">{message}</small>}
      </form>
    </section>
  );
}
