export default function NotFoundPage({
  onBack,
  code = "404 / PERFIL NO DISPONIBLE",
  title = "No encontramos este especialista",
  message = "El enlace puede haber cambiado o el perfil ya no forma parte del directorio.",
}) {
  return (
    <section className="not-found page-width">
      <span className="not-found__code">{code}</span>
      <div>
        <h1>{title}</h1>
        <p>{message}</p>
        <button className="primary-button" type="button" onClick={onBack}>
          Volver al directorio
        </button>
      </div>
    </section>
  );
}
