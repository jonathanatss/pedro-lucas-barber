"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.replace("/legacy/index.html");
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#0f1a0f",
        color: "#f6f1e8",
        fontFamily: "Georgia, serif",
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
          Redirecionando para a landing...
        </h1>
        <p style={{ marginBottom: "1rem", opacity: 0.9 }}>
          Se isso demorar, abra a versao principal abaixo.
        </p>
        <a
          href="/legacy/index.html"
          style={{
            display: "inline-block",
            padding: "12px 18px",
            borderRadius: "999px",
            background: "#d5a623",
            color: "#111",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Abrir landing
        </a>
      </div>
    </main>
  );
}
