import { useEffect, useMemo, useState } from "react";
import {
  FiBookmark,
  FiCalendar,
  FiCheck,
  FiSearch,
  FiShield,
  FiX,
} from "react-icons/fi";
import LoadingSkeleton from "../LoadingSkeleton";
import DoctorCard from "./DoctorCard";

export default function DoctorDirectory({
  doctors,
  loading,
  error,
  onSelectDoctor,
  auth,
  query = "",
  onQueryChange = () => {},
}) {
  const [compared, setCompared] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("Todas");
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const accountUserId = auth.user
    ? String(auth.user.email || auth.user.id || auth.user._id || "authenticated")
    : null;
  const accountFavoritesKey = [...(auth.user?.favoriteDoctorIds || [])]
    .map(String)
    .sort()
    .join(",");
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    return doctors.filter(
      (doctor) =>
        (selectedSpecialty === "Todas" ||
          doctor.especialidad === selectedSpecialty) &&
        (!favoritesOnly || favoriteIds.has(String(doctor._id))) &&
        (!q ||
          `${doctor.nombre} ${doctor.especialidad} ${doctor.ubicacion || ""}`
            .toLocaleLowerCase("es")
            .includes(q)),
    );
  }, [doctors, query, selectedSpecialty, favoritesOnly, favoriteIds]);

  const specialties = useMemo(
    () => [
      "Todas",
      ...new Set(
        doctors.map((doctor) => doctor.especialidad).filter(Boolean),
      ),
    ],
    [doctors],
  );

  useEffect(() => {
    setFavoriteIds(new Set(accountFavoritesKey.split(",").filter(Boolean)));
  }, [accountUserId, accountFavoritesKey]);

  useEffect(() => {
    if (!showComparison) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowComparison(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showComparison]);

  const toggleCompare = (doctor) =>
    setCompared((current) => {
      if (current.some((item) => item._id === doctor._id)) {
        return current.filter((item) => item._id !== doctor._id);
      }
      return current.length < 3 ? [...current, doctor] : current;
    });

  return (
    <section className="care-feed" id="directorio">
      <div className="page-width care-feed__page">
        <div className="care-feed-layout">
          <aside className="feed-rail feed-rail--left" aria-label={auth.user ? `Espacio de ${auth.user.nombre}` : "Información de Yektia"}>
            <section className="feed-rail-profile">
              <div className="feed-rail-profile__cover" aria-hidden="true" />
              <div className="feed-rail-profile__content">
                <span className="feed-rail-profile__mark">
                  {auth.user?.nombre?.trim() || "yektia"}
                </span>
                <h2>{auth.user ? "Tu espacio en Yektia" : "Especialistas"}</h2>
                {auth.user ? (
                  <>
                    <p className="feed-rail-profile__eyebrow">
                      {auth.user.role === "doctor" ? "Perfil profesional" : "Cuenta personal"}
                    </p>
                    <p>
                      {auth.user.role === "doctor"
                        ? "Gestiona tus datos, disponibilidad y atención."
                        : "Guarda especialistas y revisa tus consultas desde un solo lugar."}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="feed-rail-profile__eyebrow">Directorio médico</p>
                    <p>
                      Perfiles, opiniones y horarios disponibles.
                    </p>
                  </>
                )}
              </div>
            </section>

            <section className="feed-rail-card feed-reservation-card" aria-labelledby="reservation-guide-title">
              <header>
                <h3 id="reservation-guide-title">Antes de reservar</h3>
              </header>
              <div className="feed-reservation-card__content">
                <p><strong>Revisa el perfil</strong><span>Confirma especialidad, cédula, ubicación y precio.</span></p>
                <p><strong>Elige un horario</strong><span>Comprueba la disponibilidad antes de enviar tu solicitud.</span></p>
                <p><strong>Da seguimiento</strong><span>Consulta la confirmación desde tu cuenta.</span></p>
              </div>
            </section>
          </aside>

          <div className="feed-main" id="listado-especialistas">
            <section
              className="feed-discovery-card"
              aria-label="Buscar y filtrar especialistas"
            >
              <h2 className="sr-only">Especialistas para ti</h2>
              <div className="feed-toolbar">
                <div className="feed-toolbar__context">
                  <h2>
                    {query.trim()
                      ? `Resultados para “${query.trim()}”`
                      : selectedSpecialty === "Todas"
                        ? "Especialistas para conocer"
                        : selectedSpecialty}
                  </h2>
                  <span className="search-count" aria-live="polite">
                    {loading ? "Cargando perfiles…" : `${filtered.length} ${filtered.length === 1 ? "perfil" : "perfiles"}`}
                  </span>
                </div>
                <div className="favorite-filter">
                  <button
                    type="button"
                    className={favoritesOnly ? "is-active" : ""}
                    onClick={() => setFavoritesOnly((current) => !current)}
                    aria-pressed={favoritesOnly}
                    aria-label={`Mostrar perfiles guardados (${favoriteIds.size})`}
                    title="Mostrar perfiles guardados"
                  >
                    <FiBookmark aria-hidden="true" />
                    <span className="favorite-filter__label">Guardados</span>
                    <span className="favorite-filter__count">{favoriteIds.size}</span>
                  </button>
                </div>
              </div>

              <nav
                className="feed-categories"
                aria-label="Filtrar por especialidad"
              >
                {specialties.map((specialty) => (
                  <button
                    key={specialty}
                    type="button"
                    className={selectedSpecialty === specialty ? "is-active" : ""}
                    onClick={() => setSelectedSpecialty(specialty)}
                    aria-pressed={selectedSpecialty === specialty}
                  >
                    {specialty}
                  </button>
                ))}
              </nav>
            </section>

            {error && (
              <div className="notice" role="status">
                {error}
              </div>
            )}
            {loading ? (
              <LoadingSkeleton
                variant="feed"
                count={3}
                label="Cargando especialistas"
              />
            ) : filtered.length ? (
              <div className="feed-post-list">
                {filtered.map((doctor) => (
                  <DoctorCard
                    key={doctor._id}
                    doctor={doctor}
                    onSelect={onSelectDoctor}
                    onCompare={toggleCompare}
                    isOwnProfile={String(auth.user?.doctorId || "") === String(doctor._id)}
                    isCompared={compared.some((item) => item._id === doctor._id)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state feed-empty-state">
                <FiSearch aria-hidden="true" />
                <h3>No encontramos perfiles</h3>
                <p>Prueba con otro nombre, especialidad o zona.</p>
                <button
                  className="feed-reset-button"
                  type="button"
                  onClick={() => {
                    onQueryChange("");
                    setFavoritesOnly(false);
                    setSelectedSpecialty("Todas");
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          <aside className="feed-rail feed-rail--right" aria-label="Especialistas sugeridos y criterios de atención">
            <section className="feed-rail-card feed-suggest-card">
              <header>
                <h3>Otros especialistas</h3>
              </header>
              {doctors.length ? (
                <div className="feed-suggest-list">
                  {doctors.slice(0, 5).map((doctor) => (
                    <button
                      className="feed-suggest-item"
                      key={doctor._id}
                      type="button"
                      onClick={() => onSelectDoctor(doctor)}
                      aria-label={`Ver el perfil de ${doctor.nombre}`}
                    >
                      <span className="feed-suggest-avatar" aria-hidden="true">
                        <strong>{doctor.nombre?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("es") || "E"}</strong>
                        {doctor.imagen && (
                          <img
                            src={doctor.imagen}
                            alt=""
                            loading="lazy"
                            onError={(event) => event.currentTarget.remove()}
                          />
                        )}
                      </span>
                      <span className="feed-suggest-item__copy">
                        <strong>{doctor.nombre}</strong>
                        <small>{doctor.especialidad || "Especialista"}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="feed-suggest-empty">Los perfiles de especialistas aparecerán aquí cuando estén disponibles.</p>
              )}
            </section>

            <section className="feed-rail-card feed-trust-card">
              <header>
                <h3>Nuestros criterios</h3>
              </header>
              <ul>
                <li>
                  <FiShield aria-hidden="true" />
                  <span><strong>Perfiles verificados</strong><small>Revisamos las credenciales antes de publicar.</small></span>
                </li>
                <li>
                  <FiCheck aria-hidden="true" />
                  <span><strong>Sin posiciones pagadas</strong><small>Los resultados no se compran ni se patrocinan.</small></span>
                </li>
                <li>
                  <FiCalendar aria-hidden="true" />
                  <span><strong>Información actualizada</strong><small>Disponibilidad, precio y valoraciones ayudan a decidir.</small></span>
                </li>
              </ul>
            </section>
          </aside>
        </div>

        {compared.length > 0 && (
          <div className="compare-tray" aria-live="polite">
            <div>
              <span>Comparador</span>
              <strong>{compared.length} de 3 especialistas</strong>
            </div>
            <div className="compare-people">
              {compared.map((doctor) => (
                <span key={doctor._id}>
                  {doctor.nombre.replace(/^(Dra?\.)\s/, "").split(" ")[0]}{" "}
                  <button
                    type="button"
                    onClick={() => toggleCompare(doctor)}
                    aria-label={`Quitar a ${doctor.nombre}`}
                  >
                    <FiX />
                  </button>
                </span>
              ))}
            </div>
            <button
              className="compare-action"
              type="button"
              disabled={compared.length < 2}
              onClick={() => setShowComparison(true)}
            >
              Comparar ahora
            </button>
          </div>
        )}

        {showComparison && (
          <div
            className="comparison-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowComparison(false);
            }}
          >
            <section
              className="comparison-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="comparison-title"
            >
              <header>
                <div>
                  <span className="eyebrow">Decide con contexto</span>
                  <h2 id="comparison-title">Comparar especialistas</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowComparison(false)}
                  aria-label="Cerrar comparación"
                  title="Cerrar comparación"
                >
                  <FiX />
                </button>
              </header>
              <div className="comparison-table">
                <div className="comparison-labels">
                  <span>Especialista</span>
                  <span>Descripción</span>
                  <span>Valoración</span>
                  <span>Disponibilidad</span>
                  <span>Consulta</span>
                  <span>Ubicación</span>
                  <span>Modalidad</span>
                  <span />
                </div>
                {compared.map((doctor) => {
                  const count = Math.max(0, Number(doctor.ratingCount) || 0);
                  const average = count ? Number(doctor.promedio) || 0 : 0;
                  const price = Number(doctor.precio);
                  return (
                    <div className="comparison-column" key={doctor._id}>
                      <span className="comparison-doctor">
                        <strong>{doctor.nombre}</strong>
                        <small>{doctor.especialidad}</small>
                      </span>
                      <span>{doctor.descripcion || "Por confirmar"}</span>
                      <span>
                        {count ? (
                          <><b>{average.toFixed(1)}</b> / 5 · {count} {count === 1 ? "valoración" : "valoraciones"}</>
                        ) : "Sin valoraciones"}
                      </span>
                      <span className="comparison-positive">
                        {doctor.disponibilidad ? <><FiCheck /> {doctor.disponibilidad}</> : "Consultar agenda en el perfil"}
                      </span>
                      <span>
                        {price > 0
                          ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(price)
                          : "Por confirmar"}
                      </span>
                      <span>{doctor.ubicacion || "Por confirmar"}</span>
                      <span>Consulta particular</span>
                      <button type="button" onClick={() => { setShowComparison(false); onSelectDoctor(doctor); }}>
                        Ver perfil
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
