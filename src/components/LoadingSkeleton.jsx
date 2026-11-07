function Line({ size = "" }) {
  return <span className={`skeleton-line ${size}`} />;
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
function Slots() {
  return (
    <div className="skeleton-content">
      <div className="skeleton-slot-days">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index}>
            <Line />
            <Line size="short" />
          </div>
        ))}
      </div>
      <Line size="short" />
      <div className="skeleton-slot-times">
        {Array.from({ length: 6 }, (_, index) => (
          <Line key={index} size="control" />
        ))}
      </div>
      <Line size="control" />
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
              </div>
            </header>
            <div className="feed-post__body">
              <div className="skeleton-copy">
                <Line />
                <Line />
                <Line size="short" />
              </div>
              <div className="feed-post__summary">
                <div><Line size="short" /><Line size="control" /></div>
                <div><Line size="short" /><Line size="control" /></div>
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
    content = <Slots />;
  } else if (variant === "profile") {
    content = (
      <div className="profile-card profile-card--profile">
        <header className="profile-hero">
          <div className="profile-portrait profile-monogram skeleton-line" />
          <div className="profile-title">
            <div className="profile-badges">
              <Line size="short" />
              <Line size="short" />
            </div>
            <Copy title />
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
            <div className="profile-meta-line">
              <Line size="short" />
            </div>
            <div className="profile-rating">
              <Line size="short" />
              <Line size="short" />
            </div>
            <div className="profile-quick-actions">
              <Line size="control" />
              <Line size="control" />
              <Line size="control" />
            </div>
          </div>
        </header>
        <div className="profile-body">
          <aside className="appointment-brief">
            <Copy title />
            <Slots />
          </aside>
          <section className="patient-voice">
            <Copy title />
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
