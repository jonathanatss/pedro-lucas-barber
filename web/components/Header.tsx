import Link from "next/link";
import { siteContent } from "@/content/site";

export function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          <span className="brand-dot">PL</span>
          <span>
            <strong>{siteContent.businessName}</strong>
            <small>
              {siteContent.city}/{siteContent.state}
            </small>
          </span>
        </Link>
        <nav className="nav">
          <Link href="/#servicos">Serviços</Link>
          <Link href="/clube">Clube mensal</Link>
          <Link href="/#agendamento">Agendamento</Link>
          <Link href="/#contato">Contato</Link>
        </nav>
      </div>
    </header>
  );
}
