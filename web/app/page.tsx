import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { siteContent } from "@/content/site";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />

      <section id="servicos" className="section">
        <div className="container">
          <h2>Serviços</h2>
          <p>Migração em andamento. Esta seção será portada da landing atual na próxima etapa.</p>
        </div>
      </section>

      <section id="agendamento" className="section alt">
        <div className="container">
          <h2>Agendamento</h2>
          <p>
            Enquanto finalizamos a migração, você já pode agendar direto no WhatsApp:
            <a href={siteContent.whatsappHref} target="_blank" rel="noopener noreferrer"> {siteContent.phoneLabel}</a>
          </p>
        </div>
      </section>

      <footer id="contato" className="footer">
        <div className="container">
          <p>{siteContent.businessName}</p>
          <p>
            <a href={siteContent.phoneHref}>{siteContent.phoneLabel}</a> · {siteContent.city}/{siteContent.state}
          </p>
        </div>
      </footer>
    </main>
  );
}
