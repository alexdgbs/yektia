function Line({ size = "", extra = false }) {
  return (
    <span
      className={`skeleton-line ${size}${extra ? " skeleton-line--extra" : ""}`}
    />
  );
}
function Copy({ title = false }) {
  return (
    <div className="skeleton-copy">
      <Line size={title ? "title" : "short"} />
      <Line />
      <Line size="short" />
    </div>
  );
}
function Fields({ count = 4 }) {
  return (
    <div className="skeleton-fields">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <Line size="short" />
          <Line size="control" />
        </div>
      ))}
    </div>
  );
}
// Esqueleto con la forma del calendario de disponibilidad: barra, meses
// con su rejilla de días y leyenda. En móvil solo se ve un mes, igual que
// el calendario real (1 mes si el ancho es de 620px o menos).
function CalendarSkeleton() {
  return (
    <div className="appointment-calendar" aria-hidden="true">
      <div className="appointment-calendar__toolbar">
        <div>
          <span className="skeleton-line skeleton-calendar-eyebrow" />
          <span className="skeleton-line skeleton-calendar-title" />
        </div>
        <div className="appointment-calendar__navigation">
          <span className="skeleton-line skeleton-calendar-nav" />
          <span className="skeleton-line skeleton-calendar-nav" />
        </div>
      </div>
      <div className="appointment-calendar__months">
        {Array.from({ length: 2 }, (_, month) => (
          <section className="appointment-month" key={month}>
            <span className="skeleton-line skeleton-month-title" />
            <div className="appointment-month__weekdays">
              {Array.from({ length: 7 }, (_, index) => (
                <span
                  key={index}
                  className="skeleton-line skeleton-weekday"
                />
              ))}
            </div>
            <div className="appointment-month__days">
              {Array.from({ length: 42 }, (_, index) => (
                <span
                  key={index}
                  className="appointment-day appointment-day--skeleton"
                >
                  <span className="skeleton-line skeleton-day-num" />
                  <span className="skeleton-line skeleton-day-count" />
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="appointment-calendar__legend">
        <span className="skeleton-line skeleton-legend" />
        <span className="skeleton-line skeleton-legend" />
      </div>
    </div>
  );
}
export default function LoadingSkeleton({
  variant = "form",
  label = "Cargando información de tu cuenta",
  count = 3,
}) {
  let content;
  if (variant === "feed") {
    content = (
      <div className="feed-post-list">
        {Array.from({ length: count }, (_, index) => (
          <article className="doctor-card feed-post feed-post--skeleton" key={index}>
            <div className="feed-post__eyebrow-row">
              <Line size="short" />
            </div>
            <header className="feed-post__header">
              <span className="feed-doctor-avatar skeleton-line" />
              <div className="feed-post__identity">
                <Line size="title" />
                <Line size="short" />
                <Line size="short" />
                <Line size="short" extra />
              </div>
            </header>
            <div className="feed-post__body">
              <div className="skeleton-copy">
                <Line />
                <Line />
                <Line size="short" />
                <Line size="short" extra />
              </div>
              <div className="feed-post__summary">
                <div>
                  <Line size="short" />
                  <Line size="control" />
                </div>
              </div>
            </div>
            <div className="feed-post__actions">
              <Line size="control" />
              <Line size="control" />
            </div>
          </article>
        ))}
      </div>
    );
  } else if (variant === "appointments") {
    content = (
      <section className="appointments-list">
        <Line size="title" />
        {Array.from({ length: count }, (_, index) => (
          <article key={index}>
            <Copy title />
            <Line size="control" />
            <Line size="control" />
          </article>
        ))}
      </section>
    );
  } else if (variant === "admin") {
    content = (
      <div className="admin-layout">
        <aside>
          <Line size="title" />
          {Array.from({ length: count }, (_, index) => (
            <Copy key={index} />
          ))}
        </aside>
        <section className="application-review">
          <Copy title />
          <div className="skeleton-form">
            <Fields count={6} />
            <Copy title />
            <Fields count={2} />
          </div>
        </section>
      </div>
    );
  } else if (variant === "slots") {
    content = <CalendarSkeleton />;
  } else if (variant === "profile") {
    content = (
      <div className="profile-card profile-card--profile">
        <header className="profile-hero">
          <div className="profile-portrait profile-monogram skeleton-line" />
          <div className="profile-title">
            <div className="profile-badges">
              <Line size="short" />
            </div>
            <div className="skeleton-copy">
              <Line size="title" />
              <Line />
              <Line size="short" />
              <Line extra />
            </div>
            <div className="profile-meta-line">
              <Line size="short" />
              <Line size="short" extra />
            </div>
            <div className="profile-price">
              <Line size="short" />
              <Line size="short" />
            </div>
            <div className="profile-quick-actions">
              <Line size="control" />
              <Line size="control" />
              <Line size="control" />
            </div>
          </div>
          <section className="professional-summary" aria-hidden="true">
            <Line size="short" />
            <div className="professional-details">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index}>
                  <Line size="short" />
                  <Line size="short" />
                </div>
              ))}
            </div>
          </section>
        </header>
        <div className="profile-body">
          <section className="patient-voice">
            <Copy title />
          </section>
        </div>
      </div>
    );
  } else if (variant === "account") {
    content = (
      <div className="dashboard account-shell page-width">
        <aside className="account-sidebar" aria-hidden="true">
          <nav className="account-sidebar__nav">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} className="skeleton-line skeleton-nav-item" />
            ))}
          </nav>
          <span className="skeleton-line skeleton-nav-item" />
        </aside>
        <div className="account-main">
          <section className="account-profile-card">
            <span className="account-profile-avatar skeleton-line" />
            <div className="account-profile-card__copy">
              <Line size="short" />
              <Line size="title" />
              <Line />
              <Line size="short" />
            </div>
            <Line size="control" />
          </section>
          <section className="account-next">
            <div>
              <Line size="short" />
              <Line size="title" />
              <Line />
            </div>
            <Line size="control" />
          </section>
        </div>
      </div>
    );
  } else {
    content = (
      <section
        className={`settings-panel ${variant === "schedule" ? "schedule-settings" : ""}`}
      >
        <header>
          <Copy title />
        </header>
        <div className="skeleton-form">
          <Fields count={variant === "schedule" ? 6 : 4} />
          {variant === "schedule" && <Copy />}
          <Line size="control" />
        </div>
      </section>
    );
  }
  return (
    <div
      role="status"
      aria-label={label}
      className={`skeleton-loading skeleton-loading--${variant}`}
    >
      <div aria-hidden="true">{content}</div>
    </div>
  );
}
