import { useState, useEffect } from "react";
import { apiFetch } from "./api";

/**
 * Configurações de lembretes automáticos.
 * Toggles: lembrete 24h, lembrete 1h, mensagem de retorno.
 * Input: dias para mensagem de retorno (default 15).
 */
export function ConfiguracoesLembretes({ onSaved, showToast }) {
  const [cfg, setCfg] = useState({
    lembrete_24h_ativo: true,
    lembrete_1h_ativo: true,
    msg_retorno_ativo: true,
    msg_retorno_dias: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/gestor/configuracoes/lembretes");
        if (res.data) setCfg({ ...cfg, ...res.data });
      } catch (e) { showToast && showToast(e.message, "err"); }
      finally { setLoading(false); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    setSaving(true);
    try {
      await apiFetch("/gestor/configuracoes/lembretes", {
        method: "PUT",
        body: JSON.stringify({
          lembrete_24h_ativo: cfg.lembrete_24h_ativo,
          lembrete_1h_ativo:  cfg.lembrete_1h_ativo,
          msg_retorno_ativo:  cfg.msg_retorno_ativo,
          msg_retorno_dias:   Number(cfg.msg_retorno_dias) || 15,
        }),
      });
      onSaved && onSaved();
      showToast && showToast("Configurações de lembretes salvas!");
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="skel" style={{ height: 180 }} />;
  }

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 20 }}>⏰</div>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700 }}>Lembretes Automáticos</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Notificações via WhatsApp para clientes</div>
        </div>
      </div>

      <Toggle
        label="Lembrete 24h antes"
        desc="Cliente recebe WhatsApp um dia antes do agendamento"
        checked={cfg.lembrete_24h_ativo}
        onChange={v => setCfg({ ...cfg, lembrete_24h_ativo: v })}
      />
      <Toggle
        label="Lembrete 1h antes"
        desc="Cliente recebe WhatsApp uma hora antes do horário"
        checked={cfg.lembrete_1h_ativo}
        onChange={v => setCfg({ ...cfg, lembrete_1h_ativo: v })}
      />
      <Toggle
        label="Mensagem de retorno"
        desc="Pedir retorno do cliente X dias após o serviço"
        checked={cfg.msg_retorno_ativo}
        onChange={v => setCfg({ ...cfg, msg_retorno_ativo: v })}
      />

      {cfg.msg_retorno_ativo && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Dias para retorno</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Quantos dias após o serviço concluído</div>
          </div>
          <input
            type="number"
            min="1"
            max="90"
            className="inp"
            style={{ width: 80, textAlign: "center" }}
            value={cfg.msg_retorno_dias}
            onChange={e => setCfg({ ...cfg, msg_retorno_dias: e.target.value })}
          />
        </div>
      )}

      <button
        className="btn-gold"
        style={{ marginTop: 14, padding: "11px 16px", fontSize: 13 }}
        disabled={saving}
        onClick={salvar}
      >
        {saving ? <><div className="spinner" />Salvando...</> : "💾 Salvar configurações"}
      </button>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
          background: checked ? "var(--gold)" : "var(--bg3)",
          position: "relative", transition: "background .2s", flexShrink: 0,
        }}
      >
        <div style={{
          position: "absolute", top: 2, left: checked ? 22 : 2,
          width: 20, height: 20, borderRadius: "50%", background: "#fff",
          transition: "left .2s",
        }} />
      </button>
    </div>
  );
}
