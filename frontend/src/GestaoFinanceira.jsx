import { useState, useEffect } from "react";
import { apiFetch } from "./api";

/**
 * Gestão Financeira — Caixa, Contas a Pagar, Contas a Receber.
 * Visão única com 3 abas internas e cards de resumo no topo.
 */
export function GestaoFinanceira({ showToast }) {
  const [aba, setAba] = useState("caixa");
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);

  const carregarResumo = async () => {
    try {
      const r = await apiFetch("/gestor/financeiro/resumo");
      setResumo(r);
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregarResumo(); }, []);

  if (loading) return <div className="skel" style={{ height: 300 }} />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <KPI label="💰 Entradas (30d)" val={`R$ ${Number(resumo?.mes?.entradas || 0).toFixed(0)}`} color="green" />
        <KPI label="💸 Saídas (30d)" val={`R$ ${Number(resumo?.mes?.saidas || 0).toFixed(0)}`} color="red" />
        <KPI label="📈 Lucro (30d)" val={`R$ ${Number(resumo?.mes?.lucro || 0).toFixed(0)}`} color={resumo?.mes?.lucro >= 0 ? "green" : "red"} />
        <KPI label="📤 A Pagar" val={`${resumo?.a_pagar?.pendentes || 0} pendentes`} sub={`R$ ${Number(resumo?.a_pagar?.valor_total || 0).toFixed(0)}`} color="red" />
        <KPI label="📥 A Receber" val={`${resumo?.a_receber?.pendentes || 0} pendentes`} sub={`R$ ${Number(resumo?.a_receber?.valor_total || 0).toFixed(0)}`} color="green" />
      </div>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
          {[["caixa","💰 Caixa"],["pagar","📤 A Pagar"],["receber","📥 A Receber"]].map(([k,l]) => (
            <button key={k} onClick={() => setAba(k)}
              style={{ padding: "10px 16px", background: aba === k ? "var(--gold-dim)" : "transparent", color: aba === k ? "var(--gold)" : "var(--muted)",
                       border: "none", borderBottom: aba === k ? "2px solid var(--gold)" : "2px solid transparent",
                       cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{l}</button>
          ))}
        </div>

        {aba === "caixa" && <CaixaTab showToast={showToast} onChange={carregarResumo} />}
        {aba === "pagar" && <ContasPagarTab showToast={showToast} onChange={carregarResumo} />}
        {aba === "receber" && <ContasReceberTab showToast={showToast} onChange={carregarResumo} />}
      </div>
    </div>
  );
}

function KPI({ label, val, sub, color }) {
  const colors = {
    green: { val: "#5BCF7A" },
    red: { val: "#ff7a7a" },
    gold: { val: "var(--gold)" },
  };
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: colors[color]?.val }}>{val}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

/* ──────────── CAIXA ──────────── */

function CaixaTab({ showToast, onChange }) {
  const [caixa, setCaixa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAbrir, setShowAbrir] = useState(false);
  const [showMov, setShowMov] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/gestor/caixa/atual");
      setCaixa(r);
      if (r.caixa) onChange && onChange();
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  const abrir = async (saldo, obs) => {
    try {
      await apiFetch("/gestor/caixa/abrir", { method: "POST", body: JSON.stringify({ saldo_inicial: saldo, observacoes: obs }) });
      showToast && showToast("Caixa aberto! 💰");
      setShowAbrir(false);
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  const fechar = async () => {
    if (!window.confirm("Fechar o caixa?")) return;
    try {
      const r = await apiFetch("/gestor/caixa/fechar", { method: "POST", body: "{}" });
      showToast && showToast(`Caixa fechado. Saldo: R$ ${Number(r.saldo_final).toFixed(2)}`);
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  const movimentar = async (dados) => {
    try {
      await apiFetch("/gestor/caixa/movimentacao", { method: "POST", body: JSON.stringify(dados) });
      showToast && showToast("Movimentação registrada ✅");
      setShowMov(false);
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  if (loading) return <div className="skel" style={{ height: 200 }} />;

  if (!caixa || !caixa.caixa) {
    return (
      <div>
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-icon">💰</div>
          <div className="empty-title">Caixa fechado</div>
          <p style={{ fontSize: 12, marginBottom: 16 }}>Abra o caixa para começar a registrar movimentações.</p>
          <button className="btn-gold" style={{ width: "auto", display: "inline-flex", padding: "11px 22px" }} onClick={() => setShowAbrir(true)}>🔓 Abrir Caixa</button>
        </div>
        {showAbrir && <AbrirCaixaForm onAbrir={abrir} onClose={() => setShowAbrir(false)} />}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "var(--bg3)", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: "var(--muted)" }}>SALDO INICIAL</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>R$ {Number(caixa.caixa.saldo_inicial).toFixed(2)}</div>
        </div>
        <div style={{ background: "var(--bg3)", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: "var(--muted)" }}>ENTRADAS</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#5BCF7A" }}>R$ {Number(caixa.totais.entradas).toFixed(2)}</div>
        </div>
        <div style={{ background: "var(--bg3)", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: "var(--muted)" }}>SAÍDAS</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#ff7a7a" }}>R$ {Number(caixa.totais.saidas).toFixed(2)}</div>
        </div>
        <div style={{ background: "linear-gradient(135deg,var(--gold-dim),transparent)", borderRadius: 8, padding: 12, border: "1px solid var(--gold-border)" }}>
          <div style={{ fontSize: 10, color: "var(--gold)" }}>SALDO ATUAL</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>R$ {Number(caixa.saldo_atual).toFixed(2)}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="btn-sm btn-sm-gold" onClick={() => setShowMov(true)}>+ Movimentação</button>
        <button className="btn-sm btn-sm-red" onClick={fechar}>🔒 Fechar Caixa</button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>Aberto em: {new Date(caixa.caixa.data_abertura).toLocaleString("pt-BR")}</div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Movimentações</div>
      {caixa.movimentacoes.length === 0 ? (
        <div className="empty-state" style={{ padding: 20 }}><p style={{ fontSize: 12 }}>Sem movimentações ainda.</p></div>
      ) : caixa.movimentacoes.map(m => (
        <div key={m.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 18 }}>{m.tipo === "entrada" ? "📥" : "📤"}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.descricao || m.categoria || (m.tipo === "entrada" ? "Entrada" : "Saída")}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {new Date(m.criado_em).toLocaleString("pt-BR")}
              {m.cliente_nome && ` · ${m.cliente_nome}`}
              {m.forma_pagamento && ` · ${m.forma_pagamento}`}
            </div>
          </div>
          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, background: "var(--bg3)" }}>{m.categoria || "—"}</span>
          <div style={{ fontSize: 14, fontWeight: 700, color: m.tipo === "entrada" ? "#5BCF7A" : "#ff7a7a", minWidth: 90, textAlign: "right" }}>
            {m.tipo === "entrada" ? "+" : "-"} R$ {Number(m.valor).toFixed(2)}
          </div>
        </div>
      ))}

      {showMov && <MovimentacaoForm onSave={movimentar} onClose={() => setShowMov(false)} />}
    </div>
  );
}

function AbrirCaixaForm({ onAbrir, onClose }) {
  const [saldo, setSaldo] = useState(0);
  const [obs, setObs] = useState("");
  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Abrir Caixa</div>
        <div className="modal-sub">Informe o saldo inicial em dinheiro</div>
        <div className="inp-grp"><label className="inp-lbl">Saldo inicial (R$)</label>
          <input className="inp" type="number" step="0.01" value={saldo} onChange={e => setSaldo(e.target.value)} autoFocus />
        </div>
        <div className="inp-grp"><label className="inp-lbl">Observações</label>
          <input className="inp" value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
        </div>
        <button className="btn-gold" onClick={() => onAbrir(saldo, obs)}>🔓 Abrir Caixa</button>
        <button className="btn-ghost" onClick={onClose} style={{ marginTop: 8 }}>Cancelar</button>
      </div>
    </div>
  );
}

function MovimentacaoForm({ onSave, onClose }) {
  const [tipo, setTipo] = useState("entrada");
  const [categoria, setCategoria] = useState("servico");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState(0);
  const [forma, setForma] = useState("dinheiro");

  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Nova Movimentação</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[["entrada","📥 Entrada"],["saida","📤 Saída"]].map(([k,l]) => (
            <button key={k} onClick={() => setTipo(k)} style={{ padding: 10, border: tipo === k ? "1px solid var(--gold)" : "1px solid var(--border)",
              background: tipo === k ? "var(--gold-dim)" : "transparent", color: tipo === k ? "var(--gold)" : "var(--muted)",
              borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>{l}</button>
          ))}
        </div>
        <div className="inp-grp"><label className="inp-lbl">Descrição</label>
          <input className="inp" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder={tipo === "entrada" ? "Ex: Corte João" : "Ex: Material"} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="inp-grp"><label className="inp-lbl">Valor (R$)</label>
            <input className="inp" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} autoFocus />
          </div>
          <div className="inp-grp"><label className="inp-lbl">Forma</label>
            <select className="inp" value={forma} onChange={e => setForma(e.target.value)}>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="cartao_credito">Crédito</option>
              <option value="cartao_debito">Débito</option>
            </select>
          </div>
        </div>
        <div className="inp-grp"><label className="inp-lbl">Categoria</label>
          <select className="inp" value={categoria} onChange={e => setCategoria(e.target.value)}>
            <option value="servico">Serviço</option>
            <option value="pacote">Pacote</option>
            <option value="produto">Produto</option>
            <option value="despesa">Despesa</option>
            <option value="sangria">Sangria</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <button className="btn-gold" disabled={!valor} onClick={() => onSave({ tipo, categoria, descricao, valor, forma_pagamento: forma })}>💾 Registrar</button>
        <button className="btn-ghost" onClick={onClose} style={{ marginTop: 8 }}>Cancelar</button>
      </div>
    </div>
  );
}

/* ──────────── CONTAS A PAGAR ──────────── */

function ContasPagarTab({ showToast, onChange }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/gestor/contas-pagar");
      setLista(r.data || []);
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  const pagar = async (id) => {
    if (!window.confirm("Marcar como paga? Lançará saída no caixa.")) return;
    try {
      await apiFetch(`/gestor/contas-pagar/${id}/pagar`, { method: "POST", body: "{}" });
      showToast && showToast("Pago! ✅");
      carregar();
      onChange && onChange();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir conta?")) return;
    try { await apiFetch(`/gestor/contas-pagar/${id}`, { method: "DELETE" }); carregar(); }
    catch (e) { showToast && showToast(e.message, "err"); }
  };

  const criar = async (dados) => {
    try { await apiFetch("/gestor/contas-pagar", { method: "POST", body: JSON.stringify(dados) });
      showToast && showToast("Conta cadastrada!"); setShowForm(false); carregar(); onChange && onChange();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  if (loading) return <div className="skel" style={{ height: 200 }} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn-sm btn-sm-gold" onClick={() => setShowForm(true)}>+ Nova conta</button>
      </div>
      {lista.length === 0 ? <div className="empty-state" style={{ padding: 30 }}><div className="empty-icon">📤</div><div className="empty-title">Sem contas</div></div>
        : lista.map(c => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.descricao}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {c.fornecedor && `${c.fornecedor} · `}
                Vence: {new Date(c.data_vencimento).toLocaleDateString("pt-BR")}
                {c.dias_atraso < 0 && ` · ⚠️ ${Math.abs(c.dias_atraso)}d atraso`}
              </div>
            </div>
            <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12,
              background: c.status === "pago" ? "rgba(91,207,122,.15)" : c.dias_atraso < 0 ? "rgba(255,80,80,.15)" : "var(--bg3)",
              color: c.status === "pago" ? "#5BCF7A" : c.dias_atraso < 0 ? "#ff7a7a" : "var(--muted)" }}>
              {c.status === "pago" ? "✓ Pago" : c.dias_atraso < 0 ? "Atrasado" : "Pendente"}
            </span>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 90, textAlign: "right" }}>R$ {Number(c.valor).toFixed(2)}</div>
            {c.status !== "pago" ? (
              <>
                <button className="btn-sm btn-sm-gold" onClick={() => pagar(c.id)}>Pagar</button>
                <button className="btn-sm btn-sm-red" onClick={() => excluir(c.id)}>🗑</button>
              </>
            ) : null}
          </div>
        ))}
      {showForm && <ContaForm tipo="pagar" onSave={criar} onClose={() => setShowForm(false)} />}
    </div>
  );
}

/* ──────────── CONTAS A RECEBER ──────────── */

function ContasReceberTab({ showToast, onChange }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/gestor/contas-receber");
      setLista(r.data || []);
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  const receber = async (id) => {
    if (!window.confirm("Confirmar recebimento? Lançará entrada no caixa.")) return;
    try {
      await apiFetch(`/gestor/contas-receber/${id}/receber`, { method: "POST", body: "{}" });
      showToast && showToast("Recebido! ✅");
      carregar();
      onChange && onChange();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir conta?")) return;
    try { await apiFetch(`/gestor/contas-receber/${id}`, { method: "DELETE" }); carregar(); }
    catch (e) { showToast && showToast(e.message, "err"); }
  };

  const criar = async (dados) => {
    try { await apiFetch("/gestor/contas-receber", { method: "POST", body: JSON.stringify(dados) });
      showToast && showToast("Conta cadastrada!"); setShowForm(false); carregar(); onChange && onChange();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  if (loading) return <div className="skel" style={{ height: 200 }} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn-sm btn-sm-gold" onClick={() => setShowForm(true)}>+ Nova conta</button>
      </div>
      {lista.length === 0 ? <div className="empty-state" style={{ padding: 30 }}><div className="empty-icon">📥</div><div className="empty-title">Sem contas</div></div>
        : lista.map(c => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.descricao}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {c.cliente_nome && `${c.cliente_nome} · `}
                Vence: {new Date(c.data_vencimento).toLocaleDateString("pt-BR")}
                {c.dias_atraso < 0 && ` · ⚠️ ${Math.abs(c.dias_atraso)}d atraso`}
              </div>
            </div>
            <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12,
              background: c.status === "recebido" ? "rgba(91,207,122,.15)" : c.dias_atraso < 0 ? "rgba(255,80,80,.15)" : "var(--bg3)",
              color: c.status === "recebido" ? "#5BCF7A" : c.dias_atraso < 0 ? "#ff7a7a" : "var(--muted)" }}>
              {c.status === "recebido" ? "✓ Recebido" : c.dias_atraso < 0 ? "Atrasado" : "Pendente"}
            </span>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 90, textAlign: "right" }}>R$ {Number(c.valor).toFixed(2)}</div>
            {c.status !== "recebido" ? (
              <>
                <button className="btn-sm btn-sm-gold" onClick={() => receber(c.id)}>Receber</button>
                <button className="btn-sm btn-sm-red" onClick={() => excluir(c.id)}>🗑</button>
              </>
            ) : null}
          </div>
        ))}
      {showForm && <ContaForm tipo="receber" onSave={criar} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function ContaForm({ tipo, onSave, onClose }) {
  const [descricao, setDescricao] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [valor, setValor] = useState(0);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Nova conta a {tipo === "pagar" ? "Pagar" : "Receber"}</div>
        <div className="inp-grp"><label className="inp-lbl">Descrição</label>
          <input className="inp" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Aluguel" autoFocus />
        </div>
        {tipo === "pagar" && (
          <div className="inp-grp"><label className="inp-lbl">Fornecedor</label>
            <input className="inp" value={fornecedor} onChange={e => setFornecedor(e.target.value)} placeholder="Opcional" />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="inp-grp"><label className="inp-lbl">Valor (R$)</label>
            <input className="inp" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
          </div>
          <div className="inp-grp"><label className="inp-lbl">Vencimento</label>
            <input className="inp" type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
        </div>
        <button className="btn-gold" disabled={!descricao || !valor} onClick={() => onSave({ descricao, fornecedor, valor, data_vencimento: data })}>💾 Cadastrar</button>
        <button className="btn-ghost" onClick={onClose} style={{ marginTop: 8 }}>Cancelar</button>
      </div>
    </div>
  );
}
