import Link from "next/link";

import { siteRoutes } from "@/lib/navigation";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-copy">
        <p>Pedro Lucas Barbearia · Natal/RN</p>
        <nav className="footer-nav" aria-label="Navegação do rodapé">
          <a href={siteRoutes.home}>Início</a>
          <Link href={siteRoutes.booking}>Agendar</Link>
          <Link href={siteRoutes.club}>Clube mensal</Link>
          <Link href={siteRoutes.adminAgenda} prefetch={false}>Área do barbeiro</Link>
        </nav>
      </div>
    </footer>
  );
}
