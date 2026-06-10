import { useState, useEffect } from "react";
import { apiFetch, carregarBranding } from "./api";
import { useToast, Toast } from "./shared";
import { CSS } from "./styles";

export function PlanosPage({ navigate }) {
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkout, setCheckout] = useState(null);
  const [processando, setProcessando] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => { carregarBranding(); }, []);

  useEffect(() => {
    apiFetch("/billing/planos").then(r => {
      setPlanos(r.planos || []);
      setLoading(false);
    }).catch(e => { showToast(e.message, "err"); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const iniciarCheckout = async (planoId) => {
    setProcessando(true);
    try {
      const r = await apiFetch("/billing/checkout", { method: "POST", body: JSON.stringify({ plano_id: planoId, ciclo: "mensal" }) });
      setCheckout(r.checkout);
      showToast("Cobrança gerada! Pague com PIX, cartão ou boleto.");
    } catch (e) { showToast(e.message, "err"); }
    finally { setProcessando(false); }
  };

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} />
      {checkout && <CheckoutModal checkout={checkout} onClose={() => setCheckout(null)} />}

      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,6,6,.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => navigate("/")}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gold-dim)", border: "1px solid var(--gold-border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>DB</div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>Doctor</div>
            <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: ".14em", textTransform: "uppercase", marginTop: 1 }}>Barbearia</div>
          </div>
        </div>
        <button className="btn-ghost" style={{ width: "auto", padding: "8px 14px" }} onClick={() => navigate("/")}>← Voltar</button>
      </header>

      <section style={{ padding: "60px 24px 20px", textAlign: "center", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gold-dim)", border: "1px solid var(--gold-border)", borderRadius: 20, padding: "6px 14px", fontSize: 11, fontWeight: 600, color: "var(--gold)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 16 }}>
          ✨ PLANOS SaaS
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(32px,5vw,56px)", fontWeight: 700, lineHeight: 1.05, marginBottom: 14, letterSpacing: "-.02em" }}>
          Escolha o plano ideal para sua <span style={{ color: "var(--gold)", fontStyle: "italic" }}>barbearia</span>
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, maxWidth: 560, margin: "0 auto 14px" }}>
          Sistema completo de agendamento, gestão e financeiro. Cancele quando quiser, sem fidelidade.
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--green)", fontWeight: 600, background: "var(--green-dim)", border: "1px solid var(--green-border)", borderRadius: 8, padding: "6px 12px" }}>
          🎁 14 dias grátis em qualquer plano
        </div>
      </section>

      <section style={{ padding: "20px 24px 80px", maxWidth: 1100, margin: "0 auto" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skel" style={{ height: 460, borderRadius: 18 }} />)}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, alignItems: "stretch" }}>
            {planos.map((p, idx) => {
              const destaque = p.codigo === 'profissional';
              return (
                <div key={p.id} style={{
                  background: destaque ? "linear-gradient(180deg,rgba(201,168,76,.08),rgba(201,168,76,.02))" : "var(--bg2)",
                  border: destaque ? "2px solid var(--gold)" : "1px solid var(--border)",
                  borderRadius: 18, padding: 24, position: "relative", display: "flex", flexDirection: "column"
                }}>
                  {destaque && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--gold)", color: "#060606", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 30 }}>Mais popular</div>}
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 8 }}>{p.nome}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, color: "var(--muted)" }}>R$</span>
                    <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 44, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{Number(p.preco_mensal).toFixed(2).split('.')[0]}</span>
                    <span style={{ fontSize: 14, color: "var(--muted)" }}>,{Number(p.preco_mensal).toFixed(2).split('.')[1]}/mês</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18, minHeight: 32 }}>{p.descricao}</div>
                  <button
                    className={destaque ? "btn-gold" : "btn-outline"}
                    style={{ width: "100%", marginBottom: 18 }}
                    disabled={processando}
                    onClick={() => iniciarCheckout(p.id)}
                  >
                    {processando ? "Gerando..." : "Assinar agora"}
                  </button>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>Inclui:</div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                    {(p.recursos || []).map((r, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, lineHeight: 1.4 }}>
                        <span style={{ color: "var(--green)", fontSize: 14, lineHeight: 1, flexShrink: 0 }}>✓</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 60, padding: 24, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 18, maxWidth: 800, margin: "60px auto 0" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 700, marginBottom: 14 }}>Perguntas frequentes</h2>
          {[
            { q: "Posso cancelar a qualquer momento?", a: "Sim. Sem fidelidade, sem multa. Cancele pelo painel e o acesso continua até o fim do ciclo pago." },
            { q: "Como funciona o pagamento?", a: "PIX, cartão de crédito ou boleto bancário, processados pelo Asaas (gateway seguro). A confirmação é na hora no PIX." },
            { q: "Os 14 dias grátis cobram depois?", a: "Não. Você só paga se decidir continuar. Sem cartão de crédito pra começar." },
            { q: "Posso mudar de plano depois?", a: "Sim, a qualquer momento. Upgrades são proporcionais e downgrades passam a valer no próximo ciclo." },
          ].map((f, i) => (
            <div key={i} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: i < 3 ? "1px solid var(--border)" : "none" }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{f.q}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{f.a}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 40, fontSize: 13, color: "var(--muted)" }}>
          Prefere falar com a gente? {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a onClick={(e) => { e.preventDefault(); window.open(`https://wa.me/5512982671917?text=Oi! Quero saber mais sobre o Doctor Barbearia SaaS.`, "_blank"); }} style={{ color: "var(--gold)", cursor: "pointer", fontWeight: 600 }}>Fale pelo WhatsApp →</a>
        </div>
      </section>
    </div>
  );
}

function CheckoutModal({ checkout, onClose }) {
  const [aba, setAba] = useState("pix");
  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>💳</div>
          <div className="modal-title">Finalize seu pagamento</div>
          <div className="modal-sub">Valor: <strong style={{ color: "var(--gold)" }}>R$ {Number(checkout.valor).toFixed(2).replace('.', ',')}</strong> · Vence em {new Date(checkout.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--bg3)", borderRadius: 10, padding: 3 }}>
          {[
            ["pix", "📱 PIX"],
            ["boleto", "📄 Boleto"],
            ["cartao", "💳 Cartão"],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setAba(k)} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", background: aba === k ? "var(--bg2)" : "transparent", color: aba === k ? "var(--text)" : "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>{l}</button>
          ))}
        </div>
        {aba === "pix" && checkout.pix_qr_code && (
          <div style={{ textAlign: "center" }}>
            <img src={`data:image/png;base64,${checkout.pix_qr_code}`} alt="QR Code PIX" style={{ width: 200, height: 200, borderRadius: 8, margin: "0 auto 12px", display: "block", background: "#fff", padding: 8 }} />
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>PIX copia-e-cola:</div>
            <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: 10, fontSize: 10, fontFamily: "monospace", wordBreak: "break-all", maxHeight: 80, overflow: "auto", marginBottom: 10 }}>{checkout.pix_copia_cola}</div>
            <button className="btn-gold" onClick={() => { navigator.clipboard.writeText(checkout.pix_copia_cola || ""); }}>Copiar código PIX</button>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>A confirmação é automática em segundos.</div>
          </div>
        )}
        {aba === "boleto" && checkout.boleto_url && (
          <div style={{ textAlign: "center" }}>
            <a href={checkout.fatura_url || checkout.boleto_url} target="_blank" rel="noreferrer" className="btn-gold" style={{ display: "inline-block", textDecoration: "none" }}>Abrir boleto / fatura →</a>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>O acesso é liberado assim que o pagamento compensar (até 2 dias úteis).</div>
          </div>
        )}
        {aba === "cartao" && (
          <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            <a href={checkout.fatura_url} target="_blank" rel="noreferrer" className="btn-gold" style={{ display: "inline-block", textDecoration: "none", marginTop: 8 }}>Pagar com cartão →</a>
            <div style={{ fontSize: 11, marginTop: 10 }}>Você será redirecionado para o ambiente seguro do Asaas.</div>
          </div>
        )}
        {!checkout.pix_qr_code && aba === "pix" && (
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)" }}>QR Code não gerado. Use a aba Boleto ou Cartão.</div>
        )}
      </div>
    </div>
  );
}
