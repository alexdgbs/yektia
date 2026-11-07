export default function CareSteps() {
  return (
    <section className="care-steps" id="metodo">
      <div className="care-steps__content page-width">
        <header>
          <span className="eyebrow">Antes de reservar</span>
          <h2>Elige con claridad.</h2>
          <p>Consulta los datos clave antes de elegir un horario.</p>
        </header>
        <dl className="care-steps__details">
          <div>
            <dt>El perfil del médico</dt>
            <dd>Consulta su cédula, especialidad, ubicación, experiencia y precio.</dd>
          </div>
          <div>
            <dt>La confirmación</dt>
            <dd>Elige un horario, envía la solicitud y revisa el estado desde tu cuenta.</dd>
          </div>
          <div>
            <dt>Si necesitas cancelar</dt>
            <dd>Puedes hacerlo desde tu cuenta hasta 24 horas antes de la cita.</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
