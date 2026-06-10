// Helpers compartilhados por todas as views (landing, cliente, gestor).
import { useState, useCallback, useEffect } from "react";

export const WPP_BARBEARIA = "5512982671917";

export const IMGS = {
  loginBg:    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80",
  heroBanner: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=80",
  // Imagens dos serviços (locais, royalty-free Pexels) — usadas na vitrine e no passo 1 do booking
  svc: {
    1: "/servicos/01-corte.jpg",     // Corte Clássico (tesoura/pente)
    2: "/servicos/02-combo.jpg",     // Corte + Barba (cliente sendo cortado)
    3: "/servicos/05-towel.jpg",     // Barba Completa (toalha quente)
    4: "/servicos/04-fade.jpg",      // Degradê (em ação)
    5: "/servicos/03-styling.jpg",   // Platinado (styling)
    6: "/servicos/01-corte.jpg",     // Sobrancelha (reusa — ferramentas)
    7: "/servicos/05-towel.jpg",     // Barboterapia (toalha)
    8: "/servicos/06-razor.jpg",     // Pezinho (navalha)
  },
  corte:      "/servicos/01-corte.jpg",
  barba:      "/servicos/05-towel.jpg",
  fade:       "/servicos/04-fade.jpg",
  luan:       "/barbeiros/luan.png",
  braz:       "/barbeiros/braz.png",
  willian:    "/barbeiros/willian.png",
  shop1:      "https://images.unsplash.com/photo-1521490683712-35a1cb235d1c?w=600&q=80",
  shop2:      "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&q=80",
};

export const ALL_TIMES = ["08:30","09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];
export const STEPS = ["Serviço","Barbeiro","Horário","Confirmar"];

export const SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

export function gerarDias(qtd = 14) {
  const hoje = new Date();
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    return {
      label: SEMANA[d.getDay()],
      num: String(d.getDate()).padStart(2, "0"),
      mes: String(d.getMonth() + 1).padStart(2, "0"),
      ano: d.getFullYear(),
      iso: d.toISOString().slice(0, 10),
      hoje: i === 0,
    };
  });
}

export function initials(n = "") { return n.slice(0, 2).toUpperCase(); }
export function formatPreco(v) { return `R$ ${Number(v).toFixed(0)}`; }
export function formatWhatsapp(v = "") {
  const d = String(v).replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export function whatsappValido(v = "") {
  const d = String(v).replace(/\D/g, "");
  return d.length >= 10 && d.length <= 11;
}
export function getSvcImg(id) {
  return (IMGS.svc && IMGS.svc[id]) || IMGS.corte;
}
export function getBarbImg(nome) {
  const n = nome?.toLowerCase() || "";
  if (n.includes("luan")) return IMGS.luan;
  if (n.includes("willian")) return IMGS.willian;
  return IMGS.braz;
}

// Componente Toast
export function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast toast-${type}`}>{msg}</div>;
}

// Hook pra disparar toast com auto-dismiss
export function useToast() {
  const [toast, setToast] = useState({ msg: "", type: "ok" });
  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "ok" }), 3500);
  };
  return { toast, showToast };
}

// Hook useApi (fetch + loading + reload)
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fn()); } catch {} finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

// Hook de drawer mobile: abre/fecha sidebar; fecha ao redimensionar para desktop
export function useDrawer() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 900) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return { open, setOpen, toggle: () => setOpen(o => !o), close: () => setOpen(false) };
}

// Hook de tema dark/light
export function useTheme() {
  const [theme, setThemeState] = useState(() => localStorage.getItem("theme") || "dark");
  const apply = useCallback((t) => {
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
    setThemeState(t);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggle = useCallback(() => apply(theme === "dark" ? "light" : "dark"), [theme, apply]);
  return { theme, toggle, setTheme: apply };
}

// Hook para PWA install prompt (Android/desktop Chrome)
export function useInstallPrompt() {
  const [evt, setEvt] = useState(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const onBefore = (e) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const install = async () => {
    if (!evt) return false;
    evt.prompt();
    const choice = await evt.userChoice;
    setEvt(null);
    return choice.outcome === "accepted";
  };
  return { canInstall: !!evt && !installed, installed, install };
}
