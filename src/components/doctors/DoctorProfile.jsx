import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiHeart,
  FiMapPin,
  FiMessageCircle,
  FiX,
} from "react-icons/fi";
import RatingStars from "./RatingStars";
import {
  doctorInitials,
  doctorPrice,
  doctorRating,
  formatDate,
} from "./doctorPresentation";
import { getAccountKey } from "../../hooks/useAuth";
import AppointmentPicker from "../appointments/AppointmentPicker";
import { scrollIntoViewSmooth } from "../../utils/scroll";

export default function DoctorProfile({
  doctor,
  onRate,
  onComment,
  onUpdateComment,
  onDeleteComment,
  auth,
  initialCalendarOpen = false,
  onNavigate,
  escapeRef,
}) {
  const [rating, setRating] = useState(doctor.myRating || 0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState("");
  const [commentActionStatus, setCommentActionStatus] = useState("");
  const [showCalendar, setShowCalendar] = useState(initialCalendarOpen);
  const [showReviewComposer, setShowReviewComposer] = useState(false);
  const [favoriteNotice, setFavoriteNotice] = useState({
    userId: "",
    text: "",
  });
  const [savedOverride, setSavedOverride] = useState(null);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const reviewComposerRef = useRef(null);
  const accountKey = getAccountKey(auth.user);
  const savedInAccount = (auth.user?.favoriteDoctorIds || []).some(
    (savedId) => String(savedId) === String(doctor._id),
  );
  const isSaved =
    savedOverride && savedOverride.userId === accountKey
      ? savedOverride.isSaved
      : savedInAccount;
  const favoriteNoticeText =
    favoriteNotice.userId === accountKey ? favoriteNotice.text : "";

  const setAgendaParam = (open) => {
    const url = new URL(window.location.href);
    if (open) url.searchParams.set("agenda", "1");
    else url.searchParams.delete("agenda");
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const closeCalendar = useCallback(() => {
    setShowCalendar(false);
    setAgendaParam(false);
  }, []);

  const openCalendar = useCallback(() => {
    setShowCalendar(true);
    setShowReviewComposer(false);
    setAgendaParam(true);
  }, []);

  useEffect(() => {
    setShowCalendar(initialCalendarOpen);
  }, [initialCalendarOpen]);

  useEffect(() => {
    if (!escapeRef) return undefined;
    escapeRef.current = () => {
      if (!showCalendar && !showReviewComposer) return false;
      closeCalendar();
      setShowReviewComposer(false);
      return true;
    };
    return () => {
      escapeRef.current = null;
    };
  }, [showCalendar, showReviewComposer, closeCalendar, escapeRef]);

  useEffect(() => {
    if (!showReviewComposer) return;
    scrollIntoViewSmooth(reviewComposerRef.current, "nearest");
  }, [showReviewComposer]);

  const toggleFavorite = async () => {
    if (favoriteSaving) return;
    if (!auth.user) {
      setFavoriteNotice({
        userId: "",
        text: "Inicia sesión para sincronizar tus especialistas guardados.",
      });
      return;
    }

    const previous = isSaved;
    const favoriteIds = [
      ...new Set((auth.user.favoriteDoctorIds || []).map(String)),
    ];
    const next = previous
      ? favoriteIds.filter((savedId) => savedId !== String(doctor._id))
      : [...favoriteIds, String(doctor._id)];

    setFavoriteSaving(true);
    setSavedOverride({ userId: accountKey, isSaved: !previous });
    setFavoriteNotice({ userId: accountKey, text: "" });
    try {
      await auth.syncFavorites(next);
      setSavedOverride(null);
      setFavoriteNotice({
        userId: accountKey,
        text: !previous
          ? "Especialista guardado en favoritos."
          : "Especialista eliminado de favoritos.",
      });
    } catch {
      setSavedOverride({ userId: accountKey, isSaved: previous });
      setFavoriteNotice({
        userId: accountKey,
        text: "No pudimos actualizar tus favoritos. Intenta de nuevo.",
      });
    } finally {
      setFavoriteSaving(false);
    }
  };

  const submitRating = async (value) => {
    if (!auth.user) {
      setStatus("Inicia sesión para valorar a este especialista.");
      return;
    }
    const previous = rating;
    setRating(value);
    setStatus("");
    try {
      await onRate(doctor._id, value);
      setStatus(
        value ? "Tu valoración fue guardada." : "Tu valoración fue eliminada.",
      );
    } catch (error) {
      setRating(previous);
      setStatus(error.message);
    }
  };
  const submitComment = async (event) => {
    event.preventDefault();
    if (!auth.user) {
      setStatus("Inicia sesión para publicar una opinión.");
      return;
    }
    if (!comment.trim()) return;
    setStatus("");
    try {
      await onComment(doctor._id, comment.trim());
      setComment("");
      setStatus("Tu comentario fue enviado.");
    } catch (error) {
      setStatus(error.message);
    }
  };
  const saveComment = async (event) => {
    event.preventDefault();
    if (!editingText.trim()) return;
    setCommentActionStatus("");
    try {
      await onUpdateComment(doctor._id, editingCommentId, editingText.trim());
      setEditingCommentId("");
      setEditingText("");
      setCommentActionStatus("Comentario actualizado.");
    } catch (error) {
      setCommentActionStatus(error.message);
    }
  };
  const removeComment = async (commentId) => {
    setCommentActionStatus("");
    try {
      await onDeleteComment(doctor._id, commentId);
      setDeletingCommentId("");
      setCommentActionStatus("Comentario eliminado.");
    } catch (error) {
      setCommentActionStatus(error.message);
    }
  };
  const initials = doctorInitials(doctor.nombre);
  const { count: ratingCount, average } = doctorRating(doctor);
  const isOwnProfile = String(auth.user?.doctorId || "") === String(doctor._id);
  const openAccount = () => {
    onNavigate?.("/cuenta");
  };
  const renderComment = (item, index) => (
    <article className="review" key={item._id || index}>
      <div className="review-content">
        <header>
          <div className="review-author">
            <strong>{item.nombre || "Paciente"}</strong>
            {item.fecha && formatDate(item.fecha) && (
              <time dateTime={item.fecha}>{formatDate(item.fecha)}</time>
            )}
          </div>
          {item.isMine && (
            <div className="comment-actions">
              {editingCommentId !== item._id && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCommentId(item._id);
                    setEditingText(item.texto);
                    setDeletingCommentId("");
                    setCommentActionStatus("");
                  }}
                >
                  Editar
                </button>
              )}
              {deletingCommentId === item._id ? (
                <>
                  <span>¿Eliminar?</span>
                  <button
                    className="danger-text"
                    type="button"
                    onClick={() => removeComment(item._id)}
                  >
                    Sí, eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCommentId("")}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDeletingCommentId(item._id);
                    setEditingCommentId("");
                    setCommentActionStatus("");
                  }}
                >
                  Eliminar
                </button>
              )}
            </div>
          )}
        </header>
        {editingCommentId === item._id ? (
          <form className="review-edit-form" onSubmit={saveComment}>
            <textarea
              value={editingText}
              onChange={(event) => setEditingText(event.target.value)}
              rows="3"
              maxLength="800"
              required
            />
            <div>
              <button type="submit">Guardar</button>
              <button
                type="button"
                onClick={() => {
                  setEditingCommentId("");
                  setEditingText("");
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <p>{item.texto}</p>
        )}
      </div>
    </article>
  );
  return (
    <article className="profile-card profile-card--profile">
      <header className="profile-hero">
        <div
          className={`profile-portrait profile-monogram ${
            doctor.imagen && !imageFailed ? "has-image" : "has-initials"
          }`}
          role="img"
          aria-label={`Retrato de ${doctor.nombre}`}
        >
          {doctor.imagen && !imageFailed ? (
            <img
              className="profile-portrait__image"
              src={doctor.imagen}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <strong>{initials}</strong>
          )}
        </div>

        <div className="profile-title">
          <div className="profile-badges">
            <span className="specialty">
              {doctor.especialidad || "Especialista"}
            </span>
          </div>
          <h1 id="doctor-profile-title">{doctor.nombre}</h1>
          <p className="profile-description">
            {doctor.descripcion || "Descripción profesional por confirmar."}
          </p>

          <div className="profile-meta-line">
            <FiMapPin aria-hidden="true" />
            <span>{doctor.ubicacion || "Ubicación por confirmar"}</span>
          </div>
          <div className="profile-rating">
            <RatingStars value={average} />
            <span>
              {ratingCount
                ? `${ratingCount} ${ratingCount === 1 ? "valoración" : "valoraciones"}`
                : "Aún sin valoraciones"}
            </span>
          </div>
          <div className="profile-price">
            <span>Consulta particular</span>
            <strong
              className={
                doctor.precio === "" || doctor.precio == null
                  ? "is-pending"
                  : ""
              }
            >
              {doctorPrice(doctor)}
            </strong>
          </div>
          {!isOwnProfile && (
            <div
              className="profile-quick-actions"
              aria-label="Acciones del perfil"
            >
              <button
                className={`profile-quick-action profile-quick-action--favorite ${isSaved ? "is-saved" : ""}`}
                type="button"
                onClick={toggleFavorite}
                disabled={favoriteSaving}
                aria-busy={favoriteSaving}
                aria-pressed={isSaved}
                aria-label={
                  isSaved ? "Quitar de favoritos" : "Guardar en favoritos"
                }
                title={isSaved ? "Quitar de favoritos" : "Guardar en favoritos"}
              >
                <FiHeart aria-hidden="true" />
                <span>{isSaved ? "Guardado" : "Favoritos"}</span>
              </button>
              <button
                className={`profile-quick-action profile-quick-action--review ${showReviewComposer ? "is-active" : ""}`}
                type="button"
                aria-expanded={showReviewComposer}
                aria-controls="review-composer-panel"
                aria-label={
                  showReviewComposer ? "Cerrar opinión" : "Escribir opinión"
                }
                onClick={() => {
                  closeCalendar();
                  setShowReviewComposer((current) => !current);
                }}
              >
                <FiMessageCircle aria-hidden="true" />
                <span>
                  {showReviewComposer ? "Cerrar opinión" : "Escribir opinión"}
                </span>
              </button>
              <button
                className={`profile-quick-action profile-quick-action--calendar ${showCalendar ? "is-active" : ""}`}
                type="button"
                aria-expanded={showCalendar}
                aria-controls="appointment-picker-panel"
                aria-label={
                  showCalendar ? "Ocultar horarios" : "Ver disponibilidad"
                }
                title={showCalendar ? "Ocultar horarios" : "Ver disponibilidad"}
                onClick={() => {
                  if (showCalendar) closeCalendar();
                  else openCalendar();
                }}
              >
                <FiCalendar aria-hidden="true" />
                <span>
                  {showCalendar ? "Ocultar horarios" : "Disponibilidad"}
                </span>
              </button>
            </div>
          )}
          {favoriteNoticeText && (
            <p className="profile-favorite-notice" role="status">
              {favoriteNoticeText}
              {!auth.user && " "}
              {!auth.user && (
                <a
                  href="/cuenta"
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate?.("/cuenta");
                  }}
                >
                  Iniciar sesión
                </a>
              )}
            </p>
          )}
        </div>
        <section
          className="professional-summary"
          aria-labelledby="professional-summary-title"
        >
          <h2 id="professional-summary-title">Información profesional</h2>
          <dl className="professional-details">
            <div>
              <dt>Cédula profesional</dt>
              <dd>{doctor.cedula || "No disponible"}</dd>
            </div>
            <div>
              <dt>Idiomas</dt>
              <dd>
                {doctor.idiomas?.length
                  ? doctor.idiomas.join(" · ")
                  : "No especificado"}
              </dd>
            </div>
            {doctor.disponibilidad?.trim() && (
              <div>
                <dt>Disponibilidad</dt>
                <dd>{doctor.disponibilidad}</dd>
              </div>
            )}
            {doctor.seguros?.length > 0 && (
              <div>
                <dt>Seguros</dt>
                <dd>{doctor.seguros.join(" · ")}</dd>
              </div>
            )}
            <div>
              <dt>
                {doctor.verificationStatus === "verified" ? (
                  <FiCheck aria-hidden="true" />
                ) : (
                  <FiClock className="is-pending" aria-hidden="true" />
                )}
                Verificación
              </dt>
              <dd>
                {doctor.verificationStatus === "verified"
                  ? "Revisado por la plataforma"
                  : "Pendiente"}
              </dd>
            </div>
            <div>
              <dt>
                <FiClock aria-hidden="true" />
                Actualizado
              </dt>
              <dd>{formatDate(doctor.updatedAt, "Fecha no disponible")}</dd>
            </div>
          </dl>
        </section>
      </header>

      <div className="profile-body">
        {isOwnProfile && (
          <section className="profile-owner-panel">
            <div>
              <span className="eyebrow">Vista pública</span>
              <h2>Este es tu perfil</h2>
              <p>
                Administra tus datos profesionales y horarios desde tu cuenta.
              </p>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={openAccount}
            >
              Administrar perfil
            </button>
          </section>
        )}
        {!isOwnProfile && showCalendar && (
          <aside className="appointment-brief is-open">
            <div className="appointment-summary">
              <div>
                <span>Agenda de consulta</span>
              </div>
              <button
                className="appointment-close"
                type="button"
                aria-label="Cerrar horarios"
                title="Cerrar horarios"
                onClick={closeCalendar}
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
            <div
              id="appointment-picker-panel"
              className="profile-disclosure-panel"
            >
              <AppointmentPicker
                doctor={doctor}
                auth={auth}
                onNavigate={onNavigate}
              />
            </div>
          </aside>
        )}

        <section
          className="patient-voice"
          aria-labelledby="patient-voice-title"
        >
          <header className="patient-voice__header">
            <span className="eyebrow">Pacientes</span>
            <h2 id="patient-voice-title">Opiniones</h2>
          </header>
          <div className="review-list">
            {(doctor.comentarios || []).length ? (
              [...doctor.comentarios].reverse().map(renderComment)
            ) : (
              <p className="muted">Aún no hay opiniones.</p>
            )}
          </div>
          {commentActionStatus && (
            <p className="form-status" role="status">
              {commentActionStatus}
            </p>
          )}
          {!isOwnProfile && showReviewComposer && (
            <div className="review-composer" ref={reviewComposerRef}>
              <div className="review-composer__open" id="review-composer-panel">
                <div className="review-composer__heading">
                  <div>
                    <span className="eyebrow">Deja una opinión</span>
                    <h3>¿Cómo fue tu consulta?</h3>
                    <p>Califica del 1 al 5 y deja un comentario.</p>
                  </div>
                  <button
                    className="review-composer__close"
                    type="button"
                    aria-label="Cerrar formulario de opinión"
                    title="Cerrar formulario"
                    onClick={() => setShowReviewComposer(false)}
                  >
                    <FiX aria-hidden="true" />
                  </button>
                </div>
                <div className="your-rating">
                  <div>
                    <strong>Tu calificación</strong>
                    <p>De 1 a 5 estrellas.</p>
                  </div>
                  <RatingStars
                    value={rating}
                    interactive
                    onChange={submitRating}
                    label="Tu calificación"
                  />
                </div>
                <form className="review-form" onSubmit={submitComment}>
                  <label>
                    <span>Comentario</span>
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows="4"
                      maxLength="800"
                      placeholder="Escribe un comentario sobre tu consulta."
                      required
                    />
                  </label>
                  <div className="review-form__footer">
                    <p className="review-identity">
                      {auth.user
                        ? `Publicarás como ${auth.user.nombre}.`
                        : "Inicia sesión para publicar."}
                    </p>
                    <button className="primary-button" type="submit">
                      Publicar opinión
                    </button>
                  </div>
                  {status && (
                    <p className="form-status" role="status">
                      {status}
                    </p>
                  )}
                </form>
              </div>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
