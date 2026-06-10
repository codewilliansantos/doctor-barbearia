import { useState, useEffect } from "react";
import { apiFetch } from "./api";
import { useToast, Toast, formatPreco } from "./shared";
import { CSS } from "./styles";

export function GestaoAssinatura({ showToast: externalShow }) {
  const [assinatura, setAssinatura] = useState(null);
  const [faturas, setFaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { toast, showToast } = useToast();

  const toastFn = externalShow || showToast;

  const load = async () => {
    setLoading(true);
    try {
      const [a, f] = await Promise.all([
        apiFetch("/billing/assinatura"),
        apiFetch("/billing/faturas"),
      ]);
      setAssinatura(a.assinatura);
      setFaturas(f.faturas || []);
    } catch (e) { toastFn(e.message, "err"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const cancelar = async () => {
    setConfirmCancel(false);
    try {
      await apiFetch("/billing/cancelar", { method: "POST" });
      toastFn("Assinatura cancelada.", "ok");
      load();
    } catch (e) { toastFn(e.message, "err"); }
  };

  const statusLabel = {
    trial: { txt: "Período de teste", cor: "var(--gold)" },
    ativa: { txt: "Ativa", cor: "var(--green)" },
    inadimplente: { txt: "Inadimplente", cor: "var(--red)" },
    cancelada: { txt: "Cancelada", cor: "var(--muted)" },
    expirada: { txt: "Expirada", cor: "var(--red)" },
  };

  if (loading) {
    return (
      <div>
        <style>{CSS}</style>
        <Toast msg={toast.msg} type={toast.type} />
        <div className="skel" style={{ height: 120, marginBottom: 12 }} />
        <div className="skel" style={{ height: 200 }} />
      </div>
    );
  }

  const s = statusLabel[assinatura?.status] || statusLabel.trial;

  return (
    <div>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} />

      <div style={{ background: "var(--bg2)", border: "1px solid var(--gold-border)", borderRadius: 14, padding: 22, marginBottom: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "var(--gold-dim)", filter: "blur(20px)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>Plano atual</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{assinatura?.plano_nome || "—"}</div>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,.4)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: s.cor }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.cor }} />{s.txt}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>Mensalidade</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>{formatPreco(assinatura?.preco_mensal || 0)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>Próxima cobrança</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{assinatura?.data_proxima_cobranca ? new Date(assinatura.data_proxima_cobranca).toLocaleDateString('pt-BR') : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>Início</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{assinatura?.data_inicio ? new Date(assinatura.data_inicio).toLocaleDateString('pt-BR') : "—"}</div>
            </div>
          </div>
          {assinatura?.status === 'ativa' && (
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn-outline" onClick={() => window.location.assign('/planos')}>Trocar plano</button>
              <button className="btn-ghost" onClick={() => setConfirmCancel(true)} style={{ color: "var(--red)", borderColor: "var(--red-border)" }}>Cancelar assinatura</button>
            </div>
          )}
          {assinatura?.status === 'trial' && (
            <div style={{ marginTop: 16 }}>
              <button className="btn-gold" onClick={() => window.location.assign('/planos')}>Assinar um plano agora</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 10 }}>Histórico de faturas</div>
      {faturas.length === 0 ? (
        <div className="empty-state" style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12 }}>
          <div className="empty-icon">📄</div>
          <div className="empty-title">Nenhuma fatura ainda</div>
          <div style={{ fontSize: 13 }}>Quando você assinar um plano, as faturas aparecem aqui.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {faturas.map(f => {
            const fc = { pendente: "var(--gold)", paga: "var(--green)", atrasada: "var(--red)", cancelada: "var(--muted)", reembolsada: "var(--muted)" }[f.status] || "var(--muted)";
            return (
              <div key={f.id} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{formatPreco(f.valor)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Vence em {new Date(f.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')} · {(f.metodo || 'PIX').toUpperCase()}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: fc, textTransform: "uppercase", letterSpacing: ".08em" }}>{f.status}</div>
                {f.status === 'pendente' && f.pix_copia_cola && (
                  <button className="btn-sm btn-sm-gold" onClick={() => { navigator.clipboard.writeText(f.pix_copia_cola); toastFn("PIX copiado!"); }}>Copiar PIX</button>
                )}
                {f.fatura_url && (
                  <a href={f.fatura_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--gold)", textDecoration: "none" }}>Ver fatura →</a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmCancel && (
        <div className="modal-ov" onClick={() => setConfirmCancel(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Cancelar assinatura?</div>
            <div className="modal-sub">O acesso continua até o fim do ciclo atual. Você pode reativar quando quiser.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmCancel(false)}>Manter assinatura</button>
              <button className="btn-gold" style={{ flex: 1, background: "var(--red)", color: "#fff" }} onClick={cancelar}>Sim, cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
