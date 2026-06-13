import { useState, useEffect } from "react";
import { apiFetch } from "./api";

const empty = {
  nome: "", email: "", telefone: "", foto_url: "", funcao: "",
  profissao: "", endereco: "", rg: "", cpf: "", bio: "", ativo: true,
};

const FOTO_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23181818' width='100' height='100'/%3E%3Ctext x='50' y='58' text-anchor='middle' font-size='40' fill='%23585858'%3E👤%3C/text%3E%3C/svg%3E";

export function GestaoColaboradores({ showToast }) {
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const json = await apiFetch("/gestor/colaboradores");
      setColaboradores(json.data || json);
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirCriar = () => setModal({ mode: "create", data: { ...empty } });
  const abrirEditar = (c) => setModal({ mode: "edit", data: { ...c } });

  const salvar = async () => {
    const d = modal.data;
    if (!d.nome?.trim()) { showToast && showToast("Informe o nome.", "err"); return; }
    setSaving(true);
    try {
      const body = {
        nome: d.nome.trim(),
        email: d.email?.trim() || null,
        telefone: d.telefone?.trim() || null,
        foto_url: d.foto_url?.trim() || null,
        funcao: d.funcao?.trim() || null,
        profissao: d.profissao?.trim() || null,
        endereco: d.endereco?.trim() || null,
        rg: d.rg?.trim() || null,
        cpf: d.cpf?.trim() || null,
        bio: d.bio?.trim() || null,
        ativo: d.ativo !== false,
      };
      if (modal.mode === "create") {
        await apiFetch("/gestor/colaboradores", { method: "POST", body: JSON.stringify(body) });
      } else {
        await apiFetch(`/gestor/colaboradores/${d.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      showToast && showToast(modal.mode === "create" ? "Colaborador criado!" : "Colaborador atualizado!");
      setModal(null);
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setSaving(false); }
  };

  const excluir = async (c) => {
    if (!window.confirm(`Excluir "${c.nome}" permanentemente?`)) return;
    try {
      await apiFetch(`/gestor/colaboradores/${c.id}`, { method: "DELETE" });
      showToast && showToast("Colaborador excluído.");
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  if (loading) return <div className="skel" style={{ height: 240 }} />;

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 20 }}>👥</div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700 }}>Colaboradores</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{colaboradores.length} registro(s) · {colaboradores.filter(c => c.ativo).length} ativo(s)</div>
        </div>
        <button className="btn-gold" style={{ padding: "9px 16px", fontSize: 13, width: "auto" }} onClick={abrirCriar}>+ Novo</button>
      </div>

      {colaboradores.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">👥</div><div className="empty-title">Nenhum colaborador</div><div className="empty-sub">Clique em "Novo" para adicionar.</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {colaboradores.map(c => (
            <div key={c.id} style={{
              background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 14,
              opacity: c.ativo ? 1 : 0.55, position: "relative",
            }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <img src={c.foto_url || FOTO_FALLBACK} alt={c.nome}
                  style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold-border)", flexShrink: 0, background: "var(--bg3)" }}
                  onError={e => { e.target.src = FOTO_FALLBACK; }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 1 }}>{c.nome}</div>
                  {c.funcao && <div style={{ fontSize: 11, color: "var(--gold)", marginBottom: 2 }}>{c.funcao}</div>}
                  {c.profissao && <div style={{ fontSize: 10, color: "var(--muted)" }}>{c.profissao}</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
                {c.email && <><span style={{ color: "var(--text)" }}>📧 {c.email}</span></>}
                {c.telefone && <><span style={{ color: "var(--text)" }}>📱 {c.telefone}</span></>}
                {c.cpf && <><span>CPF: {c.cpf}</span></>}
                {c.rg && <><span>RG: {c.rg}</span></>}
                {c.endereco && <><span style={{ gridColumn: "1 / -1" }}>📍 {c.endereco}</span></>}
              </div>

              {c.bio && <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.bio}</div>}

              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                <button className="btn-sm" style={{ flex: 1, padding: "6px 8px", fontSize: 11 }} onClick={() => abrirEditar(c)}>✏ Editar</button>
                <button className="btn-sm btn-sm-red" style={{ padding: "6px 10px", fontSize: 11 }} onClick={() => excluir(c)} title="Excluir">🗑</button>
              </div>
              {!c.ativo && <div style={{ position: "absolute", top: 8, left: 8, fontSize: 9, padding: "2px 6px", background: "rgba(220,38,38,.2)", color: "#ef4444", borderRadius: 4, fontWeight: 600 }}>INATIVO</div>}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={() => !saving && setModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, marginBottom: 16 }}>
              {modal.mode === "create" ? "Novo Colaborador" : `Editar: ${modal.data.nome}`}
            </h3>

            <div className="inp-grp"><label className="inp-lbl">Nome *</label>
              <input className="inp" value={modal.data.nome} onChange={e => setModal(m => ({ ...m, data: { ...m.data, nome: e.target.value } }))} placeholder="Nome completo" /></div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="inp-grp"><label className="inp-lbl">E-mail</label>
                <input className="inp" type="email" value={modal.data.email || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, email: e.target.value } }))} placeholder="email@exemplo.com" /></div>
              <div className="inp-grp"><label className="inp-lbl">Celular</label>
                <input className="inp" value={modal.data.telefone || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, telefone: e.target.value } }))} placeholder="(11) 99999-9999" /></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="inp-grp"><label className="inp-lbl">Função</label>
                <input className="inp" value={modal.data.funcao || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, funcao: e.target.value } }))} placeholder="Ex: Barbeiro Senior" /></div>
              <div className="inp-grp"><label className="inp-lbl">Profissão</label>
                <input className="inp" value={modal.data.profissao || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, profissao: e.target.value } }))} placeholder="Ex: Cabeleireiro" /></div>
            </div>

            <div className="inp-grp"><label className="inp-lbl">Endereço</label>
              <input className="inp" value={modal.data.endereco || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, endereco: e.target.value } }))} placeholder="Rua, número, bairro, cidade" /></div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="inp-grp"><label className="inp-lbl">RG</label>
                <input className="inp" value={modal.data.rg || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, rg: e.target.value } }))} placeholder="RG" /></div>
              <div className="inp-grp"><label className="inp-lbl">CPF</label>
                <input className="inp" value={modal.data.cpf || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, cpf: e.target.value } }))} placeholder="000.000.000-00" /></div>
            </div>

            <div className="inp-grp"><label className="inp-lbl">URL da Foto</label>
              <input className="inp" value={modal.data.foto_url || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, foto_url: e.target.value } }))} placeholder="https://..." /></div>

            <div className="inp-grp"><label className="inp-lbl">Bio</label>
              <textarea className="inp" rows={3} value={modal.data.bio || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, bio: e.target.value } }))} placeholder="Breve descrição do colaborador..." /></div>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", marginBottom: 16 }}>
              <input type="checkbox" checked={modal.data.ativo !== false} onChange={e => setModal(m => ({ ...m, data: { ...m.data, ativo: e.target.checked } }))} />
              ✅ Ativo
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-gold" style={{ flex: 1, padding: "10px" }} onClick={salvar} disabled={saving}>
                {saving ? <><div className="spinner" />Salvando...</> : "💾 Salvar"}
              </button>
              <button className="btn-sm" style={{ padding: "10px 16px" }} onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}