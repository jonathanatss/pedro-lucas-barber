import Link from "next/link";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { siteRoutes } from "@/lib/navigation";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="section success-page">
        <div className="container success-panel">
          <h1 className="section-title">Página não encontrada</h1>
          <p className="section-copy">Escolha uma opção para continuar.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={siteRoutes.home}>Voltar para o início</a>
            <Link className="btn btn-ghost" href={siteRoutes.booking}>Agendar horário</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
