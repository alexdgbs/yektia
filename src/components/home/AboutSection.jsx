import { ABOUT_SECTIONS } from "../../data/siteContent";

export default function AboutSection() {
  return (
    <section className="about-section" id="acerca">
      <div className="page-width">
        <header className="about-section__intro">
          <span className="eyebrow">Nuestros criterios</span>
          <h2>La confianza se construye con datos.</h2>
        </header>
        <div className="about-grid">
          {ABOUT_SECTIONS.map((item, index) => (
            <article key={item.id}>
              <span className="about-grid__index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
