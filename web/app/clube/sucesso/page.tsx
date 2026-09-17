import type { Metadata } from "next";
import Link from "next/link";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { siteRoutes } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Assinatura recebida | Pedro Lucas Barbearia",
  description: "Confirmação da assinatura recorrente da Pedro Lucas Barbearia.",
};

export default function ClubSuccessPage() {
  return (
    <>
      <Header />
      <main className="section success-page">
        <div className="container success-panel">
          <p className="eyebrow">Assinatura enviada</p>
          <h1 className="section-title">Recebemos sua confirmação.</h1>
          <p className="section-copy">
            Seu pedido foi recebido. A assinatura será ativada após a confirmação do pagamento.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href={siteRoutes.booking}>
              Agendar horário
            </Link>
            <a className="btn btn-ghost" href={siteRoutes.home}>
              Voltar para o início
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
