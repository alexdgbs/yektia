import { motion as Motion, useReducedMotion } from "framer-motion";
import DoctorDirectory from "../components/doctors/DoctorDirectory";

export default function HomePage({
  doctorsState,
  onSelectDoctor,
  auth,
  query,
  onQueryChange,
  visibleDoctorId,
}) {
  const reduceMotion = useReducedMotion();

  return (
    <Motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
    >
      <section className="home-intro">
        <div className="page-width">
          <span className="eyebrow">Directorio médico</span>
          <p>
            Encuentra especialistas verificados, compara precios y reserva tu
            cita.
          </p>
        </div>
      </section>
      <DoctorDirectory
        doctors={doctorsState.doctors}
        loading={doctorsState.loading}
        error={doctorsState.error}
        onSelectDoctor={onSelectDoctor}
        auth={auth}
        query={query}
        onQueryChange={onQueryChange}
        visibleDoctorId={visibleDoctorId}
      />
    </Motion.div>
  );
}
