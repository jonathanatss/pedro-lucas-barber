import { siteContent } from "@/content/site";

export function Hero() {
  return (
    <section className="hero" id="topo">
      <div className="container hero-content">
        <p className="hero-tag">{siteContent.hero.tag}</p>
        <h1>{siteContent.hero.title}</h1>
        <p className="hero-subtitle">{siteContent.hero.subtitle}</p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#agendamento">
            Agendar agora
          </a>
          <a className="btn btn-ghost" href={siteContent.whatsappHref} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
