import { useState, useEffect, useCallback, Component } from "react";
import { LandingApp } from "./LandingApp";
import { ClientApp } from "./ClientApp";
import { AdminApp } from "./AdminApp";
import { PlanosPage } from "./PlanosPage";
import { InstallBanner } from "./InstallBanner";
import { carregarBranding } from "./api";
import { CSS } from "./styles";

function getPath() {
  return window.location.pathname || "/";
}

function NotFound({ navigate }) {
  return (
    <div className="fade-up" style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: 40, textAlign: "center"
    }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>💈</div>
      <h1 style={{ fontSize: 48, fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>404</h1>
      <p style={{ fontSize: 16, color: "var(--muted)", marginBottom: 24, maxWidth: 400 }}>
        A página que você procura não existe ou foi movida.
      </p>
      <button className="btn-gold" onClick={() => navigate("/")} style={{ width: "auto", display: "inline-flex", padding: "11px 24px" }}>
        ← Voltar para o início
      </button>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    console.error("💥 Erro capturado:", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="fade-up" style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "100vh", padding: 40, textAlign: "center"
        }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>😵</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--red)", marginBottom: 8 }}>Algo deu errado</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, maxWidth: 500, fontFamily: "monospace" }}>
            {String(this.state.err.message || this.state.err)}
          </p>
          <button className="btn-gold" onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ width: "auto", display: "inline-flex", padding: "11px 24px" }}>
            🔄 Recarregar app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppBoundary = ErrorBoundary;

export default function App() {
  const [path, setPath] = useState(getPath());

  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => { carregarBranding(); }, [path]);
  useEffect(() => {
    const t = localStorage.getItem("theme") || "dark";
    document.documentElement.dataset.theme = t;
  }, []);

  const navigate = useCallback((to) => {
    if (to === path) return;
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  }, [path]);

  let content;
  if (path.startsWith("/gestor")) content = <AdminApp navigate={navigate} />;
  else if (path.startsWith("/minha-conta")) content = <ClientApp navigate={navigate} />;
  else if (path === "/planos" || path === "/precos") content = <PlanosPage navigate={navigate} />;
  else if (path === "/" || path === "") content = <LandingApp navigate={navigate} />;
  else content = <NotFound navigate={navigate} />;

  return (
    <AppBoundary>
      <style>{CSS}</style>
      {content}
      <InstallBanner />
    </AppBoundary>
  );
}
