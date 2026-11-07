export default function Footer({ onNavigate }) {
  const go = (event, path) => {
    event.preventDefault();
    onNavigate?.(path);
  };

  return (
    <footer className="site-footer">
      <div className="page-width footer-main">
        <div className="footer-brand">
          <a className="brand" href="/" onClick={(event) => go(event, "/")}>
            <img
              className="brand-mark"
              src="/favicon.svg"
              alt=""
              aria-hidden="true"
            />
            Yektia
          </a>
          <p>© 2026 Yektia</p>
        </div>
        <nav className="footer-links" aria-label="Enlaces del pie">
          <span className="footer-links__title">Explorar</span>
          <a href="/" onClick={(event) => go(event, "/")}>
            Directorio
          </a>
          <a href="/cuenta" onClick={(event) => go(event, "/cuenta")}>
            Mi cuenta
          </a>
        </nav>
        <p className="footer-note">
          La información del directorio no sustituye la consulta médica.
        </p>
      </div>
    </footer>
  );
}
