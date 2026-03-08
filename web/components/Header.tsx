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
          <a href="#servicos">Serviços</a>
          <a href="#agendamento">Agendamento</a>
          <a href="#contato">Contato</a>
        </nav>
      </div>
    </header>
  );
}
