export default function Footer({ onNavigate }) {
  return (
    <footer className="site-footer--compact">
      <div className="page-width footer-main-compact">
        <div className="footer-brand">
          <a
            className="brand"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onNavigate?.("/");
            }}
          >
            Yektia
          </a>
          <p>Información médica para decidir con contexto.</p>
        </div>
      </div>
    </footer>
  );
}
