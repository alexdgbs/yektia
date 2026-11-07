import { useEffect, useRef } from "react";
import { motion as Motion } from "framer-motion";
import { FiX } from "react-icons/fi";
import LoadingSkeleton from "../components/LoadingSkeleton";
import DoctorProfile from "../components/doctors/DoctorProfile";

export default function DoctorPage({
  doctor,
  loading = false,
  onBack,
  onRate,
  onComment,
  onUpdateComment,
  onDeleteComment,
  auth,
  initialCalendarOpen = false,
}) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyboard = (event) => {
      if (event.key === "Escape") {
        onBack();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = modalRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyboard);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyboard);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [onBack]);

  return (
    <Motion.div
      className="doctor-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onBack();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
    >
      <Motion.section
        className="doctor-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={doctor ? `Perfil de ${doctor.nombre}` : "Perfil del especialista"}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
      >
        <header className="doctor-modal__toolbar">
          <span>{loading ? "Cargando perfil" : "Perfil del especialista"}</span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onBack}
            aria-label="Cerrar perfil"
            title="Cerrar perfil"
          >
            <FiX aria-hidden="true" />
          </button>
        </header>
        <div className="doctor-modal__scroll">
          {loading ? (
            <div className="doctor-modal__loading">
              <LoadingSkeleton
                variant="profile"
                label="Cargando perfil del especialista"
              />
            </div>
          ) : doctor ? (
            <DoctorProfile
              doctor={doctor}
              initialCalendarOpen={initialCalendarOpen}
              onRate={onRate}
              onComment={onComment}
              onUpdateComment={onUpdateComment}
              onDeleteComment={onDeleteComment}
              auth={auth}
              onClose={onBack}
            />
          ) : (
            <div className="doctor-modal__empty">
              <span className="eyebrow">Perfil no disponible</span>
              <h1>Este especialista ya no está disponible.</h1>
              <p>Regresa al directorio para revisar los perfiles disponibles.</p>
              <button className="primary-button" type="button" onClick={onBack}>
                Volver al directorio
              </button>
            </div>
          )}
        </div>
      </Motion.section>
    </Motion.div>
  );
}
