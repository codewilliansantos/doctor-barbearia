import { useState, useEffect } from "react";
import { apiFetch } from "./api";

const CSS = `
.cfg-wrap { padding: 0; }
.cfg-section { margin-bottom: 28px; }
.cfg-section-title {
  font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
  color: var(--gold, #C9A84C); margin-bottom: 14px; opacity: .85;
}
.cfg-card {
  background: var(--ink3, #181818); border: 1px solid rgba(255,255,255,.07);
  border-radius: 12px; overflow: hidden;
}
.cfg-card-head {
  padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.06);
  display: flex; align-items: center; justify-content: space-between;
}
.cfg-card-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 9px; }
.cfg-card-body { padding: 18px; }
.cfg-status-badge {
  font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 20px;
}
.cfg-status-active {
  background: rgba(76,175,125,.1); border: 1px solid rgba(76,175,125,.22); color: #4CAF7D;
}
.cfg-status-inactive {
  background: rgba(245,237,216,.06); border: 1px solid rgba(245,237,216,.1);
  color: rgba(245,237,216,.4);
}
.cfg-status-testing {
  background: rgba(200,169,81,.1); border: 1px solid rgba(200,169,81,.25); color: #C8A951;
}
.cfg-inp-wrap { position: relative; margin-bottom: 12px; }
.cfg-inp {
  width: 100%; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.09);
  border-radius: 8px; padding: 11px 44px 11px 14px; font-size: 13px;
  color: #F5EDD8; font-family: 'DM Mono', 'Courier New', monospace; outline: none;
  transition: border-color .2s; letter-spacing: .04em;
}
.cfg-inp:focus { border-color: rgba(200,169,81,.4); }
.cfg-inp::placeholder { color: rgba(245,237,216,.2); font-family: inherit; }
.cfg-inp-eye {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: rgba(245,237,216,.3);
  font-size: 14px; padding: 4px; transition: color .2s;
}
.cfg-inp-eye:hover { color: rgba(245,237,216,.7); }
.cfg-token-preview {
  background: rgba(200,169,81,.06); border: 1px solid rgba(200,169,81,.15);
  border-radius: 8px; padding: 11px 14px; font-size: 13px;
  color: rgba(200,169,81,.8); font-family: 'DM Mono', 'Courier New', monospace;
  letter-spacing: .06em; margin-bottom: 12px; display: flex; align-items: center;
  justify-content: space-between;
}
.cfg-token-preview span { opacity: .6; font-size: 11px; }
.cfg-btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
.cfg-btn {
  flex: 1; min-width: 120px; padding: 10px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit;
  border: none; transition: all .2s; letter-spacing: .04em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: center; gap: 7px;
}
.cfg-btn-primary { background: #C8A951; color: #0A0806; }
.cfg-btn-primary:hover { background: #E2C46A; transform: translateY(-1px); }
.cfg-btn-primary:disabled { opacity: .35; cursor: not-allowed; transform: none; }
.cfg-btn-ghost {
  background: transparent; border: 1px solid rgba(255,255,255,.1); color: rgba(245,237,216,.5);
}
.cfg-btn-ghost:hover { border-color: rgba(255,255,255,.2); color: #F5EDD8; }
.cfg-btn-danger {
  background: rgba(200,92,92,.08); border: 1px solid rgba(200,92,92,.2); color: #C85C5C;
  flex: 0; min-width: auto; padding: 10px 14px;
}
.cfg-btn-danger:hover { background: rgba(200,92,92,.15); }
.cfg-msg {
  border-radius: 8px; padding: 11px 14px; font-size: 12px; margin-top: 12px;
  display: flex; align-items: flex-start; gap: 9px; line-height: 1.6;
}
.cfg-msg-ok { background: rgba(76,175,125,.07); border: 1px solid rgba(76,175,125,.2); color: #7DD4A8; }
.cfg-msg-err { background: rgba(200,92,92,.07); border: 1px solid rgba(200,92,92,.2); color: #E8A0A0; }
.cfg-msg-info { background: rgba(200,169,81,.07); border: 1px solid rgba(200,169,81,.2); color: #D4B96A; }
.cfg-help { font-size: 11px; color: rgba(245,237,216,.3); line-height: 1.7; margin-top: 14px; }
.cfg-help a { color: rgba(200,169,81,.7); text-decoration: none; }
.cfg-help a:hover { color: #C8A951; text-decoration: underline; }
.cfg-divider { height: 1px; background: rgba(255,255,255,.06); margin: 16px 0; }
.cfg-spinner {
  width: 13px; height: 13px; border: 2px solid rgba(10,8,6,.2);
  border-top-color: #0A0806; border-radius: 50%;
  animation: cfg-spin .6s linear infinite; display: inline-block;
}
@keyframes cfg-spin { to { transform: rotate(360deg); } }
.cfg-check-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,.04); font-size: 13px;
}
.cfg-check-item:last-child { border-bottom: none; }
.cfg-check-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.cfg-check-dot-ok { background: #4CAF7D; }
.cfg-check-dot-warn { background: #C8A951; }
.cfg-check-dot-off { background: rgba(245,237,216,.15); }
`;

export function ConfiguracoesPagSeguro({ onSaved }) {
  const [config, setConfig]       = useState(null);
  const [token, setToken]         = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [msg, setMsg]             = useState(null); // {type, text}
  const [mode, setMode]           = useState("view"); // view | edit

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/gestor/configuracoes");
      setConfig(data);
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const testar = async () => {
    if (!token || token.length < 20) {
      setMsg({ type: "err", text: "Cole o token completo antes de testar." });
      return;
    }
    setTesting(true);
    setMsg(null);
    try {
      const res = await apiFetch("/gestor/configuracoes/pagseguro/testar", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setMsg({ type: "ok", text: "✓ Token válido! Clique em Salvar para ativar." });
      } else {
        setMsg({ type: "err", text: res.erro || "Token inválido." });
      }
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setTesting(false);
    }
  };

  const salvar = async () => {
    if (!token || token.length < 20) {
      setMsg({ type: "err", text: "Cole o token completo." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await apiFetch("/gestor/configuracoes/pagseguro", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setMsg({ type: "ok", text: "✓ Token salvo! Pagamentos Pix agora são reais." });
      setToken("");
      setMode("view");
      await loadConfig();
      onSaved?.();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const remover = async () => {
    if (!window.confirm("Remover o token? Os pagamentos voltarão ao modo simulado.")) return;
    try {
      await apiFetch("/gestor/configuracoes/pagseguro", { method: "DELETE" });
      setMsg({ type: "info", text: "Token removido. Modo simulado ativado." });
      await loadConfig();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  };

  if (loading) return (
    <div style={{ padding: "24px 0", textAlign: "center", color: "rgba(245,237,216,.3)", fontSize: 13 }}>
      Carregando configurações...
    </div>
  );

  const ativo = config?.pagseguro_ativo;

  return (
    <>
      <style>{CSS}</style>
      <div className="cfg-wrap">

        {/* STATUS CARD */}
        <div className="cfg-section">
          <div className="cfg-section-title">Pagamento Pix</div>
          <div className="cfg-card">
            <div className="cfg-card-head">
              <div className="cfg-card-title">
                <span>💳</span>
                <span>PagSeguro</span>
              </div>
              <span className={`cfg-status-badge ${ativo ? "cfg-status-active" : "cfg-status-inactive"}`}>
                {ativo ? "Ativo" : "Simulado"}
              </span>
            </div>
            <div className="cfg-card-body">

              {/* Checklist */}
              <div style={{ marginBottom: 16 }}>
                <div className="cfg-check-item">
                  <div className={`cfg-check-dot ${ativo ? "cfg-check-dot-ok" : "cfg-check-dot-off"}`}/>
                  <span style={{ color: "rgba(245,237,216,.6)" }}>Token configurado</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: ativo ? "#4CAF7D" : "rgba(245,237,216,.25)" }}>
                    {ativo ? "✓ Sim" : "Não"}
                  </span>
                </div>
                <div className="cfg-check-item">
                  <div className={`cfg-check-dot ${ativo ? "cfg-check-dot-ok" : "cfg-check-dot-warn"}`}/>
                  <span style={{ color: "rgba(245,237,216,.6)" }}>Modo de operação</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: ativo ? "#4CAF7D" : "#C8A951" }}>
                    {ativo ? "Produção real" : "Simulado"}
                  </span>
                </div>
              </div>

              {/* Token preview se ativo */}
              {ativo && config?.pagseguro_token_preview && mode === "view" && (
                <div className="cfg-token-preview">
                  <span>{config.pagseguro_token_preview}</span>
                  <span>Token ativo</span>
                </div>
              )}

              {/* Botões modo view */}
              {mode === "view" && (
                <div className="cfg-btn-row">
                  <button className="cfg-btn cfg-btn-primary" onClick={() => { setMode("edit"); setMsg(null); }}>
                    {ativo ? "Trocar token" : "Configurar token"}
                  </button>
                  {ativo && (
                    <button className="cfg-btn cfg-btn-danger" onClick={remover}>✕</button>
                  )}
                </div>
              )}

              {/* Formulário de token */}
              {mode === "edit" && (
                <>
                  <div className="cfg-divider"/>
                  <div style={{ fontSize: 12, color: "rgba(245,237,216,.4)", marginBottom: 10, lineHeight: 1.6 }}>
                    Cole o token de produção do PagSeguro abaixo:
                  </div>
                  <div className="cfg-inp-wrap">
                    <input
                      className="cfg-inp"
                      type={showToken ? "text" : "password"}
                      placeholder="Cole seu token PagSeguro aqui..."
                      value={token}
                      onChange={e => { setToken(e.target.value); setMsg(null); }}
                    />
                    <button className="cfg-inp-eye" onClick={() => setShowToken(v => !v)}>
                      {showToken ? "🙈" : "👁"}
                    </button>
                  </div>
                  <div className="cfg-btn-row">
                    <button className="cfg-btn cfg-btn-ghost" disabled={testing} onClick={testar}>
                      {testing ? <><div className="cfg-spinner"/>Testando...</> : "Testar token"}
                    </button>
                    <button className="cfg-btn cfg-btn-primary" disabled={saving || !token} onClick={salvar}>
                      {saving ? <><div className="cfg-spinner"/>Salvando...</> : "Salvar e ativar"}
                    </button>
                    <button className="cfg-btn cfg-btn-danger" onClick={() => { setMode("view"); setMsg(null); setToken(""); }}>✕</button>
                  </div>
                  <div className="cfg-help">
                    Onde encontrar:{" "}
                    <a href="https://acesso.pagseguro.uol.com.br" target="_blank" rel="noreferrer">
                      acesso.pagseguro.uol.com.br
                    </a>
                    {" "}→ Configurações → Integrações → Credenciais → Token de segurança
                  </div>
                </>
              )}

              {/* Mensagem de feedback */}
              {msg && (
                <div className={`cfg-msg cfg-msg-${msg.type}`}>
                  <span>{msg.type === "ok" ? "✓" : msg.type === "err" ? "✕" : "ℹ"}</span>
                  <span>{msg.text}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* INFO */}
        {!ativo && (
          <div className="cfg-msg cfg-msg-info">
            <span>ℹ</span>
            <span>
              Sem token configurado, os pagamentos funcionam em <strong>modo simulado</strong> — 
              perfeito para testes. Configure o token para cobranças reais.
            </span>
          </div>
        )}
      </div>
    </>
  );
}
