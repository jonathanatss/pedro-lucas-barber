import type { Metadata } from "next";

import BookingExperience from "@/components/booking/BookingExperience";
import { getBookingCatalog } from "@/lib/booking/catalog";

import "../globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agendar | Pedro Lucas Barbearia",
  description:
    "Escolha o serviço, confira os horários disponíveis e confirme seu agendamento direto no site.",
};

type BookingPageProps = {
  searchParams: Promise<{ embedded?: string }>;
};

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const params = await searchParams;
  const catalog = await getBookingCatalog();
  const embedded = params.embedded === "1";

  return (
    <main
      className="section"
      style={{
        minHeight: embedded ? "auto" : "100vh",
        padding: embedded ? "0" : "48px 0 80px",
        background:
          "radial-gradient(circle at top, rgba(232, 185, 35, 0.14), transparent 22%), #0f1a0f",
      }}
    >
      <div className="container">
        <BookingExperience
          businessHours={catalog.businessHours}
          embedded={embedded}
          services={catalog.services}
          timezone={catalog.timezone}
        />
      </div>
    </main>
  );
}
