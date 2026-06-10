import { useState } from "react";
import { useInstallPrompt } from "./shared";

export function InstallBanner() {
  const { canInstall, install } = useInstallPrompt();
  const [fechado, setFechado] = useState(false);

  if (!canInstall || fechado) return null;

  return (
    <div style={{
      position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 90,
      maxWidth: 420, margin: "0 auto",
      background: "linear-gradient(135deg,var(--bg2),var(--bg3))",
      border: "1px solid var(--gold-border)",
      borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 12px 40px rgba(0,0,0,.4)", backdropFilter: "blur(20px)",
      animation: "slideUp .35s ease"
    }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(120%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      <div style={{ fontSize: 28, lineHeight: 1 }}>📲</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Instale o app</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>Acesso rápido, sem barra do navegador</div>
      </div>
      <button className="btn-gold" style={{ width: "auto", padding: "8px 14px", fontSize: 12 }} onClick={async () => { const ok = await install(); if (ok) setFechado(true); }}>Instalar</button>
      <button onClick={() => setFechado(true)} aria-label="Fechar" style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 16, cursor: "pointer", padding: 4, lineHeight: 1 }}>✕</button>
    </div>
  );
}
