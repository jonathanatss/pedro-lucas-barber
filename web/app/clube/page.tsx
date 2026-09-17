import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import MembershipCheckout from "@/components/memberships/MembershipCheckout";
import { getMembershipPlans } from "@/lib/asaas/plans";
import { siteRoutes } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clube Mensal | Pedro Lucas Barbearia",
  description:
    "Conheça os planos mensais da Pedro Lucas Barbearia e assine com cartão.",
};

type ClubPageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

function getStatusMessage(status?: string) {
  if (status === "cancelado") {
    return "O pagamento foi cancelado. Você pode tentar novamente quando quiser.";
  }

  if (status === "expirado") {
    return "O link de pagamento expirou. Selecione seu plano para continuar.";
  }

  return null;
}

export default async function ClubPage({ searchParams }: ClubPageProps) {
  const params = await searchParams;
  const plans = await getMembershipPlans();
  const statusMessage = getStatusMessage(params.checkout);

  return (
    <>
      <Header activePath={siteRoutes.club} />
      <main>
        <section className="section club-hero">
          <div className="container club-heading">
            <a className="back-link" href={siteRoutes.home}>
              Voltar para o início
            </a>
            <h1 className="section-title">Clube mensal Pedro Lucas Barbearia</h1>
            <p className="section-copy">
              Escolha o plano ideal para você.
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
      <Footer />
    </>
  );
}
