export const siteRoutes = {
  home: "/legacy/index.html",
  services: "/legacy/index.html#servicos",
  contact: "/legacy/index.html#localizacao",
  booking: "/agendar",
  club: "/clube",
  adminAgenda: "/admin/agenda",
} as const;

export const primaryNavigation = [
  { label: "Início", href: siteRoutes.home, fullPage: true },
  { label: "Serviços", href: siteRoutes.services, fullPage: true },
  { label: "Agendar", href: siteRoutes.booking, fullPage: false },
  { label: "Clube mensal", href: siteRoutes.club, fullPage: false },
  { label: "Contato", href: siteRoutes.contact, fullPage: true },
];
