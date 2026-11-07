import { useEffect, useRef, useState } from "react";

const initializedGoogleClientIds = new Set();

function GoogleLoginButton({ auth, setStatus, setBusy }) {
  const buttonRef = useRef(null);
  const credentialHandlerRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const googleLogin = auth.googleLogin;
  const [ready, setReady] = useState(Boolean(window.google?.accounts?.id));

  useEffect(() => {
    credentialHandlerRef.current = async (credential) => {
      setBusy(true);
      setStatus("");
      try {
        await googleLogin(credential);
      } catch (error) {
        setStatus(error.message);
      } finally {
        setBusy(false);
      }
    };
  }, [googleLogin, setBusy, setStatus]);

  useEffect(() => {
    if (ready) return undefined;

    const script = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    const handleLoad = () => setReady(Boolean(window.google?.accounts?.id));

    script?.addEventListener("load", handleLoad);
    return () => script?.removeEventListener("load", handleLoad);
  }, [ready]);

  useEffect(() => {
    const element = buttonRef.current;
    const googleIdentity = window.google?.accounts?.id;

    if (!clientId || !ready || !element || !googleIdentity) return undefined;

    if (!initializedGoogleClientIds.has(clientId)) {
      googleIdentity.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          credentialHandlerRef.current?.(credential);
        },
      });
      initializedGoogleClientIds.add(clientId);
    }

    let renderedWidth = 0;
    const renderButton = () => {
      if (!buttonRef.current) return;
      const width = Math.min(
        390,
        Math.max(240, Math.floor(buttonRef.current.clientWidth)),
      );
      if (width === renderedWidth && buttonRef.current.childNodes.length) return;
      renderedWidth = width;
      buttonRef.current.replaceChildren();
      googleIdentity.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width,
        locale: "es",
      });
    };

    renderButton();
    const observer = new ResizeObserver(renderButton);
    observer.observe(element);

    return () => observer.disconnect();
  }, [clientId, ready]);

  if (!clientId) {
    return (
      <p className="form-status auth-status">
        Configura el Client ID de Google para iniciar sesión.
      </p>
    );
  }

  return <div className="google-login-button" ref={buttonRef} />;
}

export default function AuthForm({ auth }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <section className="account-auth page-width">
      <div className="account-auth__intro">
        <span className="eyebrow">Mi cuenta</span>
        <h1>Accede a tu cuenta</h1>
        <p>
          Consulta tus citas y actualiza tus datos desde aquí.
        </p>
      </div>

      <div className="google-auth-panel">
        <header>
          <span>Yektia</span>
          <h2>Inicia sesión</h2>
          <p>Continúa con tu cuenta de Google.</p>
        </header>

        <GoogleLoginButton
          auth={auth}
          setStatus={setStatus}
          setBusy={setBusy}
        />

        {busy && (
          <p className="form-status auth-status" role="status">
            Conectando con Google…
          </p>
        )}
        {status && (
          <p className="form-status auth-status" role="status">
            {status}
          </p>
        )}

        <small className="google-auth-panel__privacy">
          Yektia usa tu nombre, correo e identificador para reconocer tu cuenta.
        </small>
      </div>
    </section>
  );
}
