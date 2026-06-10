import { useState, useEffect } from "react";
import { apiFetch } from "./api";
import { PaymentScreen } from "./PaymentScreen";
import {
  formatPreco, formatWhatsapp, whatsappValido,
  getSvcImg, getBarbImg, useApi, useToast, useDrawer, Toast,
  WPP_BARBEARIA, initials,
} from "./shared";
import { CSS } from "./styles";
import { BookingFlow } from "./BookingFlow";

/**
 * ClientApp — portal do cliente logado.
 * Vê: histórico de agendamentos, perfil, próximos.
 * NÃO vê: painel gestor (apenas /gestor faz isso).
 */
export function ClientApp({ navigate }) {
  const [usuario, setUsuario] = useState(() => { try { return JSON.parse(localStorage.getItem("usuario")); } catch { return null; } });
  const [tab, setTab] = useState("home");
  const [booking, setBooking] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [paying, setPaying] = useState(null);
  const [histTab, setHT] = useState("all");
  const drawer = useDrawer();
  const { toast, showToast } = useToast();

  const { data: historico, loading: loadHist, reload: reloadHist } = useApi(
    () => usuario ? apiFetch("/agendamentos") : Promise.resolve([]),
    [usuario?.whatsapp]
  );
  const { data: servicos, loading: loadSvc } = useApi(() => apiFetch("/servicos"));
  const { data: barbeiros, loading: loadBarb } = useApi(() => apiFetch("/barbeiros"));
  const { data: produtos, loading: loadProd } = useApi(() => apiFetch("/produtos"));
  const [whatsappPerfil, setWhatsappPerfil] = useState(formatWhatsapp(usuario?.whatsapp || ""));
  const [whatsappPerfilErr, setWhatsappPerfilErr] = useState("");
  const [salvandoWhatsapp, setSalvandoWhatsapp] = useState(false);

  useEffect(() => {
    setWhatsappPerfil(formatWhatsapp(usuario?.whatsapp || ""));
    setWhatsappPerfilErr("");
  }, [usuario?.whatsapp]);

  if (!usuario) {
    return <AuthScreen onAuth={(res) => { setUsuario(res.usuario); localStorage.setItem("usuario", JSON.stringify(res.usuario)); localStorage.setItem("token", res.token); }} navigate={navigate} />;
  }

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
    navigate("/");
  };

  const goBook = () => {
    setBooking(true);
    setTab("book");
  };

  const cancelarAgendamento = async (id) => {
    try { await apiFetch(`/agendamentos/${id}/cancelar`, { method: "PATCH" }); showToast("Agendamento cancelado."); reloadHist(); }
    catch (e) { showToast(e.message, "err"); }
  };

  const avaliar = async (id, nota) => {
    try { await apiFetch(`/agendamentos/${id}/avaliar`, { method: "PATCH", body: JSON.stringify({ avaliacao: nota }) }); showToast("Avaliação salva! ⭐"); reloadHist(); }
    catch (e) { showToast(e.message, "err"); }
  };

  const salvarWhatsapp = async () => {
    const limpo = String(whatsappPerfil || "").replace(/\D/g, "");
    if (!whatsappValido(whatsappPerfil)) { setWhatsappPerfilErr("Informe um WhatsApp válido com DDD."); return; }
    setSalvandoWhatsapp(true);
    try {
      const res = await apiFetch("/auth/me/whatsapp", { method: "PATCH", body: JSON.stringify({ whatsapp: limpo }) });
      localStorage.setItem("usuario", JSON.stringify(res.usuario));
      setUsuario(res.usuario);
      setWhatsappPerfilErr("");
      showToast("WhatsApp atualizado.");
    } catch (e) { showToast(e.message, "err"); }
    finally { setSalvandoWhatsapp(false); }
  };

  if (booking) {
    return (
      <>
        <style>{CSS}</style>
        <BookingFlow
          initialData={{ nome: usuario.nome, whatsapp: usuario.whatsapp }}
          onBooked={() => reloadHist()}
          onClose={() => { setBooking(false); setTab("history"); }}
        />
      </>
    );
  }

  const filteredHist = historico ? (histTab === "all" ? historico : historico.filter(h => h.status === histTab)) : [];
  const proximoApt = historico?.find(h => h.status === "confirmado");
  const hoje = new Date();
  const navItems = [
    { key: "home", icon: "🏠", label: "Início" },
    { key: "services", icon: "✂️", label: "Serviços" },
    { key: "barbers", icon: "💈", label: "Barbeiros" },
    { key: "produtos", icon: "🛍️", label: "Produtos" },
    { key: "book", icon: "📅", label: "Agendar" },
    { key: "history", icon: "📋", label: "Histórico" },
    { key: "profile", icon: "👤", label: "Perfil" },
  ];

  return (
    <>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} />
      {paying && <PaymentScreen agendamento={paying} onClose={() => setPaying(null)} onSuccess={() => { reloadHist(); setPaying(null); showToast("Pagamento confirmado!"); }} />}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}

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
        {/* SIDEBAR */}
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
          <div className="sb-status"><div className="pill-green"><div className="dot-live" />Aberto agora</div></div>
          <div className="sb-nav">
            <div className="sb-section">Menu</div>
            {navItems.map(n => (
              <div key={n.key} className={`nav-item ${tab === n.key ? "active" : ""}`} onClick={() => { if (n.key === "book") { goBook(); drawer.close(); } else { setTab(n.key); drawer.close(); } }}>
                <span className="nav-ic">{n.icon}</span>
                <span className="nav-lbl">{n.label}</span>
              </div>
            ))}
          </div>
          <div className="sb-user">
            <div className="sb-av"><img src={getBarbImg(usuario.nome)} alt={usuario.nome} onError={e => { e.target.style.display = "none"; }} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-uname">{usuario.nome.split(" ")[0]}</div>
              <div className="sb-urole">Cliente</div>
            </div>
            <div className="sb-logout" onClick={logout} title="Sair">🚪</div>
          </div>
        </div>

        {/* MAIN */}
        <div className="main">
          {tab === "home" && (
            <div className="fade-up">
              <div style={{ position: "relative", height: 280, overflow: "hidden" }}>
                <img src={IMGS_HERO} alt="barbearia" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right,rgba(6,6,6,.85) 35%,rgba(6,6,6,.25) 100%)" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 28px" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
                      {hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                    <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1.15, marginBottom: 16 }}>
                      Olá, <span style={{ color: "var(--gold)" }}>{usuario.nome.split(" ")[0]}</span>! ✂️
                    </h1>
                    <button className="btn-gold" style={{ width: "auto", padding: "11px 20px" }} onClick={goBook}>Marcar horário →</button>
                  </div>
                </div>
              </div>
              <div style={{ padding: "22px 28px" }}>
                {proximoApt && (
                  <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: 18 }}>
                    <div style={{ background: "linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.04))", borderBottom: "1px solid var(--gold-border)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--gold)" }}>Próximo agendamento</span>
                      <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600 }}>● {proximoApt.data_fmt}</span>
                    </div>
                    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 11 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", border: "1.5px solid var(--gold-border)", flexShrink: 0 }}>
                        <img src={getBarbImg(proximoApt.barbeiro)} alt={proximoApt.barbeiro} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{proximoApt.emoji} {proximoApt.servico}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Com {proximoApt.barbeiro} · {formatPreco(proximoApt.preco)}</div>
                      </div>
                    </div>
                    <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
                      <button className="btn-sm btn-sm-ghost" onClick={() => cancelarAgendamento(proximoApt.id)}>Cancelar</button>
                      <button className="btn-sm btn-sm-gold" onClick={goBook}>Reagendar</button>
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 11 }}>Acesso rápido</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div onClick={goBook} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, cursor: "pointer", transition: "all .2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold-border)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Novo agendamento</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Reserve seu próximo horário</div>
                  </div>
                  <div onClick={() => setTab("history")} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, cursor: "pointer", transition: "all .2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold-border)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Meus agendamentos</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Histórico completo</div>
                  </div>
                  <div onClick={() => setTab("produtos")} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, cursor: "pointer", transition: "all .2s", gridColumn: "1 / -1" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold-border)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 24 }}>🛍️</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Nossos produtos</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>Pomadas, óleos e finalizadores selecionados pelos barbeiros</div>
                      </div>
                      <div style={{ marginLeft: "auto", fontSize: 16, color: "var(--muted)" }}>→</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "services" && (
            <div className="fade-up">
              <div className="ph"><div><h1>Serviços</h1><p>Conheça o que oferecemos</p></div><button className="btn-gold" style={{ width: "auto", padding: "9px 18px" }} onClick={goBook}>+ Agendar</button></div>
              <div style={{ padding: "20px 28px" }}>
                {loadSvc ? <div className="landing-svc-grid">{[1,2,3,4].map(i => <div key={i} className="skel" style={{ height: 280 }} />)}</div>
                  : <div className="landing-svc-grid">{servicos?.map(s => (
                    <div key={s.id} className="landing-svc-card" onClick={goBook}>
                      {s.id <= 2 && <div className="tag-pop">Popular</div>}
                      <img className="landing-svc-card-img" src={getSvcImg(s.id)} alt={s.nome} loading="lazy" />
                      <div className="landing-svc-card-body">
                        <div className="landing-svc-name">{s.emoji} {s.nome}</div>
                        <div className="landing-svc-meta">{s.descricao} · {s.duracao_min} min</div>
                        <div className="landing-svc-foot">
                          <div>
                            <div className="landing-svc-price">{formatPreco(s.preco)}</div>
                            <div className="landing-svc-price-sub">à vista no Pix</div>
                          </div>
                          <div className="landing-svc-arrow">→</div>
                        </div>
                      </div>
                    </div>
                  ))}</div>}
              </div>
            </div>
          )}

          {tab === "barbers" && (
            <div className="fade-up">
              <div className="ph"><div><h1>Barbeiros</h1><p>Nossos mestres</p></div><button className="btn-gold" style={{ width: "auto", padding: "9px 18px" }} onClick={goBook}>+ Agendar</button></div>
              <div style={{ padding: "20px 28px" }}>
                <div className="landing-barbers-grid">
                  {loadBarb ? [1,2,3].map(i => <div key={i} className="skel" style={{ aspectRatio: "3/4" }} />)
                    : barbeiros?.map(b => (
                      <div key={b.id} className="landing-barber-card" onClick={goBook}>
                        <img className="landing-barber-img" src={getBarbImg(b.nome)} alt={b.nome} loading="lazy" />
                        <div className="landing-barber-ov" />
                        <div className="landing-barber-info">
                          <div className="landing-barber-name">{b.nome}</div>
                          <div className="landing-barber-role">
                            <span className="bc-on-dot" />
                            {b.especialidade || "Barbeiro Master"}
                          </div>
                          <div className="landing-barber-stars">
                            <span className="landing-barber-stars-gold">★★★★★</span> {b.avaliacao} · {b.total_cortes} cortes
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {tab === "produtos" && (
            <div className="fade-up">
              <div className="ph"><div><h1>Produtos</h1><p>Leve pra casa o padrão Doctor</p></div></div>
              <div style={{ padding: "20px 28px" }}>
                {loadProd ? <div className="landing-prod-grid">{[1,2,3,4].map(i => <div key={i} className="skel" style={{ height: 280, borderRadius: 12 }} />)}</div>
                  : !produtos || produtos.length === 0 ? <div className="empty-state"><div className="empty-icon">🛍️</div><div className="empty-title">Em breve</div><p style={{ fontSize: 13 }}>Nosso catálogo de produtos está sendo preparado.</p></div>
                    : <>
                        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>{produtos.length} produto(s) disponível(is)</span>
                        </div>
                        <div className="landing-prod-grid">
                          {produtos.map(p => (
                            <div key={p.id} className="landing-prod-card">
                              {p.destaque && <div className="tag-pop">⭐ Destaque</div>}
                              <div className="landing-prod-img-wrap">
                                {p.foto_url
                                  ? <img className="landing-prod-img" src={p.foto_url} alt={p.nome} loading="lazy" onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.innerHTML = "<div class='landing-prod-emoji'>📦</div>"; }} />
                                  : <div className="landing-prod-emoji">📦</div>}
                              </div>
                              <div className="landing-prod-body">
                                <div className="landing-prod-name">{p.nome}</div>
                                {p.descricao && <div className="landing-prod-desc">{p.descricao}</div>}
                                <div className="landing-prod-price">{formatPreco(p.preco)}</div>
                                {p.estoque != null && (
                                  <div style={{ fontSize: 10, marginTop: 4, color: p.estoque <= 0 ? "#ef4444" : p.estoque <= 5 ? "#eab308" : "var(--green)", fontWeight: 600 }}>
                                    {p.estoque <= 0 ? "● Esgotado" : `● ${p.estoque} em estoque`}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 20, padding: 16, background: "linear-gradient(135deg,rgba(201,168,76,.08),transparent)", border: "1px solid var(--gold-border)", borderRadius: 12, textAlign: "center" }}>
                          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Quer comprar? É só pedir no próximo atendimento.</div>
                          <button className="btn-gold" style={{ width: "auto", padding: "10px 20px", display: "inline-flex" }} onClick={goBook}>Agendar e comprar →</button>
                        </div>
                      </>}
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="fade-up">
              <div className="ph"><div><h1>Histórico</h1><p>Todos os seus atendimentos</p></div><button className="btn-gold" style={{ width: "auto", padding: "9px 18px" }} onClick={goBook}>+ Agendar</button></div>
              <div style={{ padding: "20px 28px" }}>
                <div className="hist-tabs">
                  {[["all","Todos"],["confirmado","Próximos"],["concluido","Concluídos"],["cancelado","Cancelados"]].map(([k,l]) => (
                    <button key={k} className={`htab ${histTab === k ? "ht-active" : ""}`} onClick={() => setHT(k)}>{l}</button>
                  ))}
                </div>
                {loadHist ? <div className="hist-grid">{[1,2,3,4].map(i => <div key={i} className="skel" style={{ height: 105, borderRadius: "var(--r)" }} />)}</div>
                  : filteredHist.length === 0 ? <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">Nenhum agendamento</div><p style={{ fontSize: 13 }}>Quando você agendar, aparecerá aqui.</p></div>
                    : <div className="hist-grid">{filteredHist.map(h => (
                      <div key={h.id} className="hist-card">
                        <div className="hist-head"><span style={{ fontSize: 13, fontWeight: 600 }}>{h.data_fmt}</span><span className={`hist-badge ${h.status === "concluido" ? "hb-done" : h.status === "cancelado" ? "hb-cancel" : "hb-upcoming"}`}>{h.status === "concluido" ? "Concluído" : h.status === "cancelado" ? "Cancelado" : "Próximo"}</span></div>
                        <div className="hist-body">
                          <div className="hist-av"><img src={getBarbImg(h.barbeiro)} alt={h.barbeiro} /></div>
                          <div className="hist-info"><h4>{h.emoji} {h.servico}</h4><p>Com {h.barbeiro}</p></div>
                          <div className="hist-price">{formatPreco(h.preco)}</div>
                        </div>
                        {h.status === "concluido" && (
                          <div className="hist-footer">
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>Avaliação:</span>
                            {[1,2,3,4,5].map(n => (<button key={n} className="star-btn" onClick={() => avaliar(h.id, n)}>{n <= (h.avaliacao || 0) ? "⭐" : "☆"}</button>))}
                          </div>
                        )}
                        {h.status === "confirmado" && (
                          <div className="hist-footer">
                            <button className="btn-sm btn-sm-ghost" style={{ flex: 1 }} onClick={() => cancelarAgendamento(h.id)}>Cancelar</button>
                            {h.pagamento_status !== "pago" && <button className="btn-sm btn-sm-gold" style={{ flex: 1 }} onClick={() => setPaying(h)}>Pagar</button>}
                            <button className="btn-sm btn-sm-gold" style={{ flex: 1 }} onClick={goBook}>Reagendar</button>
                          </div>
                        )}
                      </div>
                    ))}</div>}
              </div>
            </div>
          )}

          {tab === "profile" && (
            <div className="fade-up">
              <div className="ph"><div><h1>Perfil</h1><p>Suas informações e configurações</p></div></div>
              <div className="prof-layout">
                <div className="prof-left">
                  <div>
                    <div className="prof-avatar">{initials(usuario.nome)}</div>
                    <div className="prof-name">{usuario.nome}</div>
                    <div className="prof-role">{usuario.email}</div>
                    <div className="prof-role" style={{ marginTop: 3 }}>Cliente</div>
                  </div>
                  <div>
                    <div className="prof-stat"><span className="prof-stat-lbl">Cortes realizados</span><span className="prof-stat-val">{historico?.filter(h => h.status === "concluido").length ?? "—"}</span></div>
                    <div className="prof-stat"><span className="prof-stat-lbl">Total investido</span><span className="prof-stat-val" style={{ fontSize: 14 }}>{historico ? `R$${historico.filter(h => h.status === "concluido").reduce((a, h) => a + Number(h.preco), 0).toFixed(0)}` : ""}</span></div>
                  </div>
                </div>
                <div className="prof-right">
                  <div className="prof-section-title">Conta</div>
                  <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Seu WhatsApp</div>
                    <input className={`inp${whatsappPerfilErr ? " err" : ""}`} placeholder="(11) 99999-9999" value={whatsappPerfil} onChange={e => { setWhatsappPerfil(formatWhatsapp(e.target.value)); if (whatsappPerfilErr) setWhatsappPerfilErr(""); }} style={{ marginBottom: 6 }} />
                    {whatsappPerfilErr && <div className="err-msg" style={{ marginBottom: 8 }}>{whatsappPerfilErr}</div>}
                    <button className="btn-gold" style={{ padding: "10px 12px", fontSize: 13 }} disabled={salvandoWhatsapp || !whatsappValido(whatsappPerfil)} onClick={salvarWhatsapp}>
                      {salvandoWhatsapp ? "Salvando..." : "Salvar WhatsApp"}
                    </button>
                  </div>
                  <div className="prof-item prof-item-wpp" onClick={() => window.open(`https://wa.me/${WPP_BARBEARIA}?text=Olá! Gostaria de falar sobre um agendamento.`, "_blank")}>
                    <div className="prof-item-icon">📞</div>
                    <div className="prof-item-label">Falar com a barbearia</div>
                    <div style={{ fontSize: 11, color: "#5BCF7A", fontWeight: 600 }}>WhatsApp ↗</div>
                  </div>
                  <div className="prof-section-title">Configurações</div>
                  <div className="prof-item"><div className="prof-item-icon">🔔</div><div className="prof-item-label">Notificações WhatsApp</div><div className="prof-item-badge">Ativo</div></div>
                  <div className="prof-item" onClick={() => setShowFeedback(true)}><div className="prof-item-icon">⭐</div><div className="prof-item-label">Avaliar o app</div><div className="prof-item-arrow">›</div></div>
                  <div className="prof-item" onClick={logout} style={{ borderColor: "var(--red-border)" }}><div className="prof-item-icon">🚪</div><div className="prof-item-label" style={{ color: "var(--red)" }}>Sair da conta</div></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// IMGS hero import local
const IMGS_HERO = "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=80";

// Modal de feedback (extraído do App.jsx)
function FeedbackModal({ onClose }) {
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  if (ok) return <div className="modal-ov" onClick={onClose}><div className="modal-box" onClick={e => e.stopPropagation()}><div style={{ textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 12 }}>🙏</div><div className="modal-title">Obrigado!</div><div className="modal-sub">Seu feedback é muito importante.</div><button className="btn-gold" onClick={onClose}>Fechar</button></div></div></div>;
  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Avaliar o app</div>
        <div className="modal-sub">Como está sendo sua experiência?</div>
        <div className="modal-stars">{[1,2,3,4,5].map(n => (<button key={n} className="modal-star" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setNota(n)}>{n <= (hover || nota) ? "⭐" : "☆"}</button>))}</div>
        <div className="inp-grp"><label className="inp-lbl">Comentário (opcional)</label><textarea className="inp" rows={3} placeholder="Conte sua experiência..." value={msg} onChange={e => setMsg(e.target.value)} style={{ resize: "none", lineHeight: 1.5 }} /></div>
        <button className="btn-gold" disabled={!nota} onClick={() => setOk(true)} style={{ marginBottom: 8 }}>Enviar avaliação</button>
        <button className="btn-ghost" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

// Auth screen para /minha-conta quando não logado
function AuthScreen({ onAuth, navigate }) {
  const [authTab, setAuthTab] = useState("login");
  const [authForm, setAuthForm] = useState({ nome: "", email: "", whatsapp: "", senha: "", confirmar: "" });
  const [authErr, setAuthErr] = useState({});
  const [authApiErr, setAuthApiErr] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const login = async () => {
    const errs = {};
    if (!authForm.email) errs.email = "Informe o e-mail";
    if (!authForm.senha) errs.senha = "Informe a senha";
    setAuthErr(errs);
    setAuthApiErr("");
    if (Object.keys(errs).length) return;
    setAuthLoading(true);
    try {
      const res = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email: authForm.email, senha: authForm.senha }) });
      onAuth(res);
    } catch (e) { setAuthApiErr(e.message); }
    finally { setAuthLoading(false); }
  };

  const cadastro = async () => {
    const errs = {};
    if (!authForm.nome) errs.nome = "Informe seu nome";
    if (!authForm.email) errs.email = "Informe o e-mail";
    if (authForm.whatsapp && !whatsappValido(authForm.whatsapp)) errs.whatsapp = "Informe um WhatsApp válido";
    if (!authForm.senha || authForm.senha.length < 6) errs.senha = "Mínimo 6 caracteres";
    if (authForm.senha !== authForm.confirmar) errs.confirmar = "Senhas não coincidem";
    setAuthErr(errs);
    setAuthApiErr("");
    if (Object.keys(errs).length) return;
    setAuthLoading(true);
    try {
      const res = await apiFetch("/auth/cadastro", { method: "POST", body: JSON.stringify({ nome: authForm.nome, email: authForm.email, whatsapp: String(authForm.whatsapp || "").replace(/\D/g, ""), senha: authForm.senha }) });
      onAuth(res);
    } catch (e) { setAuthApiErr(e.message); }
    finally { setAuthLoading(false); }
  };

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", height: "100vh" }}>
      <style>{CSS}</style>
      <div style={{ position: "relative", height: "100vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", filter: "brightness(.45)" }} src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80" alt="Doctor Barbearia" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,rgba(6,6,6,.7) 0%,rgba(6,6,6,.55) 50%,rgba(6,6,6,.75) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32, cursor: "pointer" }} onClick={() => navigate("/")}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 52, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-.02em" }}>Doctor</div>
            <div style={{ width: 48, height: 1, background: "var(--gold)", margin: "10px auto" }} />
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".28em", textTransform: "uppercase", color: "rgba(255,255,255,.45)" }}>Barbearia</div>
          </div>
          <div style={{ width: "100%", background: "rgba(10,8,6,.82)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 4, padding: "36px 36px 32px", backdropFilter: "blur(28px)", boxShadow: "0 32px 80px rgba(0,0,0,.6)" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: 4, letterSpacing: "-.01em" }}>Minha conta</div>
            <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginBottom: 24, letterSpacing: ".02em" }}>Acesse para ver seus agendamentos</div>
            <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "var(--bg3)", borderRadius: 10, padding: 3 }}>
              <button onClick={() => { setAuthTab("login"); setAuthErr({}); }} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", background: authTab === "login" ? "var(--bg2)" : "transparent", color: authTab === "login" ? "var(--text)" : "var(--muted)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Entrar</button>
              <button onClick={() => { setAuthTab("cadastro"); setAuthErr({}); }} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", background: authTab === "cadastro" ? "var(--bg2)" : "transparent", color: authTab === "cadastro" ? "var(--text)" : "var(--muted)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Criar conta</button>
            </div>
            {authTab === "login" ? (
              <>
                {authApiErr && <div style={{ background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,80,80,.3)", color: "#ff7a7a", padding: "10px 12px", borderRadius: 8, fontSize: 12, marginBottom: 14 }}>⚠️ {authApiErr}</div>}
                <div className="inp-grp"><label className="inp-lbl">E-mail</label><input className={`inp${authErr.email ? " err" : ""}`} type="email" placeholder="seu@email.com" value={authForm.email} onChange={e => { setAuthForm(f => ({ ...f, email: e.target.value })); setAuthApiErr(""); }} />{authErr.email && <div className="err-msg">{authErr.email}</div>}</div>
                <div className="inp-grp" style={{ marginBottom: 18 }}><label className="inp-lbl">Senha</label><input className={`inp${authErr.senha ? " err" : ""}`} type="password" placeholder="••••••••" value={authForm.senha} onChange={e => { setAuthForm(f => ({ ...f, senha: e.target.value })); setAuthApiErr(""); }} onKeyDown={e => e.key === "Enter" && login()} />{authErr.senha && <div className="err-msg">{authErr.senha}</div>}</div>
                <button className="btn-gold" disabled={authLoading} onClick={login}>{authLoading ? <><div className="spinner" />Entrando...</> : "Entrar"}</button>
              </>
            ) : (
              <>
                {authApiErr && <div style={{ background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,80,80,.3)", color: "#ff7a7a", padding: "10px 12px", borderRadius: 8, fontSize: 12, marginBottom: 14 }}>⚠️ {authApiErr}</div>}
                <div className="inp-grp"><label className="inp-lbl">Nome completo</label><input className={`inp${authErr.nome ? " err" : ""}`} placeholder="Seu nome" value={authForm.nome} onChange={e => setAuthForm(f => ({ ...f, nome: e.target.value }))} />{authErr.nome && <div className="err-msg">{authErr.nome}</div>}</div>
                <div className="inp-grp"><label className="inp-lbl">E-mail</label><input className={`inp${authErr.email ? " err" : ""}`} type="email" placeholder="seu@email.com" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} />{authErr.email && <div className="err-msg">{authErr.email}</div>}</div>
                <div className="inp-grp"><label className="inp-lbl">WhatsApp</label><input className={`inp${authErr.whatsapp ? " err" : ""}`} placeholder="(11) 99999-9999" value={authForm.whatsapp} onChange={e => setAuthForm(f => ({ ...f, whatsapp: formatWhatsapp(e.target.value) }))} />{authErr.whatsapp && <div className="err-msg">{authErr.whatsapp}</div>}</div>
                <div className="inp-grp"><label className="inp-lbl">Senha</label><input className={`inp${authErr.senha ? " err" : ""}`} type="password" placeholder="Mínimo 6 caracteres" value={authForm.senha} onChange={e => setAuthForm(f => ({ ...f, senha: e.target.value }))} />{authErr.senha && <div className="err-msg">{authErr.senha}</div>}</div>
                <div className="inp-grp" style={{ marginBottom: 18 }}><label className="inp-lbl">Confirmar senha</label><input className={`inp${authErr.confirmar ? " err" : ""}`} type="password" placeholder="Repita a senha" value={authForm.confirmar} onChange={e => setAuthForm(f => ({ ...f, confirmar: e.target.value }))} />{authErr.confirmar && <div className="err-msg">{authErr.confirmar}</div>}</div>
                <button className="btn-gold" disabled={authLoading} onClick={cadastro}>{authLoading ? <><div className="spinner" />Criando...</> : "Criar conta"}</button>
              </>
            )}
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
