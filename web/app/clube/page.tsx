import type { Metadata } from "next";
import Link from "next/link";

import { Header } from "@/components/Header";
import MembershipCheckout from "@/components/memberships/MembershipCheckout";
import { getMembershipPlans } from "@/lib/asaas/plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clube Mensal | Pedro Lucas Barbearia",
  description:
    "Assine um plano mensal da Pedro Lucas Barbearia com cobrança recorrente no cartão via Asaas.",
};

type ClubPageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

function getStatusMessage(status?: string) {
  if (status === "cancelado") {
    return "O checkout foi cancelado. Você pode escolher um plano e tentar novamente quando quiser.";
  }

  if (status === "expirado") {
    return "O link de checkout expirou. Gere uma nova assinatura para continuar.";
  }

  return null;
}

export default async function ClubPage({ searchParams }: ClubPageProps) {
  const params = await searchParams;
  const plans = await getMembershipPlans();
  const statusMessage = getStatusMessage(params.checkout);

  return (
    <>
      <Header />
      <main>
        <section className="section club-hero">
          <div className="container club-heading">
            <Link className="back-link" href="/">
              Voltar para o site
            </Link>
            <p className="eyebrow">Planos recorrentes</p>
            <h1 className="section-title">Clube mensal Pedro Lucas Barbearia</h1>
            <p className="section-copy">
              O cliente escolhe o plano, confirma os dados e cadastra o cartão no checkout
              seguro do Asaas. A cobrança passa a acontecer automaticamente todo mês.
            </p>
            {statusMessage ? <div className="status-banner">{statusMessage}</div> : null}
          </div>
        </section>

        <section className="section club-section">
          <div className="container">
            <MembershipCheckout plans={plans} />
          </div>
        </section>
      </main>
    </>
  );
}
