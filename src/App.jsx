import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";
import DoctorPage from "./pages/DoctorPage";
import NotFoundPage from "./pages/NotFoundPage";
import { useDoctors } from "./hooks/useDoctors";
import { useAuth } from "./hooks/useAuth";
import { scrollIntoViewSmooth } from "./utils/scroll";
import AccountPage from "./pages/AccountPage";
import "./styles/index.css";

const getDoctorIdFromPath = () => {
  const encodedId =
    window.location.pathname.match(/^\/doctores\/(.+)$/)?.[1] || "";
  try {
    return decodeURIComponent(encodedId);
  } catch {
    return encodedId;
  }
};

const getOpenCalendarFromUrl = () =>
  new URLSearchParams(window.location.search).get("agenda") === "1";

export default function App() {
  const auth = useAuth();
  const doctorsState = useDoctors();
  const [directoryQuery, setDirectoryQuery] = useState("");

  const [selectedDoctorId, setSelectedDoctorId] = useState(getDoctorIdFromPath);
  const [openCalendarOnProfile, setOpenCalendarOnProfile] = useState(
    getOpenCalendarFromUrl,
  );
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [doctorLookup, setDoctorLookup] = useState("idle");
  const selectedDoctor = doctorsState.doctors.find(
    (doctor) => doctor._id === selectedDoctorId,
  );

  useEffect(() => {
    const handleNavigation = () => {
      setSelectedDoctorId(getDoctorIdFromPath());
      setOpenCalendarOnProfile(getOpenCalendarFromUrl());
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, []);

  const navigateTo = useCallback((path, options = {}) => {
    const url = new URL(path, window.location.origin);
    if (url.pathname === "/directorio") url.pathname = "/";
    if (options.replace) {
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } else {
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
    setSelectedDoctorId(getDoctorIdFromPath());
    setOpenCalendarOnProfile(getOpenCalendarFromUrl());
    setCurrentPath(window.location.pathname);
    setDoctorLookup("idle");
  }, []);

  useEffect(() => {
    if (!selectedDoctorId || selectedDoctor || doctorsState.loading) return;
    if (doctorLookup !== "idle") return;
    setDoctorLookup("pending");
    doctorsState
      .getDoctor(selectedDoctorId)
      .then(() => setDoctorLookup("done"))
      .catch(() => setDoctorLookup("error"));
  }, [selectedDoctorId, selectedDoctor, doctorsState, doctorLookup]);

  const doctorNotFound =
    Boolean(selectedDoctorId) &&
    !doctorsState.loading &&
    !selectedDoctor &&
    doctorLookup === "done";

  const doctorLoadFailed =
    Boolean(selectedDoctorId) && !selectedDoctor && doctorLookup === "error";

  const openDoctor = (doctor, options = {}) => {
    const openCalendar = options.openCalendar === true;
    navigateTo(
      `/doctores/${encodeURIComponent(doctor._id)}${openCalendar ? "?agenda=1" : ""}`,
    );
  };

  const closeDoctor = useCallback(() => {
    window.history.replaceState({}, "", "/");
    setSelectedDoctorId("");
    setCurrentPath("/");
    setOpenCalendarOnProfile(false);
    setDoctorLookup("idle");
    window.requestAnimationFrame(() =>
      scrollIntoViewSmooth(document.getElementById("directorio")),
    );
  }, []);

  const showingAccount = currentPath === "/cuenta";
  const showingDirectory = currentPath === "/" || currentPath === "/directorio";

  return (
    <div className="app-shell">
      <div className="app-frame">
        <Header
          user={auth.user}
          onLogout={auth.logout}
          searchQuery={directoryQuery}
          onSearchChange={setDirectoryQuery}
          onNavigate={navigateTo}
        />
        <main className="app-main">
          <AnimatePresence mode="wait">
            {showingAccount ? (
              <AccountPage key="account" auth={auth} onNavigate={navigateTo} />
            ) : doctorLoadFailed ? (
              <NotFoundPage
                key="load-error"
                code="ERROR DE CONEXIÓN"
                title="No se pudo cargar el perfil"
                message="Revisa tu conexión e inténtalo de nuevo."
                onBack={closeDoctor}
              />
            ) : doctorNotFound ? (
              <NotFoundPage key="not-found" onBack={closeDoctor} />
            ) : !showingDirectory && !selectedDoctorId ? (
              <NotFoundPage key="not-found" onBack={() => navigateTo("/")} />
            ) : (
              <HomePage
                key="directory"
                doctorsState={doctorsState}
                onSelectDoctor={openDoctor}
                auth={auth}
                query={directoryQuery}
                onQueryChange={setDirectoryQuery}
                visibleDoctorId={selectedDoctorId}
              />
            )}
          </AnimatePresence>
        </main>
        <Footer onNavigate={navigateTo} />
      </div>

      <AnimatePresence>
        {!showingAccount &&
          selectedDoctorId &&
          !doctorNotFound &&
          !doctorLoadFailed && (
            <DoctorPage
              key={selectedDoctorId}
              doctor={selectedDoctor}
              loading={doctorsState.loading || doctorLookup === "pending"}
              initialCalendarOpen={openCalendarOnProfile}
              onBack={closeDoctor}
              onRate={doctorsState.rateDoctor}
              onComment={doctorsState.addComment}
              onUpdateComment={doctorsState.updateComment}
              onDeleteComment={doctorsState.deleteComment}
              auth={auth}
              onNavigate={navigateTo}
            />
          )}
      </AnimatePresence>
    </div>
  );
}
