import LoadingSkeleton from "../components/LoadingSkeleton";
import { useCallback, useEffect, useState } from "react";
import { accountApi } from "../services/accountApi";
import { SOCKET_URL } from "../services/apiConfig";
import { connectAuthenticatedSocket } from "../services/socketClient";
import AuthForm from "../components/account/AuthForm";
import AccountSettings from "../components/account/AccountSettings";
import ScheduleSettings from "../components/account/ScheduleSettings";
import PracticeSettings from "../components/account/PracticeSettings";
import AdminDashboard from "../components/account/AdminDashboard";
import AppointmentList from "../components/account/AppointmentList";
import { scrollIntoViewSmooth } from "../utils/scroll";
import MedicalApplicationPanel, {
  DoctorVerificationStatus,
} from "../components/account/MedicalApplicationPanel";

function Dashboard({ auth, onNavigate }) {
  const isAdmin = auth.user.role === "admin";
  const [loading, setLoading] = useState(!isAdmin);
  const [appointments, setAppointments] = useState({
    personal: [],
    practice: [],
  });
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    if (isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const nextAppointments = await accountApi.appointments();
      setAppointments(nextAppointments);
      setStatus("");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!SOCKET_URL) return undefined;

    let socket;
    let active = true;

    connectAuthenticatedSocket()
      .then((connected) => {
        if (!active) {
          connected.disconnect();
          return;
        }
        socket = connected;
        socket.on("cita_actualizada", load);
        socket.on("solicitud_medica_actualizada", auth.refresh);
      })
      .catch(() => {});

    return () => {
      active = false;
      socket?.disconnect();
    };
  }, [load, auth.refresh]);

  const update = async (id, next) => {
    try {
      setStatus("");
      await accountApi.updateAppointment(id, next);
      await load();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <section className="dashboard page-width">
      {auth.loginNotice && (
        <p className="login-notice" role="status">
          {auth.loginNotice}
        </p>
      )}

      <header className="dashboard-header">
        <div className="dashboard-header__copy">
          <span className="eyebrow">
            {auth.user.role === "doctor"
              ? "Panel médico"
              : isAdmin
                ? "Administración"
                : "Mi cuenta"}
          </span>
          <h1>Hola, {auth.user.nombre}.</h1>
          {!isAdmin && (
            <p>
              {auth.user.role === "doctor"
                ? "Administra tus datos profesionales, horarios y citas."
                : "Consulta tus citas y actualiza tus datos."}
            </p>
          )}
        </div>

        <div className="dashboard-header__actions">
          <div className="dashboard-session">
            <span className="dashboard-session__label">Cuenta</span>
            <strong>{auth.user.email}</strong>
          </div>
          {!isAdmin && (
            <a
              className="primary-button"
              href="/"
              onClick={(event) => {
                event.preventDefault();
                onNavigate?.("/");
                window.requestAnimationFrame(() =>
                  scrollIntoViewSmooth(document.getElementById("directorio")),
                );
              }}
            >
              Buscar especialista
            </a>
          )}
        </div>
      </header>

      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <>
          <div
            className={`dashboard-grid ${
              auth.user.role === "doctor"
                ? "dashboard-grid--single"
                : "dashboard-grid--patient"
            }`}
          >
            <AccountSettings auth={auth} />
            {auth.user.role === "patient" && (
              <MedicalApplicationPanel auth={auth} />
            )}
            {auth.user.role === "patient" && (
              <AppointmentList
                loading={loading}
                items={appointments.personal}
                title="Mis consultas"
                mode="personal"
                onUpdate={update}
              />
            )}
          </div>

          {auth.user.role === "doctor" && (
            <div className="dashboard-professional-stack">
              <DoctorVerificationStatus />
              <PracticeSettings doctorId={auth.user.doctorId} />
              <ScheduleSettings />
            </div>
          )}

          {auth.user.role === "doctor" && (
            <>
              <AppointmentList
                loading={loading}
                items={appointments.personal}
                title="Mis consultas"
                mode="personal"
                onUpdate={update}
              />
              <AppointmentList
                loading={loading}
                items={appointments.practice}
                title="Citas de mis pacientes"
                mode="practice"
                onUpdate={update}
              />
            </>
          )}
        </>
      )}

      {status && (
        <p className="form-status dashboard-status" role="status">
          {status}
        </p>
      )}
    </section>
  );
}

export default function AccountPage({ auth, onNavigate }) {
  if (auth.loading) {
    return (
      <div className="page-width">
        <LoadingSkeleton label="Cargando tu cuenta" />
      </div>
    );
  }

  return auth.user ? <Dashboard auth={auth} onNavigate={onNavigate} /> : <AuthForm auth={auth} />;
}
