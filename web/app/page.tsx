import Link from "next/link";

import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { siteContent } from "@/content/site";

const highlights = [
  {
    title: "Agenda online",
    description:
      "Escolha o servico, veja os horarios disponiveis e confirme sem sair do site.",
  },
  {
    title: "Atendimento profissional",
    description:
      "Fluxo pensado para uma operacao real de barbearia, com dados centralizados e espaco para crescer.",
  },
  {
    title: "Clube mensal",
    description:
      "Planos recorrentes com checkout seguro do Asaas e status sincronizado no Supabase.",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <Hero />

      <main>
        <section className="section" id="agendamento">
          <div className="container home-grid">
            <div>
              <p className="eyebrow">Agendamento nativo</p>
              <h2 className="section-title">Agora o fluxo principal mora no proprio site.</h2>
              <p className="section-copy">
                A landing continua evoluindo, mas a entrada principal ja ficou estavel para deploy:
                o cliente entra, entende a proposta e segue direto para a agenda online.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary" href="/agendar">
                  Abrir agenda
                </Link>
                <Link className="btn btn-ghost" href="/clube">
                  Conhecer clube mensal
                </Link>
                <a
                  className="btn btn-ghost"
                  href={siteContent.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Falar no WhatsApp
                </a>
              </div>
            </div>

            <div className="card-grid" id="servicos">
              {highlights.map((item) => (
                <article className="feature-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section alt" id="contato">
          <div className="container contact-panel">
            <div>
              <p className="eyebrow">Pedro Lucas Barbearia</p>
              <h2 className="section-title">
                Base pronta para Supabase + Google Calendar + Netlify.
              </h2>
              <p className="section-copy">
                O projeto ja esta preparado para disponibilidade, criacao de agendamentos e
                sincronizacao com calendario. O passo seguinte e plugar as credenciais de
                producao.
              </p>
            </div>
            <div className="contact-links">
              <a href={siteContent.phoneHref}>{siteContent.phoneLabel}</a>
              <a href={siteContent.instagramHref} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
              <a href={siteContent.whatsappHref} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-copy">
          <p>{siteContent.businessName}</p>
          <p>
            {siteContent.city}/{siteContent.state}
          </p>
        </div>
      </footer>
    </>
  );
}
