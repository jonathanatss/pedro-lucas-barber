import type { Metadata } from "next";
import Link from "next/link";

import { Header } from "@/components/Header";

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
            O Asaas está processando a assinatura. Assim que o pagamento for confirmado,
            o status será atualizado automaticamente no sistema da barbearia.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/agendar">
              Agendar horário
            </Link>
            <Link className="btn btn-ghost" href="/">
              Voltar para o site
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
