import LoadingSkeleton from "../LoadingSkeleton";
import { APPOINTMENT, date } from "./accountPresentation";
import { formatCount } from "../doctors/doctorPresentation";

export default function AppointmentList({
  items,
  title,
  mode,
  onUpdate,
  loading,
  showPolicy = true,
}) {
  if (loading) {
    return (
      <LoadingSkeleton
        variant="appointments"
        label={`Cargando ${title.toLowerCase()}`}
      />
    );
  }

  return (
    <section className="appointments-list">
      <header className="appointments-list__header">
        <div>
          <span className="eyebrow">Agenda</span>
          <h2>{title}</h2>
        </div>
        <span className="appointments-list__count">
          {formatCount(items.length, "cita", "citas")}
        </span>
      </header>

      {items.length ? (
        <div className="appointments-list__items">
          {items.map((item) => {
            const isPast = new Date(item.slot?.startsAt).getTime() < Date.now();
            // Una cita pasada se muestra como pasada, no "Confirmada".
            const displayStatus =
              isPast && ["pending", "confirmed"].includes(item.status)
                ? "past"
                : item.status;
            const active = !["cancelled", "completed", "past"].includes(
              displayStatus,
            );
            const doctorRemoved =
              !item.doctor ||
              item.doctor.verificationStatus === "removed" ||
              item.doctor.nombre === "Profesional retirado";
            const patientCanCancel =
              new Date(item.slot?.startsAt).getTime() - Date.now() >=
              24 * 60 * 60 * 1000;

            return (
              <article key={item.id}>
                <div className="appointment-main">
                  <strong>
                    {mode === "practice"
                      ? item.patient?.nombre
                      : doctorRemoved
                        ? "El profesional ya no está disponible"
                        : item.doctor?.nombre}
                  </strong>
                  <span>
                    {mode === "practice"
                      ? item.patient?.email
                      : doctorRemoved
                        ? "El perfil fue retirado del directorio."
                        : item.doctor?.especialidad}
                  </span>
                  <time>{date(item.slot?.startsAt)}</time>
                  {mode === "personal" &&
                    active &&
                    !patientCanCancel &&
                    !doctorRemoved && (
                      <small>Para cancelar, contacta al consultorio.</small>
                    )}
                </div>

                <div className="appointment-meta">
                  <span
                    className={`appointment-status appointment-status--${displayStatus}`}
                  >
                    {APPOINTMENT[displayStatus]}
                  </span>

                  <div className="appointment-actions">
                    {mode === "practice" && item.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => onUpdate(item.id, "confirmed")}
                      >
                        Confirmar
                      </button>
                    )}
                    {active &&
                      (mode === "practice" ||
                        patientCanCancel ||
                        doctorRemoved) && (
                        <button
                          type="button"
                          onClick={() => onUpdate(item.id, "cancelled")}
                        >
                          Cancelar
                        </button>
                      )}
                    {mode === "practice" && item.status === "confirmed" && (
                      <button
                        type="button"
                        onClick={() => onUpdate(item.id, "completed")}
                      >
                        Completar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-state">No hay citas en esta sección.</p>
      )}

      {showPolicy && (
        <p className="cancellation-policy">
          Los pacientes pueden cancelar en línea hasta 24 horas antes.
        </p>
      )}
    </section>
  );
}
