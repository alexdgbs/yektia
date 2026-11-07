import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";
import DoctorPage from "./pages/DoctorPage";
import NotFoundPage from "./pages/NotFoundPage";
import { useDoctors } from "./hooks/useDoctors";
import { useAuth } from "./hooks/useAuth";
import AccountPage from "./pages/AccountPage";
import "./styles/index.css";


const getDoctorIdFromPath = () => {
  const encodedId = window.location.pathname.match(/^\/doctores\/(.+)$/)?.[1] || "";
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

  const openDoctor = (doctor, options = {}) => {
    const openCalendar = options.openCalendar === true;
    const url = `/doctores/${encodeURIComponent(doctor._id)}${openCalendar ? "?agenda=1" : ""}`;
    window.history.pushState({ yektiaProfileModal: true }, "", url);
    setSelectedDoctorId(doctor._id);
    setCurrentPath(window.location.pathname);
    setOpenCalendarOnProfile(openCalendar);
  };

  const closeDoctor = useCallback(() => {
    window.history.replaceState({}, "", "/#directorio");
    setSelectedDoctorId("");
    setCurrentPath("/");
    setOpenCalendarOnProfile(false);
    window.requestAnimationFrame(() => {
      document.getElementById("directorio")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  }, []);

  const showingAccount = currentPath === "/cuenta";

  return (
    <div className="app-shell">
      <div className="app-frame">
        <Header
          user={auth.user}
          onLogout={auth.logout}
          searchQuery={directoryQuery}
          onSearchChange={setDirectoryQuery}
        />
        <main className="app-main">
          <AnimatePresence mode="wait">
            {showingAccount ? (
              <AccountPage key="account" auth={auth} />
            ) : currentPath !== "/" && !selectedDoctorId ? (
              <NotFoundPage key="not-found" onBack={() => window.location.assign("/")} />
            ) : (
              <HomePage
                key="directory"
                doctorsState={doctorsState}
                onSelectDoctor={openDoctor}
                auth={auth}
                query={directoryQuery}
                onQueryChange={setDirectoryQuery}
              />
            )}
          </AnimatePresence>
        </main>
        <Footer />
      </div>

      <AnimatePresence>
        {!showingAccount && selectedDoctorId && (
          <DoctorPage
            key={selectedDoctorId}
            doctor={selectedDoctor}
            loading={doctorsState.loading}
            initialCalendarOpen={openCalendarOnProfile}
            onBack={closeDoctor}
            onRate={doctorsState.rateDoctor}
            onComment={doctorsState.addComment}
            onUpdateComment={doctorsState.updateComment}
            onDeleteComment={doctorsState.deleteComment}
            auth={auth}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
