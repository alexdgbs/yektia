const GOOGLE_SCRIPT_URL = "https://accounts.google.com/gsi/client";

let loadingPromise = null;

// Carga el script de Google solo cuando se usa el inicio con Google, no en
// cada página: antes vivía en index.html y ensuciaba la consola en todos
// lados cuando Google no respondía.
export function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve(true);
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(Boolean(window.google?.accounts?.id));
    script.onerror = () => {
      loadingPromise = null;
      resolve(false);
    };
    document.body.append(script);
  });
  return loadingPromise;
}
