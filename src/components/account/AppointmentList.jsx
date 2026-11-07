import LoadingSkeleton from "../LoadingSkeleton";
import { APPOINTMENT, date } from "./accountPresentation";

export default function AppointmentList({
  items,
  title,
  mode,
  onUpdate,
  loading,
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
          {items.length} {items.length === 1 ? "cita" : "citas"}
        </span>
      </header>

      {items.length ? (
        <div className="appointments-list__items">
          {items.map((item) => {
            const active = !["cancelled", "completed"].includes(item.status);
            const patientCanCancel =
              new Date(item.slot?.startsAt).getTime() - Date.now() >=
              24 * 60 * 60 * 1000;

            return (
              <article key={item.id}>
                <div className="appointment-main">
                  <strong>
                    {mode === "practice"
                      ? item.patient?.nombre
                      : item.doctor?.nombre}
                  </strong>
                  <span>
                    {mode === "practice"
                      ? item.patient?.email
                      : item.doctor?.especialidad}
                  </span>
                  <time>{date(item.slot?.startsAt)}</time>
                  {mode === "personal" && active && !patientCanCancel && (
                    <small>Para cancelar, contacta al consultorio.</small>
                  )}
                </div>

                <div className="appointment-meta">
                  <span
                    className={`appointment-status appointment-status--${item.status}`}
                  >
                    {APPOINTMENT[item.status]}
                  </span>

                  <div className="appointment-actions">
                    {mode === "practice" && item.status === "pending" && (
                      <button onClick={() => onUpdate(item.id, "confirmed")}>
                        Confirmar
                      </button>
                    )}
                    {active && (mode === "practice" || patientCanCancel) && (
                      <button onClick={() => onUpdate(item.id, "cancelled")}>
                        Cancelar
                      </button>
                    )}
                    {mode === "practice" && item.status === "confirmed" && (
                      <button onClick={() => onUpdate(item.id, "completed")}>
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

      <p className="cancellation-policy">
        Los pacientes pueden cancelar en línea hasta 24 horas antes.
      </p>
    </section>
  );
}
