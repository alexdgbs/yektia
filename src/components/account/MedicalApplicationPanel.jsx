import LoadingSkeleton from "../LoadingSkeleton";
import { useCallback, useEffect, useState } from "react";
import { accountApi } from "../../services/accountApi";
import { APPLICATION, DOCUMENTS } from "./accountPresentation";
import AdminConfirmationDialog from "./AdminConfirmationDialog";
export default function MedicalApplicationPanel({ auth }) {
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [open, setOpen] = useState(false);
  const [dismissedDecision, setDismissedDecision] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [form, setForm] = useState({
    legalName: auth.user.nombre,
    professionalLicense: "",
    specialty: "",
    specialtyLicense: "",
    phone: "",
    location: "",
  });
  const load = useCallback(
    () =>
      accountApi
        .myMedicalApplication()
        .then(({ application: current }) => {
          setApplication(current);
          if (current) {
            setForm({
              legalName: current.legalName,
              professionalLicense: current.professionalLicense,
              specialty: current.specialty,
              specialtyLicense: current.specialtyLicense || "",
              phone: current.phone || "",
              location: current.location || "",
            });
            setOpen(["draft", "changes_requested"].includes(current.status));
          }
        })
        .catch((error) => setMessage(error.message))
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await accountApi.saveMedicalApplication(form);
      setApplication(result.application);
      setMessage("Datos guardados. Adjunta tus documentos.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (type, file) => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await accountApi.uploadMedicalDocument(type, file);
      setApplication(result.application);
      setMessage("Documento guardado de forma privada.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const removeDocument = async (type) => {
    setBusy(true);
    setMessage("");
    try {
      const result = await accountApi.deleteMedicalDocument(type);
      setApplication(result.application);
      setMessage("Documento eliminado.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const discard = async () => {
    if (!application) return;
    setBusy(true);
    setMessage("");
    try {
      await accountApi.discardMedicalApplication();
      setApplication(null);
      setForm({
        legalName: auth.user.nombre,
        professionalLicense: "",
        specialty: "",
        specialtyLicense: "",
        phone: "",
        location: "",
      });
      setOpen(false);
      setConfirmDiscard(false);
      setMessage("Solicitud y documentos eliminados de forma permanente.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    setBusy(true);
    try {
      const result = await accountApi.submitMedicalApplication();
      setApplication(result.application);
      setOpen(false);
      setMessage("Solicitud enviada para revisión.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return <LoadingSkeleton variant="form" label="Cargando solicitud médica" />;
  if (
    !application &&
    auth.user.medicalDecision?.status === "rejected" &&
    !dismissedDecision
  )
    return (
      <div className="decision-followup">
        <ApplicationDecision
          application={{
            status: "rejected",
            reviewNote: auth.user.medicalDecision.note,
          }}
        />
        <button
          className="secondary-button"
          onClick={() => {
            setDismissedDecision(true);
            setOpen(true);
          }}
        >
          Iniciar una nueva solicitud
        </button>
      </div>
    );
  if (
    application &&
    !["draft", "changes_requested"].includes(application.status)
  )
    return <ApplicationDecision application={application} />;
  return (
    <section className="application-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Profesionales</span>
          <h2>Solicita tu perfil médico</h2>
          <p>Validaremos tu información contra el registro oficial.</p>
        </div>
        {open ? (
          <button className="secondary-button" onClick={() => setOpen(false)}>
            Ocultar formulario
          </button>
        ) : (
          <button className="secondary-button" onClick={() => setOpen(true)}>
            {application ? "Continuar solicitud" : "Iniciar solicitud"}
          </button>
        )}
      </div>
      {application?.reviewNote && (
        <p className="review-note">
          <strong>Cambios solicitados:</strong> {application.reviewNote}
        </p>
      )}
      {!open && message && (
        <p className="form-status application-form-status" role="status">
          {message}
        </p>
      )}
      {open && (
        <>
          <form className="medical-form" onSubmit={save}>
            <Field
              label="Nombre legal"
              required
              value={form.legalName}
              set={(value) => setForm({ ...form, legalName: value })}
              pattern="[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.' -]+"
              title="Usa únicamente letras"
              autoComplete="name"
              maxLength={120}
            />
            <Field
              label="Cédula profesional"
              required
              value={form.professionalLicense}
              set={(value) =>
                setForm({
                  ...form,
                  professionalLicense: value.replace(/\D/g, ""),
                })
              }
              inputMode="numeric"
              pattern="[0-9]+"
              title="Usa únicamente números"
              autoComplete="off"
              maxLength={30}
            />
            <Field
              label="Especialidad"
              required
              value={form.specialty}
              set={(value) =>
                setForm({ ...form, specialty: value.replace(/[0-9]/g, "") })
              }
              pattern="[^0-9]+"
              title="La especialidad no puede contener números"
              autoComplete="organization-title"
              maxLength={100}
            />
            <Field
              label="Cédula de especialidad"
              value={form.specialtyLicense}
              set={(value) =>
                setForm({ ...form, specialtyLicense: value.replace(/\D/g, "") })
              }
              inputMode="numeric"
              pattern="[0-9]*"
              title="Usa únicamente números"
              autoComplete="off"
              maxLength={30}
            />
            <Field
              label="Teléfono celular (México)"
              required
              value={form.phone}
              set={(value) =>
                setForm({
                  ...form,
                  phone: value.replace(/\D/g, "").slice(0, 10),
                })
              }
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              autoComplete="tel"
              title="Ingresa exactamente 10 números, sin espacios"
              maxLength={10}
            />
            <Field
              label="Consultorio o ciudad"
              required
              value={form.location}
              set={(value) => setForm({ ...form, location: value })}
            />
            <button className="primary-button" disabled={busy}>
              {busy
                ? "Guardando…"
                : application
                  ? "Actualizar información"
                  : "Guardar y continuar"}
            </button>
          </form>
          {message && (
            <p className="form-status application-form-status" role="status">
              {message}
            </p>
          )}
          {application && (
            <div className="document-upload">
              <h3>Documentos privados</h3>
              <p className="field-help">
                Identificación y cédula profesional son obligatorias. La imagen
                o PDF de la cédula de especialidad sólo se solicita si
                capturaste ese número.
              </p>
              {DOCUMENTS.filter(
                (document) =>
                  !document.optional || application.specialtyLicense,
              ).map((document) => {
                const saved = application.documents.find(
                  (item) => item.type === document.type,
                );
                return (
                  <div className="document-upload__row" key={document.type}>
                    <label>
                      <span>
                        {document.label}
                        <small>
                          {saved ? saved.name : "PDF, JPG o PNG · máximo 5 MB"}
                        </small>
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        disabled={busy}
                        onChange={(e) =>
                          upload(document.type, e.target.files[0])
                        }
                      />
                      <strong>{saved ? "Reemplazar" : "Adjuntar"}</strong>
                    </label>
                    {saved && (
                      <button
                        className="document-remove"
                        type="button"
                        disabled={busy}
                        onClick={() => removeDocument(document.type)}
                      >
                        Quitar archivo
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                className="primary-button"
                disabled={busy}
                onClick={submit}
              >
                Enviar a revisión
              </button>
            </div>
          )}
          {application && (
            <div className="application-actions">
              <button
                type="button"
                onClick={() => setConfirmDiscard(true)}
                disabled={busy}
              >
                Eliminar solicitud
              </button>
              <small>
                Elimina permanentemente de la base de datos el borrador y todos
                sus archivos. Si sólo quieres continuar después, usa “Ocultar
                formulario”.
              </small>
            </div>
          )}
        </>
      )}
      <AdminConfirmationDialog
        type={confirmDiscard ? "discard" : null}
        busy={busy}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={discard}
      />
    </section>
  );
}
function Field({ label, value, set, required = false, ...inputProps }) {
  return (
    <label className="form-field">
      <span className="form-field__label">
        <span>{label}</span>
        {!required && <em>Opcional</em>}
      </span>
      <input
        required={required}
        value={value}
        onChange={(e) => set(e.target.value)}
        {...inputProps}
      />
    </label>
  );
}

function ApplicationDecision({ application }) {
  const title =
    application.status === "approved"
      ? "Tu solicitud fue aprobada"
      : application.status === "rejected"
        ? "Tu solicitud no fue aprobada"
        : application.status === "withdrawn"
          ? "Tu perfil fue retirado"
          : "Tu solicitud está en revisión";
  return (
    <section className="application-summary">
      <div>
        <span className="eyebrow">Verificación médica</span>
        <h2>{title}</h2>
      </div>
      <span
        className={`application-badge application-badge--${application.status}`}
      >
        {APPLICATION[application.status]}
      </span>
      {application.reviewNote && (
        <p>
          <strong>Mensaje de revisión:</strong> {application.reviewNote}
        </p>
      )}
      <small>
        {application.status === "submitted"
          ? "Compararemos tus datos con el Registro Nacional de Profesionistas."
          : application.status === "approved"
            ? "Tu perfil profesional ya está activo."
            : application.status === "withdrawn"
              ? "Tu cuenta continúa activa como paciente."
              : "Puedes consultar el motivo indicado por el equipo de revisión."}
      </small>
    </section>
  );
}

export function DoctorVerificationStatus() {
  const [application, setApplication] = useState(null);
  useEffect(() => {
    accountApi
      .myMedicalApplication()
      .then(({ application: current }) => setApplication(current))
      .catch(() => {});
  }, []);
  return application?.status === "approved" ? (
    <ApplicationDecision application={application} />
  ) : null;
}
