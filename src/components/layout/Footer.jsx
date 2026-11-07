export default function Footer({ onNavigate }) {
  const go = (event, path) => {
    event.preventDefault();
    onNavigate?.(path);
  };

  return (
    <footer className="site-footer--compact">
      <div className="page-width footer-main-compact">
        <div className="footer-brand">
          <a className="brand" href="/" onClick={(event) => go(event, "/")}>
            Yektia
          </a>
          <nav className="footer-links" aria-label="Enlaces del pie">
            <a href="/" onClick={(event) => go(event, "/")}>
              Directorio
            </a>
            <a href="/cuenta" onClick={(event) => go(event, "/cuenta")}>
              Mi cuenta
            </a>
          </nav>
          <p>© 2026 Yektia</p>
        </div>
      </div>
    </footer>
  );
}
