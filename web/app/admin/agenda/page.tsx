import type { Metadata } from "next";

import AgendaAdminPanel from "@/components/admin/AgendaAdminPanel";

import "../../globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel da Agenda | Pedro Lucas Barbearia",
  description:
    "Controle administrativo de horários, exceções e bloqueios da agenda.",
};

export default function AdminAgendaPage() {
  return <AgendaAdminPanel />;
}
