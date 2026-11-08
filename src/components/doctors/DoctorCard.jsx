import { useState } from "react";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiLayers,
  FiMapPin,
  FiShield,
} from "react-icons/fi";
import RatingStars from "./RatingStars";
import {
  doctorInitials,
  doctorPrice,
  doctorRating,
} from "./doctorPresentation";

export default function DoctorCard({
  doctor,
  onSelect,
  onCompare,
  isOwnProfile = false,
  isCompared = false,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = doctorInitials(doctor.nombre);
  const { count: ratingCount, average } = doctorRating(doctor);
  const formattedPrice = doctorPrice(doctor);
  const pricePending = doctor.precio === "" || doctor.precio == null;
  const verified = doctor.verificationStatus === "verified";

  return (
    <article className="doctor-card feed-post">
      <div className="feed-post__eyebrow-row">
        <span className="feed-post__kind">
          {verified ? (
            <FiShield aria-hidden="true" />
          ) : (
            <FiClock aria-hidden="true" />
          )}
          {verified ? "Perfil verificado" : "Verificación pendiente"}
        </span>
      </div>

      <header className="feed-post__header">
        <button
          className="feed-doctor-avatar"
          type="button"
          onClick={() => onSelect(doctor)}
          aria-label={`Abrir el perfil de ${doctor.nombre}`}
        >
          {doctor.imagen && !imageFailed ? (
            <img
              src={doctor.imagen}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <strong>{initials}</strong>
          )}
        </button>
        <div className="feed-post__identity">
          <button
            className="feed-post__name"
            type="button"
            onClick={() => onSelect(doctor)}
          >
            {doctor.nombre}
            {verified && <FiCheck role="img" aria-label="Verificado" />}
          </button>
          <p>{doctor.especialidad || "Especialista"}</p>
          <span className="feed-post__location">
            <FiMapPin aria-hidden="true" />
            {doctor.ubicacion || "Ubicación por confirmar"}
          </span>
        </div>
      </header>

      <div className="feed-post__body">
        <p className="feed-post__description">
          {doctor.descripcion ||
            "Consulta su especialidad, ubicación y disponibilidad."}
        </p>
        <div
          className="feed-post__summary"
          aria-label="Resumen del especialista"
        >
          <div className="feed-post__summary-rating">
            <span>Valoración de pacientes</span>
            <div className="feed-post__rating-row">
              <RatingStars value={average} />
              <small>
                {ratingCount
                  ? `${average.toFixed(1)} · ${ratingCount} ${ratingCount === 1 ? "valoración" : "valoraciones"}`
                  : "Aún sin valoraciones"}
              </small>
            </div>
          </div>
          <div className="feed-post__summary-price">
            <span>Consulta particular</span>
            <strong className={pricePending ? "is-pending" : "is-confirmed"}>
              {formattedPrice}
            </strong>
          </div>
        </div>
      </div>

      <div className="feed-post__actions">
        <button
          type="button"
          className="feed-post__action"
          onClick={() => onSelect(doctor, { openCalendar: true })}
        >
          <FiCalendar aria-hidden="true" />
          Disponibilidad
        </button>
        <button
          className={
            isCompared ? "feed-post__action is-active" : "feed-post__action"
          }
          type="button"
          onClick={() => onCompare(doctor)}
          aria-pressed={isCompared}
        >
          <FiLayers aria-hidden="true" />
          {isCompared ? "Comparando" : "Comparar"}
        </button>
      </div>

      {isOwnProfile && (
        <div className="feed-post__own-note">
          <FiCheck aria-hidden="true" /> Estás viendo tu perfil público.
        </div>
      )}
    </article>
  );
}
