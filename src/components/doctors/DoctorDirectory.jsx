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
import {
  doctorFirstName,
  doctorInitials,
  doctorPrice,
  doctorRating,
  formatCount,
  matchesDoctorQuery,
} from "./doctorPresentation";

export default function DoctorDirectory({
  doctors,
  loading,
  error,
  onSelectDoctor,
  auth,
  query = "",
  onQueryChange = () => {},
  visibleDoctorId = "",
}) {
  const [compared, setCompared] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("Todas");
  // Los favoritos se leen directo de la cuenta, no de un estado aparte:
  // así el contador y el filtro nunca se desincronizan.
  const favoriteIds = useMemo(
    () => new Set((auth.user?.favoriteDoctorIds || []).map(String)),
    [auth.user],
  );
  // Solo cuentan los guardados que siguen en el directorio.
  const savedDoctors = useMemo(
    () => doctors.filter((doctor) => favoriteIds.has(String(doctor._id))),
    [doctors, favoriteIds],
  );
  const suggestions = doctors
    .filter((doctor) => String(doctor._id) !== String(visibleDoctorId))
    .slice(0, 5);
  const filtered = useMemo(
    () =>
      doctors.filter(
        (doctor) =>
          (selectedSpecialty === "Todas" ||
            doctor.especialidad === selectedSpecialty) &&
          (!favoritesOnly || favoriteIds.has(String(doctor._id))) &&
          matchesDoctorQuery(doctor, query),
      ),
    [doctors, query, selectedSpecialty, favoritesOnly, favoriteIds],
  );

  const specialties = useMemo(
    () => [
      "Todas",
      ...new Set(doctors.map((doctor) => doctor.especialidad).filter(Boolean)),
    ],
    [doctors],
  );

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
    <section
      className={`care-feed${compared.length > 0 ? " has-compare-tray" : ""}`}
      id="directorio"
    >
      <div className="page-width care-feed__page">
        <div className="care-feed-layout">
          <aside
            className="feed-rail feed-rail--left"
            aria-label={
              auth.user
                ? `Espacio de ${auth.user.nombre}`
                : "Información de Yektia"
            }
          >
            <section className="feed-rail-profile">
              <div className="feed-rail-profile__cover">
                <span>
                  {loading
                    ? "Cargando perfiles…"
                    : `${formatCount(doctors.length, "perfil verificado", "perfiles verificados")}`}
                </span>
              </div>
              <div className="feed-rail-profile__content">
                <span className="feed-rail-profile__mark">
                  {auth.user?.nombre?.trim() || "Directorio Yektia"}
                </span>
                <h2>{auth.user ? "Tu espacio en Yektia" : "Especialistas"}</h2>
                {auth.user ? (
                  <>
                    <p className="feed-rail-profile__eyebrow">
                      {auth.user.role === "doctor"
                        ? "Perfil profesional"
                        : "Cuenta personal"}
                    </p>
                    <p>
                      {auth.user.role === "doctor"
                        ? "Gestiona tus datos, disponibilidad y atención."
                        : "Guarda especialistas y revisa tus consultas desde un solo lugar."}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="feed-rail-profile__eyebrow">
                      Directorio médico
                    </p>
                    <p>Perfiles, opiniones y horarios disponibles.</p>
                  </>
                )}
              </div>
            </section>

            <section
              className="feed-rail-card feed-reservation-card"
              aria-labelledby="reservation-guide-title"
            >
              <header>
                <h3 id="reservation-guide-title">Antes de reservar</h3>
              </header>
              <div className="feed-reservation-card__content">
                <p>
                  <strong>Revisa el perfil</strong>
                  <span>
                    Confirma especialidad, cédula, ubicación y precio.
                  </span>
                </p>
                <p>
                  <strong>Elige un horario</strong>
                  <span>
                    Comprueba la disponibilidad antes de enviar tu solicitud.
                  </span>
                </p>
                <p>
                  <strong>Da seguimiento</strong>
                  <span>Consulta la confirmación desde tu cuenta.</span>
                </p>
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
                    {loading
                      ? "Cargando perfiles…"
                      : `${filtered.length} ${filtered.length === 1 ? "perfil" : "perfiles"}`}
                  </span>
                </div>
                <div className="favorite-filter">
                  <button
                    type="button"
                    className={favoritesOnly ? "is-active" : ""}
                    onClick={() => setFavoritesOnly((current) => !current)}
                    aria-pressed={favoritesOnly}
                    aria-label={`Mostrar perfiles guardados${auth.loading ? "" : ` (${savedDoctors.length})`}`}
                    title="Mostrar perfiles guardados"
                  >
                    <FiBookmark aria-hidden="true" />
                    <span className="favorite-filter__label">Guardados</span>
                    {!auth.loading && (
                      <span className="favorite-filter__count">
                        {savedDoctors.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="directory-search">
                <FiSearch aria-hidden="true" />
                <label className="sr-only" htmlFor="directory-search">
                  Buscar especialista
                </label>
                <input
                  id="directory-search"
                  type="search"
                  placeholder="Buscar especialista"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className="directory-search__clear"
                    onClick={() => onQueryChange("")}
                    aria-label="Limpiar búsqueda"
                  >
                    <FiX aria-hidden="true" />
                  </button>
                )}
              </div>

              <nav
                className="feed-categories"
                aria-label="Filtrar por especialidad"
              >
                {specialties.map((specialty) => (
                  <button
                    key={specialty}
                    type="button"
                    className={
                      selectedSpecialty === specialty ? "is-active" : ""
                    }
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
                    isOwnProfile={
                      String(auth.user?.doctorId || "") === String(doctor._id)
                    }
                    isCompared={compared.some(
                      (item) => item._id === doctor._id,
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state feed-empty-state">
                <FiSearch aria-hidden="true" />
                <h3>
                  {favoritesOnly
                    ? "Aún no guardas perfiles"
                    : "No encontramos perfiles"}
                </h3>
                <p>
                  {favoritesOnly
                    ? "Guarda un especialista desde su perfil para verlo aquí."
                    : "Prueba con otro nombre, especialidad o zona."}
                </p>
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

          <aside
            className="feed-rail feed-rail--right"
            aria-label="Especialistas sugeridos y criterios de atención"
          >
            {suggestions.length >= 2 && (
              <section className="feed-rail-card feed-suggest-card">
                <header>
                  <h3>Otros especialistas</h3>
                </header>
                <div className="feed-suggest-list">
                  {suggestions.map((doctor) => (
                    <button
                      className="feed-suggest-item"
                      key={doctor._id}
                      type="button"
                      onClick={() => onSelectDoctor(doctor)}
                      aria-label={`Ver el perfil de ${doctor.nombre}`}
                    >
                      <span className="feed-suggest-avatar" aria-hidden="true">
                        <strong>
                          {doctorInitials(doctor.nombre).toLocaleUpperCase(
                            "es",
                          ) || "E"}
                        </strong>
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
              </section>
            )}

            <section className="feed-rail-card feed-trust-card">
              <header>
                <h3>Nuestros criterios</h3>
              </header>
              <ul>
                <li>
                  <FiShield aria-hidden="true" />
                  <span>
                    <strong>Perfiles verificados</strong>
                    <small>Revisamos las credenciales antes de publicar.</small>
                  </span>
                </li>
                <li>
                  <FiCheck aria-hidden="true" />
                  <span>
                    <strong>Sin posiciones pagadas</strong>
                    <small>
                      Los resultados no se compran ni se patrocinan.
                    </small>
                  </span>
                </li>
                <li>
                  <FiCalendar aria-hidden="true" />
                  <span>
                    <strong>Información actualizada</strong>
                    <small>
                      Disponibilidad, precio y valoraciones ayudan a decidir.
                    </small>
                  </span>
                </li>
              </ul>
            </section>
          </aside>
        </div>

        {compared.length > 0 && (
          <div className="compare-tray" aria-live="polite">
            <div>
              <span>Comparador</span>
              <strong>{`${compared.length} de 3 especialistas`}</strong>
            </div>
            <div className="compare-people">
              {compared.map((doctor) => (
                <span key={doctor._id}>
                  {doctorFirstName(doctor.nombre)}{" "}
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
              if (event.target === event.currentTarget)
                setShowComparison(false);
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
                  const { count, average } = doctorRating(doctor);
                  const price = doctorPrice(doctor);
                  return (
                    <div className="comparison-column" key={doctor._id}>
                      <span className="comparison-doctor">
                        <strong>{doctor.nombre}</strong>
                        <small>{doctor.especialidad}</small>
                      </span>
                      <span>{doctor.descripcion || "Sin descripción"}</span>
                      <span>
                        {count ? (
                          <>
                            <b>{average.toFixed(1)}</b>
                            {` / 5 · ${formatCount(count, "valoración", "valoraciones")}`}
                          </>
                        ) : (
                          "Sin valoraciones"
                        )}
                      </span>
                      <span className="comparison-positive">
                        {doctor.disponibilidad ? (
                          <>
                            <FiCheck /> {doctor.disponibilidad}
                          </>
                        ) : (
                          "Consultar agenda en el perfil"
                        )}
                      </span>
                      <span>{price}</span>
                      <span>{doctor.ubicacion || "Sin ubicación"}</span>
                      <span>Consulta particular</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowComparison(false);
                          onSelectDoctor(doctor);
                        }}
                      >
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
