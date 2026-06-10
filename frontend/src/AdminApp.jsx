import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { apiFetch } from "./api";
import {
  formatPreco,
  getBarbImg, useApi, useToast, useDrawer, Toast, useTheme,
  initials, SEMANA,
} from "./shared";
import { CSS } from "./styles";
import { ConfiguracoesPagSeguro } from "./ConfiguracoesPagSeguro";

const ConfiguracoesLembretes = lazy(() => import("./ConfiguracoesLembretes").then(m => ({ default: m.ConfiguracoesLembretes })));
const GestaoJornadas = lazy(() => import("./GestaoJornadas").then(m => ({ default: m.GestaoJornadas })));
const GestaoAniversariantes = lazy(() => import("./GestaoAniversariantes").then(m => ({ default: m.GestaoAniversariantes })));
const GestaoListaEspera = lazy(() => import("./GestaoListaEspera").then(m => ({ default: m.GestaoListaEspera })));
const GestaoPacotes = lazy(() => import("./GestaoPacotes").then(m => ({ default: m.GestaoPacotes })));
const GestaoFinanceira = lazy(() => import("./GestaoFinanceira").then(m => ({ default: m.GestaoFinanceira })));
const GestaoProdutos = lazy(() => import("./GestaoProdutos").then(m => ({ default: m.GestaoProdutos })));
const Relatorios = lazy(() => import("./Relatorios").then(m => ({ default: m.Relatorios })));
const GestaoAssinatura = lazy(() => import("./GestaoAssinatura").then(m => ({ default: m.GestaoAssinatura })));

const LazyFallback = () => (
  <div style={{ padding: 40, textAlign: "center" }}>
    <div className="spinner" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
    <div style={{ fontSize: 12, color: "var(--muted)" }}>Carregando módulo…</div>
  </div>
);

/**
 * AdminApp — painel do gestor (/gestor).
 * Acesso restrito: só usuários com perfil === 'gestor'.
 * Funcionalidades: dashboard, agenda do dia, clientes, configurações.
 */
export function AdminApp({ navigate }) {
  const [usuario, setUsuario] = useState(() => { try { return JSON.parse(localStorage.getItem("usuario")); } catch { return null; } });
  const [authForm, setAuthForm] = useState({ nome: "", email: "", whatsapp: "", senha: "", confirmar: "" });
  const [authErr, setAuthErr] = useState({});
  const [authLoading, setAuthLoading] = useState(false);
  const [tab, setTab] = useState("home");
  const drawer = useDrawer();
  const { toast, showToast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();
  const hojeISO = new Date().toISOString().slice(0, 10);
  const [agendaDate, setAgendaDate] = useState(hojeISO);
  const [agendaData, setAgendaData] = useState(null);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [showCal, setShowCal] = useState(false);

  const carregarAgenda = useCallback(async (data) => {
    setAgendaData(null);
    setAgendaLoading(true);
    try {
      const res = await apiFetch(`/gestor/dashboard?date=${data}`);
      setAgendaData(res);
    } catch (e) {
      console.error("carregarAgenda", data, e);
    }
    setAgendaLoading(false);
  }, []);

  const navDate = (dir) => {
    const d = new Date(agendaDate + "T12:00:00");
    d.setDate(d.getDate() + dir);
    const iso = d.toISOString().slice(0, 10);
    setAgendaDate(iso);
    carregarAgenda(iso);
  };

  useEffect(() => {
    if (tab === "agenda") carregarAgenda(agendaDate);
  }, [tab, agendaDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: dashData, loading: loadDash, reload: reloadDash } = useApi(
    () => usuario?.perfil === "gestor" ? apiFetch("/gestor/dashboard") : Promise.resolve(null),
    [usuario?.perfil]
  );
  const { data: clientesData, loading: loadClientes } = useApi(
    () => usuario?.perfil === "gestor" ? apiFetch("/gestor/clientes") : Promise.resolve([]),
    [usuario?.perfil]
  );

  // Se logou mas não é gestor, redireciona
  useEffect(() => {
    if (usuario && usuario.perfil !== "gestor") {
      navigate("/minha-conta");
    }
  }, [usuario, navigate]);

  const login = async () => {
    const errs = {};
    if (!authForm.email) errs.email = "Informe o e-mail";
    if (!authForm.senha) errs.senha = "Informe a senha";
    setAuthErr(errs);
    if (Object.keys(errs).length) return;
    setAuthLoading(true);
    try {
      const res = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email: authForm.email, senha: authForm.senha }) });
      if (res.usuario.perfil !== "gestor") {
        showToast("Esta área é exclusiva do gestor.", "err");
        localStorage.setItem("token", res.token);
        localStorage.setItem("usuario", JSON.stringify(res.usuario));
        setUsuario(res.usuario);
        // Redireciona cliente pro portal
        setTimeout(() => navigate("/minha-conta"), 1000);
        return;
      }
      localStorage.setItem("token", res.token);
      localStorage.setItem("usuario", JSON.stringify(res.usuario));
      setUsuario(res.usuario);
      showToast("Bem-vindo, gestor!");
    } catch (e) { showToast(e.message, "err"); }
    finally { setAuthLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
    navigate("/");
  };

  const cancelarAgendamento = async (id) => {
    try { await apiFetch(`/agendamentos/${id}/cancelar`, { method: "PATCH" }); showToast("Agendamento cancelado."); reloadDash(); carregarAgenda(agendaDate); }
    catch (e) { showToast(e.message, "err"); }
  };

  const concluirAgendamento = async (id) => {
    try { await apiFetch(`/gestor/agendamentos/${id}/concluir`, { method: "PATCH" }); showToast("Concluído! ✅"); reloadDash(); carregarAgenda(agendaDate); }
    catch (e) { showToast(e.message, "err"); }
  };

  // Se não logado, mostra tela de login do gestor
  if (!usuario) {
    return (
      <div style={{ fontFamily: "'Outfit',sans-serif", height: "100vh" }}>
        <style>{CSS}</style>
        <Toast msg={toast.msg} type={toast.type} />
        <div style={{ position: "relative", height: "100vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", filter: "brightness(.35)" }} src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80" alt="Doctor Barbearia" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,rgba(6,6,6,.85) 0%,rgba(6,6,6,.7) 50%,rgba(6,6,6,.9) 100%)" }} />
          <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 420 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gold-dim)", border: "1px solid var(--gold-border)", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "var(--gold)", marginBottom: 20, letterSpacing: ".14em" }}>
                ⚡ ÁREA RESTRITA
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-.02em" }}>Doctor</div>
              <div style={{ width: 48, height: 1, background: "var(--gold)", margin: "10px auto" }} />
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".28em", textTransform: "uppercase", color: "rgba(255,255,255,.45)" }}>Painel do Gestor</div>
            </div>
            <div style={{ background: "rgba(10,8,6,.82)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 4, padding: "32px 36px", backdropFilter: "blur(28px)", boxShadow: "0 32px 80px rgba(0,0,0,.6)" }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: 4, letterSpacing: "-.01em" }}>Acesso do Gestor</div>
              <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginBottom: 24 }}>Entre com suas credenciais administrativas</div>
              <div className="inp-grp"><label className="inp-lbl">E-mail</label><input className={`inp${authErr.email ? " err" : ""}`} type="email" placeholder="gestor@doctorbarbearia.com" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} />{authErr.email && <div className="err-msg">{authErr.email}</div>}</div>
              <div className="inp-grp" style={{ marginBottom: 18 }}><label className="inp-lbl">Senha</label><input className={`inp${authErr.senha ? " err" : ""}`} type="password" placeholder="••••••••" value={authForm.senha} onChange={e => setAuthForm(f => ({ ...f, senha: e.target.value }))} onKeyDown={e => e.key === "Enter" && login()} />{authErr.senha && <div className="err-msg">{authErr.senha}</div>}</div>
              <button className="btn-gold" disabled={authLoading} onClick={login}>{authLoading ? <><div className="spinner" />Entrando...</> : "Acessar painel"}</button>
              <div style={{ textAlign: "center", marginTop: 18, fontSize: 11, color: "var(--muted)" }}>
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                <a onClick={(e) => { e.preventDefault(); navigate("/"); }} style={{ color: "var(--gold)", cursor: "pointer" }}>← Voltar para o site</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se logado mas não é gestor, mostra tela de bloqueio
  if (usuario.perfil !== "gestor") {
    return (
      <div style={{ fontFamily: "'Outfit',sans-serif", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <style>{CSS}</style>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, marginBottom: 8 }}>Acesso negado</h1>
          <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>Esta área é exclusiva para gestores da barbearia.</p>
          <button className="btn-gold" style={{ width: "auto", display: "inline-flex", padding: "12px 24px" }} onClick={() => navigate("/minha-conta")}>Ir para minha conta</button>
        </div>
      </div>
    );
  }

  // Logado como gestor: renderiza painel completo
  const hoje = new Date();
  const navItems = [
    { key: "home", icon: "🏠", label: "Início" },
    { key: "agenda", icon: "📅", label: "Agenda" },
    { key: "clientes", icon: "👥", label: "Clientes" },
    { key: "jornadas", icon: "⏰", label: "Jornadas" },
    { key: "produtos", icon: "🛍️", label: "Produtos" },
    { key: "aniversariantes", icon: "🎂", label: "Aniversariantes" },
    { key: "listaEspera", icon: "📋", label: "Lista de Espera" },
    { key: "pacotes", icon: "🎁", label: "Pacotes" },
    { key: "financeiro", icon: "💰", label: "Financeiro" },
    { key: "relatorios", icon: "📊", label: "Relatórios" },
    { key: "assinatura", icon: "💳", label: "Minha Assinatura" },
    { key: "configuracoes", icon: "⚙", label: "Config" },
  ];

  const SectionHeader = ({ title, subtitle }) => (
    <div className="ph">
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="btn-outline" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => window.location.assign('/planos')}>Ver planos</button>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gold-dim)", border: "1px solid var(--gold-border)", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "var(--gold)" }}>⚡ Gestor</div>
      </div>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} />
      <div className="mobile-topbar">
        <div className="mobile-topbar-logo">
          <div className="mobile-topbar-logo-mark">DB</div>
          <div>
            <div className="mobile-topbar-logo-txt">Doctor</div>
            <div className="mobile-topbar-logo-sub">Barbearia</div>
          </div>
        </div>
        <div className="mobile-burger" onClick={drawer.toggle} aria-label="Abrir menu">☰</div>
      </div>
      <div className={`sb-backdrop ${drawer.open ? "sb-open" : ""}`} onClick={drawer.close} />
      <div className="app">
        <div className={`sidebar ${drawer.open ? "sb-open" : ""}`}>
          <div className="sb-logo">
            <div className="logo" onClick={() => { setTab("home"); drawer.close(); }}>
              <div className="logo-mark" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 700, color: "var(--gold)", letterSpacing: "-.01em" }}>DB</div>
              <div>
                <div className="logo-text">Doctor</div>
                <div className="logo-sub">Barbearia</div>
              </div>
            </div>
          </div>
          <div className="sb-status">
            <div className="pill-green" style={{ background: "var(--gold-dim)", borderColor: "var(--gold-border)", color: "var(--gold)" }}>
              <div className="dot-live" style={{ background: "var(--gold)" }} />Modo Gestor
            </div>
          </div>
          <div className="sb-nav">
            <div className="sb-section">Menu</div>
            {navItems.map(n => (
              <div key={n.key} className={`nav-item ${tab === n.key ? "active" : ""}`} onClick={() => { setTab(n.key); drawer.close(); }}>
                <span className="nav-ic">{n.icon}</span>
                <span className="nav-lbl">{n.label}</span>
              </div>
            ))}
            <div className="sb-section" style={{ marginTop: 14 }}>Acesso rápido</div>
            <div className="nav-item" onClick={() => { navigate("/"); drawer.close(); }}>
              <span className="nav-ic">🌐</span>
              <span className="nav-lbl">Ver site público</span>
            </div>
            <div className="nav-item" onClick={() => { navigate("/minha-conta"); drawer.close(); }}>
              <span className="nav-ic">👤</span>
              <span className="nav-lbl">Minha conta</span>
            </div>
            <div className="nav-item" onClick={() => { toggleTheme(); }}>
              <span className="nav-ic">{theme === "dark" ? "☀️" : "🌙"}</span>
              <span className="nav-lbl">{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
            </div>
          </div>
          <div className="sb-user">
            <div className="sb-av"><img src={getBarbImg(usuario.nome)} alt={usuario.nome} onError={e => { e.target.style.display = "none"; }} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-uname">{usuario.nome.split(" ")[0]}</div>
              <div className="sb-urole">⚡ Gestor</div>
            </div>
            <div className="sb-logout" onClick={logout} title="Sair">🚪</div>
          </div>
        </div>

        <div className="main">
          {tab === "home" && (
            <div className="fade-up">
              <SectionHeader title="Painel do Gestor" subtitle={hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} />
              {loadDash ? <div className="stat-grid">{[1,2,3,4].map(i => <div key={i} className="skel" style={{ height: 70 }} />)}</div>
                : <div className="stat-grid">
                  <div className="stat-card"><div className="stat-val">{dashData?.stats?.hoje ?? 0}</div><div className="stat-lbl">Agendamentos hoje</div></div>
                  <div className="stat-card"><div className="stat-val">{dashData?.stats?.concluidos ?? 0}</div><div className="stat-lbl">Concluídos hoje</div></div>
                  <div className="stat-card"><div className="stat-val">R${Number(dashData?.stats?.faturamento_hoje || 0).toFixed(0)}</div><div className="stat-lbl">Faturamento hoje</div></div>
                  <div className="stat-card"><div className="stat-val">{dashData?.total_clientes ?? 0}</div><div className="stat-lbl">Total de clientes</div></div>
                </div>}
              {dashData?.alerta_estoque?.esgotado > 0 || dashData?.alerta_estoque?.baixo > 0 ? (
                <div onClick={() => setTab("produtos")}
                  style={{ margin: "14px 28px 0", padding: "12px 16px", background: "linear-gradient(135deg,rgba(234,179,8,.12),rgba(220,38,38,.06))", border: "1px solid rgba(234,179,8,.4)", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all .2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#eab308"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(234,179,8,.4)"}
                >
                  <div style={{ fontSize: 22 }}>⚠️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#eab308" }}>
                      {dashData.alerta_estoque.esgotado > 0 && <>{dashData.alerta_estoque.esgotado} produto(s) esgotado(s)</>}
                      {dashData.alerta_estoque.esgotado > 0 && dashData.alerta_estoque.baixo > 0 && " · "}
                      {dashData.alerta_estoque.baixo > 0 && <>{dashData.alerta_estoque.baixo} com estoque baixo</>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Clique pra abrir a aba de Produtos e repor.</div>
                  </div>
                  <div style={{ fontSize: 16, color: "var(--muted)" }}>→</div>
                </div>
              ) : null}
              <div style={{ padding: "22px 28px" }}>
                {loadDash ? [1,2,3].map(i => <div key={i} className="skel" style={{ height: 65, marginBottom: 8 }} />)
                  : dashData?.agenda?.length === 0 ? <div className="empty-state"><div className="empty-icon">📅</div><div className="empty-title">Sem agendamentos hoje</div><div style={{ fontSize: 13 }}>Quando houver agendamentos, aparecerão aqui.</div></div>
                    : dashData?.agenda?.slice(0, 5).map(a => (
                      <div key={a.id} className="agenda-item">
                        <div className="agenda-hora">{a.hora}</div>
                        <div className="agenda-info">
                          <div className="agenda-svc">{a.emoji} {a.servico}</div>
                          <div className="agenda-meta">{a.cliente} · {a.barbeiro} · {formatPreco(a.preco)}</div>
                        </div>
                        <div className="agenda-actions">
                          <button className="btn-sm btn-sm-green" onClick={() => concluirAgendamento(a.id)}>✓ Concluir</button>
                          <button className="btn-sm btn-sm-red" onClick={() => cancelarAgendamento(a.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                {dashData?.agenda?.length > 5 && (
                  <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setTab("agenda")}>Ver agenda completa →</button>
                )}
              </div>
            </div>
          )}
          {tab === "agenda" && (
            <div className="fade-up">
              <SectionHeader title="Agenda" subtitle={(() => {
                const d = new Date(agendaDate + "T12:00:00");
                return `${d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`;
              })()} />
              <div style={{ padding: "14px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button className="btn-ghost" style={{ width: 34, height: 34, padding: 0, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => navDate(-1)}>‹</button>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {(() => {
                      const d = new Date(agendaDate + "T12:00:00");
                      const hoje = new Date(); hoje.setHours(12,0,0,0);
                      const diff = Math.round((d - hoje) / 86400000);
                      if (diff === 0) return "Hoje";
                      if (diff === 1) return "Amanhã";
                      if (diff === -1) return "Ontem";
                      return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
                    })()}
                  </div>
                  <button className="btn-ghost" style={{ width: 34, height: 34, padding: 0, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => navDate(1)}>›</button>
                </div>
                <button className="days-cal-btn" onClick={() => setShowCal(true)}>📅 Ver mês</button>
              </div>
              <div style={{ padding: "22px 28px" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, padding: 6, background: "rgba(255,255,255,.05)", borderRadius: 6, fontFamily: "monospace" }}>
                  agendaDate: {agendaDate} | loading: {String(agendaLoading)} | agenda: {agendaData?.agenda?.length ?? "null"} | date_used: {agendaData?.date_used ?? "?"} | itens: {agendaData?.agenda?.length ?? 0}
                </div>
                {agendaLoading ? [1,2,3].map(i => <div key={i} className="skel" style={{ height: 65, marginBottom: 8 }} />)
                  : !agendaData?.agenda?.length ? <div className="empty-state"><div className="empty-icon">📅</div><div className="empty-title">Sem agendamentos nesta data</div><div style={{ fontSize: 13 }}>Nenhum agendamento encontrado para este dia.</div></div>
                    : agendaData.agenda.map(a => (
                      <div key={a.id} className="agenda-item">
                        <div className="agenda-hora">{a.hora}</div>
                        <div className="agenda-info">
                          <div className="agenda-svc">{a.emoji} {a.servico}</div>
                          <div className="agenda-meta">{a.cliente} · {a.barbeiro} · {formatPreco(a.preco)}</div>
                        </div>
                        <div className="agenda-actions">
                          <button className="btn-sm btn-sm-green" onClick={() => concluirAgendamento(a.id)}>✓ Concluir</button>
                          <button className="btn-sm btn-sm-red" onClick={() => cancelarAgendamento(a.id)}>✕</button>
                        </div>
                      </div>
                    ))}
              </div>
              {showCal && <CalendarioMes onSelect={(iso) => { setAgendaDate(iso); carregarAgenda(iso); setShowCal(false); }} onClose={() => setShowCal(false)} />}
            </div>
          )}
          {tab === "clientes" && (
            <div className="fade-up">
              <SectionHeader title="Clientes" subtitle="Base completa de clientes" />
              <div style={{ padding: "22px 28px" }}>
                {loadClientes ? [1,2,3,4].map(i => <div key={i} className="skel" style={{ height: 60, marginBottom: 8 }} />)
                  : <div className="clientes-grid">{clientesData?.map(c => (
                    <div key={c.id} className="cliente-card">
                      <div className="cliente-av">{initials(c.nome)}</div>
                      <div style={{ flex: 1 }}>
                        <div className="cliente-nome">{c.nome}</div>
                        <div className="cliente-meta">📱 {c.whatsapp} · {c.total_agendamentos} agend.</div>
                      </div>
                      <div className="cliente-gasto">{formatPreco(c.total_gasto)}</div>
                    </div>
                  ))}</div>}
              </div>
            </div>
          )}
          {tab === "jornadas" && (
            <div className="fade-up">
              <SectionHeader title="Jornadas" subtitle="Horários de trabalho dos barbeiros" />
              <div style={{ padding: "22px 28px" }}>
                <Suspense fallback={<LazyFallback />}><GestaoJornadas showToast={showToast} /></Suspense>
              </div>
            </div>
          )}
          {tab === "produtos" && (
            <div className="fade-up">
              <SectionHeader title="Produtos" subtitle="Catálogo e estoque" />
              <div style={{ padding: "22px 28px" }}>
                <Suspense fallback={<LazyFallback />}><GestaoProdutos showToast={showToast} /></Suspense>
              </div>
            </div>
          )}
          {tab === "aniversariantes" && (
            <div className="fade-up">
              <SectionHeader title="Aniversariantes" subtitle="Clientes que fazem aniversário" />
              <div style={{ padding: "22px 28px" }}>
                <Suspense fallback={<LazyFallback />}><GestaoAniversariantes showToast={showToast} /></Suspense>
              </div>
            </div>
          )}
          {tab === "listaEspera" && (
            <div className="fade-up">
              <SectionHeader title="Lista de Espera" subtitle="Clientes aguardando encaixe" />
              <div style={{ padding: "22px 28px" }}>
                <Suspense fallback={<LazyFallback />}><GestaoListaEspera showToast={showToast} /></Suspense>
              </div>
            </div>
          )}
          {tab === "pacotes" && (
            <div className="fade-up">
              <SectionHeader title="Pacotes" subtitle="Pacotes de serviços" />
              <div style={{ padding: "22px 28px" }}>
                <Suspense fallback={<LazyFallback />}><GestaoPacotes showToast={showToast} /></Suspense>
              </div>
            </div>
          )}
          {tab === "financeiro" && (
            <div className="fade-up">
              <SectionHeader title="Financeiro" subtitle="Contas, receitas e despesas" />
              <div style={{ padding: "22px 28px" }}>
                <Suspense fallback={<LazyFallback />}><GestaoFinanceira showToast={showToast} /></Suspense>
              </div>
            </div>
          )}
          {tab === "relatorios" && (
            <div className="fade-up">
              <SectionHeader title="Relatórios" subtitle="Métricas e indicadores" />
              <div style={{ padding: "22px 28px" }}>
                <Suspense fallback={<LazyFallback />}><Relatorios showToast={showToast} /></Suspense>
              </div>
            </div>
          )}
          {tab === "assinatura" && (
            <div className="fade-up">
              <SectionHeader title="Minha Assinatura" subtitle="Plano, faturas e pagamentos" />
              <div style={{ padding: "22px 28px" }}>
                <Suspense fallback={<LazyFallback />}><GestaoAssinatura showToast={showToast} /></Suspense>
              </div>
            </div>
          )}
          {tab === "configuracoes" && (
            <div className="fade-up">
              <SectionHeader title="Configurações" subtitle="PagSeguro, integrações e preferências" />
              <div style={{ padding: "22px 28px", display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
                <Suspense fallback={<LazyFallback />}><ConfiguracoesLembretes onSaved={() => {}} showToast={showToast} /></Suspense>
                <ConfiguracoesPagSeguro onSaved={() => showToast("Configurações salvas!")} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CalendarioMes({ onSelect, onClose }) {
  const hoje = new Date(); hoje.setHours(12,0,0,0);
  const hojeStr = hoje.toISOString().slice(0,10);
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimo.getDate();
  const inicioSemana = primeiro.getDay();

  const navMes = (delta) => {
    const d = new Date(ano, mes + delta, 1);
    setMes(d.getMonth());
    setAno(d.getFullYear());
  };

  const dias = [];
  for (let i = 0; i < inicioSemana; i++) dias.push(null);
  for (let d = 1; d <= diasNoMes; d++) dias.push(d);

  const rows = [];
  for (let i = 0; i < dias.length; i += 7) rows.push(dias.slice(i, i + 7));

  return (
    <div className="cal-ov" onClick={onClose}>
      <div className="cal-box" onClick={(e) => e.stopPropagation()}>
        <div className="cal-hd">
          <button className="cal-nav" onClick={() => navMes(-1)}>‹</button>
          <div className="cal-month">{primeiro.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</div>
          <button className="cal-nav" onClick={() => navMes(1)}>›</button>
        </div>
        <div className="cal-grid">
          {SEMANA.map(s => <div key={s} className="cal-weekday">{s}</div>)}
          {rows.map((row, ri) => row.map((d, ci) => {
            const key = ri * 7 + ci;
            if (d === null) return <div key={key} />;
            const iso = `${ano}-${String(mes+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const isToday = iso === hojeStr;
            const isPast = iso < hojeStr;
            return (
              <button key={key} className={`cal-day ${isToday ? "cal-today" : ""} ${isPast ? "cal-past" : ""}`}
                   disabled={isPast} onClick={() => onSelect(iso)}>
                {d}
              </button>
            );
          }))}
        </div>
      </div>
    </div>
  );
}
