"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { siteContent } from "@/content/site";
import { primaryNavigation, siteRoutes } from "@/lib/navigation";

export function Header({ activePath }: { activePath?: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  return (
    <header className="header">
      <div className="container header-inner">
        <a href={siteRoutes.home} className="brand" aria-label="Página inicial da Pedro Lucas Barbearia">
          <span className="brand-dot">PL</span>
          <span>
            <strong>{siteContent.businessName}</strong>
            <small>
              {siteContent.city}/{siteContent.state}
            </small>
          </span>
        </a>
        <button
          ref={menuButton}
          className="menu-toggle"
          type="button"
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isMenuOpen}
          aria-controls="site-navigation"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          Menu
        </button>
        <nav
          id="site-navigation"
          className={`nav${isMenuOpen ? " nav-open" : ""}`}
          aria-label="Navegação principal"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsMenuOpen(false);
              menuButton.current?.focus();
            }
          }}
        >
          {primaryNavigation.map(({ label, href, fullPage }) => {
            const props = {
              href,
              "aria-current": activePath === href ? "page" as const : undefined,
              onClick: () => setIsMenuOpen(false),
            };
            return fullPage ? (
              <a key={href} {...props}>{label}</a>
            ) : (
              <Link key={href} {...props}>{label}</Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
