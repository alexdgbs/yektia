import LoadingSkeleton from "../LoadingSkeleton";
import { useCallback, useEffect, useState } from "react";
import AdminConfirmationDialog from "./AdminConfirmationDialog";
import { ADMIN_DIALOGS } from "./adminDialogs";
import { APPLICATION, DOCUMENTS, date } from "./accountPresentation";
import { accountApi } from "../../services/accountApi";
import { SOCKET_URL } from "../../services/apiConfig";
import { connectAuthenticatedSocket } from "../../services/socketClient";
export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [audit, setAudit] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [dialogValue, setDialogValue] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [dialogBusy, setDialogBusy] = useState(false);
  const load = useCallback(
    () =>
      accountApi
        .medicalApplications()
        .then(({ applications }) => {
          setItems(applications);
          setSelected(
            (current) =>
              applications.find((item) => item.id === current?.id) ||
              applications[0] ||
              null,
          );
        })
        .catch((error) => setMessage(error.message))
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    load();
    if (!SOCKET_URL) return undefined;
    let socket;
    let active = true;
    connectAuthenticatedSocket()
      .then((connected) => {
        if (!active) return connected.disconnect();
        socket = connected;
        socket.on("solicitud_medica_actualizada", load);
      })
      .catch((error) => {
        console.error("No se pudo conectar el socket del panel.", error);
      });
    return () => {
      active = false;
      socket?.disconnect();
    };
  }, [load]);
  useEffect(() => {
    if (!selected) {
      setAudit([]);
      return undefined;
    }

    let active = true;
    accountApi
      .applicationAudit(selected.id)
      .then(({ events }) => {
        if (active) setAudit(Array.isArray(events) ? events : []);
      })
      .catch((error) => {
        if (!active) return;
        setAudit([]);
        setMessage(error.message);
      });

    return () => {
      active = false;
    };
  }, [selected]);
  const review = async (status) => {
    try {
      await accountApi.reviewMedicalApplication(selected.id, {
        status,
        reviewNote: note,
      });
      setNote("");
      setMessage("Decisión registrada.");
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };
  const openDialog = (type) => {
    setDialog(type);
    setDialogValue(ADMIN_DIALOGS[type].initial || "");
    setDialogError("");
  };
  const closeDialog = () => {
    if (!dialogBusy) {
      setDialog(null);
      setDialogValue("");
      setDialogError("");
    }
  };
  const confirmDialog = async () => {
    if (dialog === "erase" && dialogValue !== "ELIMINAR") {
      setDialogError("Escribe ELIMINAR exactamente para continuar.");
      return;
    }
    if (dialog === "withdraw" && !dialogValue.trim()) {
      setDialogError("Escribe el motivo de la baja.");
      return;
    }
    setDialogBusy(true);
    setDialogError("");
    try {
      if (dialog === "withdraw")
        await accountApi.withdrawDoctor(selected.id, dialogValue.trim());
      else if (dialog === "erase")
        await accountApi.eraseDoctorData(selected.id, dialogValue);
      else await accountApi.deleteMedicalApplication(selected.id);
      setDialog(null);
      setDialogValue("");
      setSelected(null);
      setMessage("");
      await load();
    } catch (error) {
      setDialogError(error.message);
    } finally {
      setDialogBusy(false);
    }
  };
  if (loading)
    return (
      <LoadingSkeleton variant="admin" label="Cargando solicitudes médicas" />
    );
  return (
    <div className="admin-layout">
      <aside>
        <h2>Solicitudes</h2>
        {items.map((item) => (
          <button
            className={selected?.id === item.id ? "active" : ""}
            key={item.id}
            onClick={() => setSelected(item)}
          >
            <strong>{item.legalName}</strong>
            <span>{APPLICATION[item.status]}</span>
          </button>
        ))}
        {!items.length && <p>No hay solicitudes.</p>}
      </aside>
      <section className="application-review">
        {!selected && !message && (
          <div className="admin-empty-state">
            <span className="eyebrow">Bandeja de revisión</span>
            <h2>Sin solicitudes por revisar</h2>
            <p>Las solicitudes nuevas aparecerán aquí cuando estén disponibles.</p>
          </div>
        )}
        {selected && (
          <>
            <header>
              <div>
                <span className="eyebrow">Revisión profesional</span>
                <h2>{selected.legalName}</h2>
              </div>
              <span
                className={`application-badge application-badge--${selected.status}`}
              >
                {APPLICATION[selected.status]}
              </span>
            </header>
            <dl>
              <Info term="Cédula" value={selected.professionalLicense} />
              <Info term="Especialidad" value={selected.specialty} />
              <Info term="Correo" value={selected.applicant?.email} />
              <Info
                term="Ubicación"
                value={selected.location || "Sin registrar"}
              />
            </dl>
            <div className="review-documents">
              <h3>Documentos</h3>
              {selected.documents.map((document) => (
                <button
                  key={document.id}
                  onClick={() =>
                    accountApi.openMedicalDocument(selected.id, document.id)
                  }
                >
                  {DOCUMENTS.find((item) => item.type === document.type)?.label}
                  <span>Abrir</span>
                </button>
              ))}
            </div>
            {["submitted", "changes_requested"].includes(selected.status) && (
              <div className="review-actions">
                <label>
                  Nota de revisión
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Obligatoria al pedir cambios o rechazar"
                  />
                </label>
                <div>
                  <button onClick={() => review("changes_requested")}>
                    Pedir cambios
                  </button>
                  <button onClick={() => review("rejected")}>Rechazar</button>
                  <button
                    className="primary-button"
                    onClick={() => review("approved")}
                  >
                    Aprobar perfil
                  </button>
                </div>
              </div>
            )}
            <div className="audit-log">
              <h3>Historial</h3>
              {audit.map((event) => (
                <p key={event.id}>
                  <time>{date(event.createdAt)}</time>
                  <strong>{event.action.replaceAll("_", " ")}</strong>
                  <span>{event.actor?.nombre}</span>
                </p>
              ))}
            </div>
            {selected.status === "approved" && (
              <div className="danger-zone">
                <div>
                  <strong>Retirar del directorio</strong>
                  <span>Oculta el perfil y cancela sus citas futuras.</span>
                </div>
                <button type="button" onClick={() => openDialog("withdraw")}>
                  Retirar perfil
                </button>
              </div>
            )}
            {selected.status === "withdrawn" && (
              <div className="danger-zone danger-zone--critical">
                <div>
                  <strong>Eliminar datos profesionales</strong>
                  <span>
                    Acción irreversible. Las citas conservarán únicamente una
                    referencia anónima.
                  </span>
                </div>
                <button type="button" onClick={() => openDialog("erase")}>
                  Eliminar datos
                </button>
              </div>
            )}
            {selected.status === "rejected" && (
              <div className="danger-zone">
                <div>
                  <strong>Eliminar solicitud</strong>
                  <span>Borra también documentos e historial.</span>
                </div>
                <button type="button" onClick={() => openDialog("remove")}>
                  Eliminar definitivamente
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {message && <p className="form-status">{message}</p>}
      <AdminConfirmationDialog
        type={dialog}
        value={dialogValue}
        error={dialogError}
        busy={dialogBusy}
        onValue={setDialogValue}
        onClose={closeDialog}
        onConfirm={confirmDialog}
      />
    </div>
  );
}
function Info({ term, value }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}
