import { useState, useEffect } from "react";
import { apiFetch } from "./api";

/**
 * Gestão de Pacotes de Serviços.
 * CRUD + venda para cliente.
 */
export function GestaoPacotes({ showToast }) {
  const [pacotes, setPacotes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [vendidos, setVendidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [selling, setSelling] = useState(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [p, s, v] = await Promise.all([
        apiFetch("/gestor/pacotes"),
        apiFetch("/servicos"),
        apiFetch("/gestor/cliente-pacotes"),
      ]);
      setPacotes(p.data || []);
      setServicos(s.data || s || []);
      setVendidos(v.data || []);
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  const salvar = async (dados) => {
    try {
      if (dados.id) {
        await apiFetch(`/gestor/pacotes/${dados.id}`, { method: "PUT", body: JSON.stringify(dados) });
      } else {
        await apiFetch("/gestor/pacotes", { method: "POST", body: JSON.stringify(dados) });
      }
      showToast && showToast("Pacote salvo! ✅");
      setEditing(null);
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  const desativar = async (id) => {
    if (!window.confirm("Desativar este pacote?")) return;
    try {
      await apiFetch(`/gestor/pacotes/${id}`, { method: "DELETE" });
      showToast && showToast("Pacote desativado.");
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  const vender = async (id, whatsapp) => {
    try {
      const r = await apiFetch(`/gestor/pacotes/${id}/vender`, {
        method: "POST",
        body: JSON.stringify({ whatsapp }),
      });
      showToast && showToast(`Vendido! Código: ${r.data.codigo} 🎟️`);
      setSelling(null);
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  const usar = async (id) => {
    try {
      await apiFetch(`/gestor/cliente-pacotes/${id}/usar`, { method: "POST", body: "{}" });
      showToast && showToast("Sessão registrada ✅");
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  if (loading) return <div className="skel" style={{ height: 200 }} />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 20 }}>🎁</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700 }}>Pacotes de Serviços</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Crie combos com várias sessões por um preço especial</div>
          </div>
          <button className="btn-sm btn-sm-gold" onClick={() => setEditing({ nome: "", preco_total: 0, sessoes: 1, validade_dias: 180, servicos: [] })}>+ Novo</button>
        </div>

        {pacotes.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <div className="empty-icon">🎁</div>
            <div className="empty-title">Nenhum pacote</div>
            <p style={{ fontSize: 12 }}>Crie pacotes para fidelizar clientes.</p>
          </div>
        ) : pacotes.map(p => (
          <div key={p.id} style={{ padding: "12px 0", borderTop: "1px solid var(--border)", opacity: p.ativo ? 1 : 0.5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.nome} {!p.ativo && <span style={{ fontSize: 10, color: "var(--muted)" }}>(inativo)</span>}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.descricao || "—"}</div>
                <div style={{ fontSize: 11, color: "var(--gold)", marginTop: 4 }}>
                  R$ {Number(p.preco_total).toFixed(0)} · {p.sessoes} sessões · válido {p.validade_dias}d
                </div>
              </div>
              <button className="btn-sm btn-sm-ghost" onClick={() => setSelling(p)}>💰 Vender</button>
              <button className="btn-sm btn-sm-ghost" onClick={() => setEditing(p)}>✏️</button>
              {p.ativo && <button className="btn-sm btn-sm-red" onClick={() => desativar(p.id)}>🗑</button>}
            </div>
            {p.servicos && p.servicos.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
                Inclui: {p.servicos.map(s => `${s.quantidade}× ${s.nome}`).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>

      {vendidos.length > 0 && (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 20 }}>🎟️</div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700 }}>Pacotes Vendidos</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{vendidos.filter(v => v.status === "ativo").length} ativos</div>
            </div>
          </div>
          {vendidos.map(v => (
            <div key={v.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v.cliente_nome} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {v.pacote_nome}</span></div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>📱 {v.whatsapp} · 🎫 {v.codigo}</div>
              </div>
              <div style={{ fontSize: 12, textAlign: "right" }}>
                <div style={{ color: v.sessoes_restantes > 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{v.sessoes_restantes}/{v.total_sessoes}</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>restantes</div>
              </div>
              {v.status === "ativo" && v.sessoes_restantes > 0 && (
                <button className="btn-sm btn-sm-gold" onClick={() => usar(v.id)}>Usar 1</button>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && <PacoteForm pacote={editing} servicos={servicos} onSave={salvar} onClose={() => setEditing(null)} />}
      {selling && <VenderForm pacote={selling} onSell={(wpp) => vender(selling.id, wpp)} onClose={() => setSelling(null)} />}
    </div>
  );
}

function PacoteForm({ pacote, servicos, onSave, onClose }) {
  const [form, setForm] = useState({
    id: pacote.id || null,
    nome: pacote.nome || "",
    descricao: pacote.descricao || "",
    preco_total: pacote.preco_total || 0,
    sessoes: pacote.sessoes || 1,
    validade_dias: pacote.validade_dias || 180,
    ativo: pacote.ativo !== false,
    servicos: pacote.servicos || [],
  });

  const toggleServico = (id) => {
    const exists = form.servicos.find(s => s.servico_id === id);
    if (exists) {
      setForm({ ...form, servicos: form.servicos.filter(s => s.servico_id !== id) });
    } else {
      setForm({ ...form, servicos: [...form.servicos, { servico_id: id, quantidade: 1 }] });
    }
  };

  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-title">{form.id ? "Editar" : "Novo"} Pacote</div>
        <div className="modal-sub">Configure o combo de serviços</div>
        <div className="inp-grp"><label className="inp-lbl">Nome</label>
          <input className="inp" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Combo 4 Cortes" />
        </div>
        <div className="inp-grp"><label className="inp-lbl">Descrição</label>
          <input className="inp" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="O que o cliente ganha?" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div className="inp-grp"><label className="inp-lbl">Preço (R$)</label>
            <input className="inp" type="number" value={form.preco_total} onChange={e => setForm({ ...form, preco_total: e.target.value })} />
          </div>
          <div className="inp-grp"><label className="inp-lbl">Sessões</label>
            <input className="inp" type="number" value={form.sessoes} onChange={e => setForm({ ...form, sessoes: e.target.value })} />
          </div>
          <div className="inp-grp"><label className="inp-lbl">Validade (d)</label>
            <input className="inp" type="number" value={form.validade_dias} onChange={e => setForm({ ...form, validade_dias: e.target.value })} />
          </div>
        </div>
        <div className="inp-grp">
          <label className="inp-lbl">Serviços inclusos</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 10, background: "var(--bg3)", borderRadius: 8 }}>
            {servicos.map(s => (
              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.servicos.find(x => x.servico_id === s.id)} onChange={() => toggleServico(s.id)} />
                {s.nome} <span style={{ color: "var(--muted)" }}>R${Number(s.preco).toFixed(0)}</span>
              </label>
            ))}
          </div>
        </div>
        <button className="btn-gold" onClick={() => onSave({
          ...form,
          preco_total: Number(form.preco_total),
          sessoes: Number(form.sessoes),
          validade_dias: Number(form.validade_dias),
        })}>💾 Salvar pacote</button>
        <button className="btn-ghost" onClick={onClose} style={{ marginTop: 8 }}>Cancelar</button>
      </div>
    </div>
  );
}

function VenderForm({ pacote, onSell, onClose }) {
  const [wpp, setWpp] = useState("");
  return (
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Vender Pacote</div>
        <div className="modal-sub">{pacote.nome} · {pacote.sessoes} sessões · R$ {Number(pacote.preco_total).toFixed(0)}</div>
        <div className="inp-grp"><label className="inp-lbl">WhatsApp do cliente</label>
          <input className="inp" value={wpp} onChange={e => setWpp(e.target.value)} placeholder="(11) 99999-9999" autoFocus />
        </div>
        <button className="btn-gold" disabled={!wpp} onClick={() => onSell(wpp)}>💰 Confirmar venda</button>
        <button className="btn-ghost" onClick={onClose} style={{ marginTop: 8 }}>Cancelar</button>
      </div>
    </div>
  );
}
