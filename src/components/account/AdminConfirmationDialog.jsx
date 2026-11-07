import { FaTriangleExclamation, FaXmark } from "react-icons/fa6";
import { ADMIN_DIALOGS } from "./adminDialogs";

export default function AdminConfirmationDialog({
  type,
  value = "",
  error = "",
  busy,
  onValue,
  onClose,
  onConfirm,
}) {
  if (!type) return null;
  const content = ADMIN_DIALOGS[type];
  const critical = ["discard", "erase", "remove"].includes(type);

  return (
    <div
      className="admin-dialog-backdrop"
      role="presentation"
      onMouseDown={busy ? undefined : onClose}
    >
      <section
        className={`admin-dialog ${critical ? "admin-dialog--critical" : ""}`}
        role={critical ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="admin-dialog__top">
          <span className="admin-dialog__icon" aria-hidden="true">
            <FaTriangleExclamation />
          </span>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={busy}
          >
            <FaXmark />
          </button>
        </header>
        <span className="eyebrow">{content.eyebrow}</span>
        <h2 id="admin-dialog-title">{content.title}</h2>
        <p>{content.text}</p>
        {content.label && (
          <label>
            {content.label}
            {type === "withdraw" ? (
              <textarea
                rows="3"
                maxLength="1000"
                value={value}
                onChange={(event) => onValue(event.target.value)}
              />
            ) : (
              <input
                autoFocus
                autoComplete="off"
                value={value}
                onChange={(event) => onValue(event.target.value)}
              />
            )}
          </label>
        )}
        {error && <small role="alert">{error}</small>}
        <footer>
          <button type="button" onClick={onClose} disabled={busy}>
            {content.cancel || "Cancelar"}
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Procesando…" : content.confirm}
          </button>
        </footer>
      </section>
    </div>
  );
}
