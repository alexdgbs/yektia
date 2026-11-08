import LoadingSkeleton from "../components/LoadingSkeleton";
import { useCallback, useEffect, useState } from "react";
import {
  FiBookmark,
  FiCalendar,
  FiClock,
  FiSearch,
  FiUser,
} from "react-icons/fi";
import { accountApi } from "../services/accountApi";
import { SOCKET_URL } from "../services/apiConfig";
import { connectAuthenticatedSocket } from "../services/socketClient";
import AuthForm from "../components/account/AuthForm";
import AccountSettings from "../components/account/AccountSettings";
import ScheduleSettings from "../components/account/ScheduleSettings";
import PracticeSettings from "../components/account/PracticeSettings";
import AdminDashboard from "../components/account/AdminDashboard";
import AppointmentList from "../components/account/AppointmentList";
import { APPOINTMENT, date } from "../components/account/accountPresentation";
import {
  doctorInitials,
  formatCount,
} from "../components/doctors/doctorPresentation";
import { scrollIntoViewSmooth } from "../utils/scroll";
import MedicalApplicationPanel, {
  DoctorVerificationStatus,
} from "../components/account/MedicalApplicationPanel";

// La primera cita vigente, para la tarjeta de próxima consulta.
function nextAppointment(items) {
  return items
    .filter(
      (item) =>
        ["pending", "confirmed"].includes(item.status) &&
        new Date(item.slot?.startsAt).getTime() >= Date.now(),
    )
    .sort(
      (a, b) =>
        new Date(a.slot.startsAt).getTime() -
        new Date(b.slot.startsAt).getTime(),
    )[0];
}

function Dashboard({ auth, onNavigate }) {
  const isAdmin = auth.user.role === "admin";
  const isDoctor = auth.user.role === "doctor";
  const [loading, setLoading] = useState(!isAdmin);
  const [appointments, setAppointments] = useState({
    personal: [],
    practice: [],
  });
  const [status, setStatus] = useState("");
  const [activeSection, setActiveSection] = useState("cuenta");

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
      .catch((error) => {
        console.error("No se pudo conectar el socket de la cuenta.", error);
      });

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

  const scrollToSection = (id) => {
    setActiveSection(id);
    const target = document.getElementById(`cuenta-${id}`);
    if (target) scrollIntoViewSmooth(target);
  };

  const goToDirectory = () => {
    onNavigate?.("/");
    window.requestAnimationFrame(() =>
      scrollIntoViewSmooth(document.getElementById("directorio")),
    );
  };

  const goToFavorites = () => {
    onNavigate?.("/?guardados=1");
    window.requestAnimationFrame(() =>
      scrollIntoViewSmooth(document.getElementById("directorio")),
    );
  };

  const roleLabel = isAdmin
    ? "Administrador"
    : isDoctor
      ? "Médico"
      : "Paciente";
  const savedCount = (auth.user.favoriteDoctorIds || []).length;
  const upcoming = isAdmin ? null : nextAppointment(appointments.personal);

  // Solo las secciones que hoy existen en la cuenta.
  const navItems = isAdmin
    ? []
    : isDoctor
      ? [
          { id: "consultas", label: "Mis consultas" },
          { id: "pacientes", label: "Citas de mis pacientes" },
          { id: "datos", label: "Datos personales" },
          { id: "verificacion", label: "Verificación médica" },
          { id: "perfil", label: "Perfil profesional" },
          { id: "agenda", label: "Agenda" },
        ]
      : [
          { id: "consultas", label: "Mis consultas" },
          { id: "favoritos", label: "Favoritos" },
          { id: "datos", label: "Mi cuenta" },
          { id: "verificacion", label: "Verificación médica" },
        ];

  return (
    <section className="dashboard account-shell page-width">
      <aside className="account-sidebar" aria-label="Secciones de la cuenta">
        <nav className="account-sidebar__nav">
          <button type="button" onClick={() => onNavigate?.("/")}>
            Inicio
          </button>
          {navItems.map((item) =>
            item.id === "favoritos" ? (
              <button type="button" key={item.id} onClick={goToFavorites}>
                {item.label}
              </button>
            ) : (
              <button
                type="button"
                key={item.id}
                aria-current={activeSection === item.id}
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ),
          )}
        </nav>
        <button
          type="button"
          className="account-sidebar__logout"
          onClick={auth.logout}
        >
          Cerrar sesión
        </button>
      </aside>

      <div className="account-main">
        {auth.loginNotice && (
          <p className="login-notice" role="status">
            {auth.loginNotice}
          </p>
        )}

        <section className="account-profile-card" aria-label="Tu perfil">
          <span className="account-avatar" aria-hidden="true">
            {doctorInitials(auth.user.nombre)}
          </span>
          <div className="account-profile-card__copy">
            <span className="eyebrow">{roleLabel}</span>
            <h1>Hola, {auth.user.nombre}</h1>
            <p>
              {auth.user.email}
              {auth.user.telefono ? ` · ${auth.user.telefono}` : ""}
            </p>
            {!isAdmin && (
              <p className="account-profile-card__hint">
                {isDoctor
                  ? "Administra tus datos profesionales, horarios y citas."
                  : "Consulta tus citas y actualiza tus datos."}
              </p>
            )}
          </div>
          {!isAdmin && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => scrollToSection("datos")}
            >
              Editar perfil
            </button>
          )}
        </section>

        {!isAdmin && (
          <div className="account-quick">
            <button type="button" onClick={goToDirectory}>
              <span className="account-quick__icon" aria-hidden="true">
                <FiSearch />
              </span>
              <strong>Agendar consulta</strong>
              <span>Busca especialistas y reserva</span>
            </button>
            <button type="button" onClick={() => scrollToSection("consultas")}>
              <span className="account-quick__icon" aria-hidden="true">
                <FiCalendar />
              </span>
              <strong>Mis consultas</strong>
              <span>
                {formatCount(appointments.personal.length, "cita", "citas")}
              </span>
            </button>
            {isDoctor ? (
              <button
                type="button"
                onClick={() => scrollToSection("pacientes")}
              >
                <span className="account-quick__icon" aria-hidden="true">
                  <FiUser />
                </span>
                <strong>Citas de mis pacientes</strong>
                <span>
                  {formatCount(appointments.practice.length, "cita", "citas")}
                </span>
              </button>
            ) : (
              <button type="button" onClick={goToFavorites}>
                <span className="account-quick__icon" aria-hidden="true">
                  <FiBookmark />
                </span>
                <strong>Mis favoritos</strong>
                <span>
                  {formatCount(
                    savedCount,
                    "perfil guardado",
                    "perfiles guardados",
                  )}
                </span>
              </button>
            )}
            {isDoctor && (
              <button type="button" onClick={() => scrollToSection("agenda")}>
                <span className="account-quick__icon" aria-hidden="true">
                  <FiClock />
                </span>
                <strong>Agenda</strong>
                <span>Horario semanal y fechas bloqueadas</span>
              </button>
            )}
          </div>
        )}

        {isAdmin ? (
          <AdminDashboard />
        ) : (
          <>
            {!loading && (
              <section className="account-next" aria-label="Próxima consulta">
                <div>
                  <span className="eyebrow">Próxima consulta</span>
                  {upcoming ? (
                    <>
                      <h2>
                        {upcoming.doctor?.nombre ||
                          "El profesional ya no está disponible"}
                      </h2>
                      <p>
                        {upcoming.doctor?.especialidad ||
                          "El perfil fue retirado del directorio."}
                        {" · "}
                        {date(upcoming.slot?.startsAt)}
                        {" · "}
                        {APPOINTMENT[upcoming.status]}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2>Sin consultas próximas</h2>
                      <p>Agenda tu primera consulta cuando quieras.</p>
                    </>
                  )}
                </div>
                {upcoming ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => scrollToSection("consultas")}
                  >
                    Ver mis consultas
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={goToDirectory}
                  >
                    Agendar consulta
                  </button>
                )}
              </section>
            )}

            <div className="account-section" id="cuenta-consultas">
              <AppointmentList
                loading={loading}
                items={appointments.personal}
                title="Mis consultas"
                mode="personal"
                onUpdate={update}
              />
            </div>

            {isDoctor && (
              <div className="account-section" id="cuenta-pacientes">
                <AppointmentList
                  loading={loading}
                  items={appointments.practice}
                  title="Citas de mis pacientes"
                  mode="practice"
                  onUpdate={update}
                  showPolicy={false}
                />
              </div>
            )}

            <div className="account-section" id="cuenta-datos">
              <AccountSettings auth={auth} />
            </div>

            <div className="account-section" id="cuenta-verificacion">
              {isDoctor ? (
                <DoctorVerificationStatus />
              ) : (
                <MedicalApplicationPanel auth={auth} />
              )}
            </div>

            {isDoctor && (
              <>
                <div className="account-section" id="cuenta-perfil">
                  <PracticeSettings doctorId={auth.user.doctorId} />
                </div>
                <div className="account-section" id="cuenta-agenda">
                  <ScheduleSettings />
                </div>
              </>
            )}
          </>
        )}

        {status && (
          <p className="form-status dashboard-status" role="status">
            {status}
          </p>
        )}
      </div>
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
