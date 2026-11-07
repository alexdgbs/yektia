import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiLogOut, FiMenu, FiMoon, FiSearch, FiSun, FiX } from "react-icons/fi";
import { doctorInitials } from "../doctors/doctorPresentation";

const THEME_COLORS = {
  dark: "#121a1e",
  light: "#e9efeb",
};

const getInitialTheme = () => {
  try {
    const savedTheme = localStorage.getItem("yektia-theme");
    return savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : "light";
  } catch {
    return "light";
  }
};

const getUserInitials = (name = "") =>
  doctorInitials(name).toLocaleUpperCase("es") || "U";

export default function Header({
  user,
  onLogout,
  searchQuery = "",
  onSearchChange = () => {},
  onNavigate,
}) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const themeTransitionTimeout = useRef(null);
  const isDark = theme === "dark";
  const firstName = user?.nombre?.trim().split(/\s+/)[0] || "Mi cuenta";

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[theme]);
    try {
      localStorage.setItem("yektia-theme", theme);
    } catch {
      // si no hay storage, la interfaz sigue funcionando.
    }
  }, [theme]);

  useEffect(
    () => () => window.clearTimeout(themeTransitionTimeout.current),
    [],
  );

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    const root = document.documentElement;
    root.dataset.theme = nextTheme;
    root.classList.add("theme-transition-active");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[nextTheme]);
    window.clearTimeout(themeTransitionTimeout.current);
    themeTransitionTimeout.current = window.setTimeout(
      () => root.classList.remove("theme-transition-active"),
      180,
    );
    setTheme(nextTheme);
  };

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const updateSearch = (event) => onSearchChange(event.target.value);

  return (
    <>
      <header className={`site-header${menuOpen ? " is-menu-open" : ""}`}>
        <div className="header-inner page-width">
          <a
            className="brand"
            href="/"
            aria-label="Yektia, ir al inicio"
            onClick={(event) => {
              event.preventDefault();
              onNavigate?.("/");
            }}
          >
            Yektia
          </a>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={
              isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
            }
            title={isDark ? "Modo claro" : "Modo oscuro"}
          >
            {isDark ? (
              <FiSun aria-hidden="true" />
            ) : (
              <FiMoon aria-hidden="true" />
            )}
          </button>

          <div className="header-actions">
            <div className="header-desktop-actions">
              <a
                className="account-link"
                href="/cuenta"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate?.("/cuenta");
                }}
              >
                {user && (
                  <span className="account-avatar" aria-hidden="true">
                    {getUserInitials(user.nombre)}
                  </span>
                )}
                <span>{user ? firstName : "Ingresar"}</span>
              </a>
              {user && (
                <button
                  className="header-logout"
                  type="button"
                  onClick={onLogout}
                >
                  <FiLogOut aria-hidden="true" />
                  <span>Cerrar sesión</span>
                </button>
              )}
            </div>
            <button
              className="mobile-menu-toggle"
              type="button"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((current) => !current)}
            >
              {menuOpen ? (
                <FiX aria-hidden="true" />
              ) : (
                <FiMenu aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu-layer" id="mobile-navigation">
          <button
            className="mobile-menu-backdrop"
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="mobile-navigation" aria-label="Navegación móvil">
            {user && (
              <div className="mobile-navigation__account">
                <span className="mobile-navigation__avatar" aria-hidden="true">
                  {getUserInitials(user.nombre)}
                </span>
                <span className="mobile-navigation__account-copy">
                  <strong>{user.nombre?.trim() || "Tu cuenta"}</strong>
                  <small>
                    {user.role === "doctor"
                      ? "Perfil profesional"
                      : "Cuenta personal"}
                  </small>
                </span>
                <a
                  href="/cuenta"
                  onClick={(event) => {
                    event.preventDefault();
                    setMenuOpen(false);
                    onNavigate?.("/cuenta");
                  }}
                >
                  Mi cuenta
                </a>
              </div>
            )}
            <div className="mobile-navigation__search">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={updateSearch}
                placeholder="Buscar especialista"
                aria-label="Buscar especialista"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="Limpiar búsqueda"
                >
                  <FiX />
                </button>
              )}
            </div>
            <div className="mobile-navigation__links">
              {!user && (
                <a
                  href="/cuenta"
                  onClick={(event) => {
                    event.preventDefault();
                    setMenuOpen(false);
                    onNavigate?.("/cuenta");
                  }}
                >
                  <span>Ingresar</span>
                </a>
              )}
              {user && (
                <button
                  className="mobile-navigation__logout"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout?.();
                  }}
                >
                  <FiLogOut aria-hidden="true" />
                  <span>Cerrar sesión</span>
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
