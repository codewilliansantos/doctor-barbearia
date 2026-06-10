import { useState } from "react";
import { apiFetch } from "./api";
import { IMGS, formatPreco, getSvcImg, getBarbImg, useApi, WPP_BARBEARIA } from "./shared";
import { CSS } from "./styles";
import { BookingFlow } from "./BookingFlow";

/**
 * LandingApp — página pública acessada via link da bio.
 * Visitante pode navegar pelos serviços, barbeiros e iniciar agendamento
 * SEM precisar de login. Login é opcional (canto superior direito).
 */
export function LandingApp({ navigate }) {
  const [booking, setBooking] = useState(false);
  const { data: servicos, loading: loadSvc } = useApi(() => apiFetch("/servicos"));
  const { data: barbeiros, loading: loadBarb } = useApi(() => apiFetch("/barbeiros"));
  const { data: produtosDestaque } = useApi(() => apiFetch("/produtos/destaque"));
  const { data: todosProdutos } = useApi(() => apiFetch("/produtos"));
  const produtosParaMostrar = (produtosDestaque && produtosDestaque.length > 0)
    ? produtosDestaque
    : (todosProdutos || []).slice(0, 4);

  if (booking) {
    return (
      <>
        <style>{CSS}</style>
        <BookingFlow onClose={() => setBooking(false)} />
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="landing">
        {/* NAV */}
        <nav className="landing-nav">
          <div className="landing-nav-logo">
            <div className="landing-nav-logo-mark">DB</div>
            <div>
              <div className="landing-nav-logo-txt">Doctor</div>
              <div className="landing-nav-logo-sub">Barbearia</div>
            </div>
          </div>
          <div className="landing-nav-actions">
            <span className="landing-footer-pill"><div className="dot-live" />Aberto agora</span>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a className="btn-outline landing-planos-link" onClick={(e) => { e.preventDefault(); navigate("/planos"); }} style={{ cursor: "pointer" }}>Planos</a>
            <button className="btn-outline" onClick={() => navigate("/minha-conta")}>Entrar</button>
          </div>
        </nav>

        {/* HERO */}
        <section className="landing-hero">
          <img className="landing-hero-bg" src={IMGS.heroBanner} alt="Doctor Barbearia" />
          <div className="landing-hero-ov" />
          <div className="landing-hero-grain" />
          <div className="landing-hero-content">
            <div className="landing-hero-eyebrow">
              <div className="landing-hero-eyebrow-dot" />
              Tradição & Estilo
            </div>
            <h1 className="landing-hero-h1">
              A barbearia que<br />
              <span>redefine</span> o clássico.
            </h1>
            <p className="landing-hero-p">
              Cortes autorais, ambiente premium e atendimento de mestre. Agende online em menos de 1 minuto — sem cadastro, sem complicação.
            </p>
            <div className="landing-hero-ctas">
              <button className="landing-hero-cta-primary" onClick={() => setBooking(true)}>
                Agendar agora →
              </button>
              <a className="landing-hero-cta-secondary" href={`https://wa.me/${WPP_BARBEARIA}?text=Olá! Gostaria de tirar uma dúvida.`} target="_blank" rel="noopener noreferrer">
                💬 Falar no WhatsApp
              </a>
            </div>
            <div className="landing-hero-stats">
              <div className="landing-hero-stat">
                <div className="landing-hero-stat-val">2.4k+</div>
                <div className="landing-hero-stat-lbl">Clientes atendidos</div>
              </div>
              <div className="landing-hero-stat">
                <div className="landing-hero-stat-val">4.9★</div>
                <div className="landing-hero-stat-lbl">Avaliação média</div>
              </div>
              <div className="landing-hero-stat" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="landing-hero-stat-val">5min</div>
                <div className="landing-hero-stat-lbl">Pra agendar</div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVIÇOS — vitrine de TIPOS (sem preço, sem descrição) */}
        <section className="landing-section">
          <div className="landing-section-hd">
            <div className="landing-section-eyebrow">Nossos serviços</div>
            <h2 className="landing-section-h2">
              Cortes que <span>falam por você</span>.
            </h2>
            <p className="landing-section-p">
              Do clássico ao moderno, cada serviço é executado com precisão por nossos barbeiros especialistas.
            </p>
          </div>
          <div className="landing-types-grid">
            {loadSvc ? [1,2,3,4,5,6].map(i => <div key={i} className="skel" style={{ aspectRatio: "4/5" }} />)
              : (servicos || []).slice(0, 6).map(s => (
                <div key={s.id} className="landing-type-card" onClick={() => setBooking(true)}>
                  <img className="landing-type-img" src={getSvcImg(s.id)} alt={s.nome} loading="lazy" />
                  <div className="landing-type-ov" />
                  <div className="landing-type-name">{s.nome}</div>
                </div>
              ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <button className="btn-gold" style={{ width: "auto", padding: "14px 32px", display: "inline-flex" }} onClick={() => setBooking(true)}>
              Ver serviços e agendar →
            </button>
          </div>
        </section>

        {/* BARBEIROS */}
        <section className="landing-section" style={{ paddingTop: 0 }}>
          <div className="landing-section-hd">
            <div className="landing-section-eyebrow">Time de mestres</div>
            <h2 className="landing-section-h2">
              Quem vai cuidar<br />do seu <span>estilo</span>.
            </h2>
            <p className="landing-section-p">
              Profissionais treinados nas técnicas mais avançadas de barbearia clássica e moderna.
            </p>
          </div>
          <div className="landing-barbers-grid">
            {loadBarb ? [1,2].map(i => <div key={i} className="skel" style={{ aspectRatio: "3/4" }} />)
              : barbeiros?.map(b => (
                <div key={b.id} className="landing-barber-card" onClick={() => setBooking(true)}>
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
        </section>

        {/* PRODUTOS */}
        {produtosParaMostrar.length > 0 && (
          <section className="landing-section" style={{ paddingTop: 0 }}>
            <div className="landing-section-hd">
              <div className="landing-section-eyebrow">Nossos produtos</div>
              <h2 className="landing-section-h2">
                Leve pra casa o <span>padrão Doctor</span>.
              </h2>
              <p className="landing-section-p">
                Produtos selecionados pelos nossos barbeiros pra você manter o visual sempre impecável.
              </p>
            </div>
            <div className="landing-prod-grid">
              {produtosParaMostrar.map(p => (
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
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA FINAL */}
        <section className="landing-section" style={{ paddingTop: 0 }}>
          <div className="landing-book-cta">
            <div className="landing-book-cta-content">
              <h2 className="landing-book-cta-h2">
                Pronto para o <span>corte perfeito</span>?
              </h2>
              <p className="landing-book-cta-p">
                Reserve seu horário em menos de 1 minuto. Sem cadastro, sem login — só chegar e ser bem atendido.
              </p>
              <button className="landing-book-cta-btn" onClick={() => setBooking(true)}>
                Agendar meu horário →
              </button>
            </div>
          </div>

          {/* CTA SaaS — tem uma barbearia? */}
          <div style={{ marginTop: 60, padding: 40, background: "linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04))", border: "1px solid var(--gold-border)", borderRadius: 24, textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -50, right: -20, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,168,76,.2) 0%,transparent 70%)", filter: "blur(40px)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg)", border: "1px solid var(--gold-border)", borderRadius: 20, padding: "5px 12px", fontSize: 10, fontWeight: 600, color: "var(--gold)", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 14 }}>
                💈 PARA DONOS DE BARBEARIA
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 700, marginBottom: 12, lineHeight: 1.05, letterSpacing: "-.02em" }}>
                Tem uma barbearia? <span style={{ color: "var(--gold)", fontStyle: "italic" }}>Venda mais</span> com o Doctor.
              </h2>
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, maxWidth: 540, margin: "0 auto 22px" }}>
                Agendamento online, gestão financeira, pacotes, lista de espera, WhatsApp e muito mais. A partir de R$ 79,90/mês.
              </p>
              <button className="btn-gold" style={{ width: "auto", padding: "14px 28px", display: "inline-flex" }} onClick={() => navigate("/planos")}>
                Conhecer planos →
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="landing-footer">
          <div className="landing-footer-inner">
            <div className="landing-footer-info">
              <div className="landing-footer-info-txt"><strong>Doctor Barbearia</strong></div>
              <div className="landing-footer-info-txt">© 2026 — Todos os direitos reservados</div>
              <div className="landing-footer-info-txt">Estr. Municipal Martins Guimarães, 129 · Vila Tesouro</div>
            </div>
            <div className="landing-footer-links">
              <a className="landing-footer-link" href={`https://wa.me/${WPP_BARBEARIA}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a className="landing-footer-link" onClick={(e) => { e.preventDefault(); navigate("/gestor"); }}>Área do Gestor</a>
              <span className="landing-footer-pill"><div className="dot-live" />Aberto agora</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
