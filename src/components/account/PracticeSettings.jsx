import LoadingSkeleton from "../LoadingSkeleton";
import { useEffect, useState } from "react";
import { accountApi } from "../../services/accountApi";
export default function PracticeSettings({ doctorId }) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    price: "",
    description: "",
    phone: "",
    location: "",
    languages: "",
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    accountApi
      .doctorProfile(doctorId)
      .then((doctor) =>
        setForm({
          price: doctor.precio || "",
          description: doctor.descripcion || "",
          phone: doctor.telefono || "",
          location: doctor.ubicacion || "",
          languages: (doctor.idiomas || []).join(", "),
        }),
      )
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [doctorId]);
  const field = (name) => (event) =>
    setForm({ ...form, [name]: event.target.value });
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await accountApi.updateDoctorProfile({
        ...form,
        price: Number(form.price),
        languages: form.languages
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setMessage("Perfil profesional actualizado.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <LoadingSkeleton variant="form" label="Cargando perfil profesional" />
    );
  return (
    <section className="settings-panel">
      <header>
        <span className="eyebrow">Perfil profesional</span>
        <h2>Información pública</h2>
        <p>La cédula y especialidad requieren revisión administrativa.</p>
      </header>
      <form className="settings-grid professional-settings" onSubmit={save}>
        <label>
          Precio en MXN
          <input
            type="number"
            min="0"
            max="100000"
            step="1"
            required
            value={form.price}
            onChange={field("price")}
          />
        </label>
        <label>
          Teléfono de consulta (México)
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            title="Ingresa los 10 números, sin espacios"
            maxLength="10"
            value={form.phone}
            onChange={(event) =>
              setForm({
                ...form,
                phone: event.target.value.replace(/\D/g, "").slice(0, 10),
              })
            }
          />
        </label>
        <label>
          Consultorio o ciudad
          <input
            maxLength="160"
            value={form.location}
            onChange={field("location")}
          />
        </label>
        <label>
          Idiomas, separados por coma
          <input value={form.languages} onChange={field("languages")} />
        </label>
        <label className="wide">
          Presentación profesional
          <textarea
            maxLength="500"
            value={form.description}
            onChange={field("description")}
            placeholder="Resume tu formación, experiencia y tipo de atención."
          />
        </label>
        <button className="primary-button" disabled={busy}>
          {busy ? "Guardando…" : "Guardar perfil"}
        </button>
        {message && <small role="status">{message}</small>}
      </form>
    </section>
  );
}
