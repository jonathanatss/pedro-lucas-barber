import type { Metadata } from "next";
import { Playfair_Display, Raleway } from "next/font/google";

import "./globals.css";

const headingFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Raleway({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Pedro Lucas Barbearia | Natal/RN",
  description:
    "Corte e barba com precisão e estilo em Natal/RN. Agende online direto no site.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  );
}
