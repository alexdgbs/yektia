import { useEffect, useRef } from "react";
import { motion as Motion, useReducedMotion } from "framer-motion";
import { FiX } from "react-icons/fi";
import LoadingSkeleton from "../components/LoadingSkeleton";
import DoctorProfile from "../components/doctors/DoctorProfile";
import NotFoundPage from "./NotFoundPage";

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
  onNavigate,
}) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const panelEscapeRef = useRef(null);
  // Con movimiento reducido no hay fundido ni desplazamiento del modal.
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.12, ease: "easeOut" };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyboard = (event) => {
      if (event.key === "Escape") {
        if (panelEscapeRef.current?.()) return;
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
      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus();
      }
    };
  }, [onBack]);

  if (!loading && !doctor) {
    return <NotFoundPage onBack={onBack} />;
  }

  return (
    <Motion.div
      className="doctor-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onBack();
      }}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={transition}
    >
      <Motion.section
        className="doctor-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={
          doctor ? `Perfil de ${doctor.nombre}` : "Perfil del especialista"
        }
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 5 }}
        transition={transition}
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
          ) : (
            <DoctorProfile
              doctor={doctor}
              initialCalendarOpen={initialCalendarOpen}
              onRate={onRate}
              onComment={onComment}
              onUpdateComment={onUpdateComment}
              onDeleteComment={onDeleteComment}
              auth={auth}
              onNavigate={onNavigate}
              escapeRef={panelEscapeRef}
            />
          )}
        </div>
      </Motion.section>
    </Motion.div>
  );
}
