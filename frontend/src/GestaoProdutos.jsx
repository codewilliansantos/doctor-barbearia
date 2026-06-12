import { useState, useEffect } from "react";
import { apiFetch } from "./api";
import { formatPreco } from "./shared";

const CATEGORIAS = [
  { v: "pomada", l: "Pomada" },
  { v: "shampoo", l: "Shampoo" },
  { v: "barba", l: "Barba" },
  { v: "acessorio", l: "Acessório" },
  { v: "finalizador", l: "Finalizador" },
  { v: "outro", l: "Outro" },
];

const empty = { nome: "", descricao: "", categoria: "pomada", preco: 0, estoque: "", foto_url: "", destaque: false, ativo: true };

/**
 * Gestão de Produtos — CRUD completo pro gestor.
 * Lista, filtra, cria, edita, ajusta estoque, ativa/desativa.
 */
export function GestaoProdutos({ showToast }) {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCat, setFiltroCat] = useState("");
  const [filtroStatus, setFiltroStatus] = useState(""); // "" | "ativo" | "inativo" | "destaque"
  const [modal, setModal] = useState(null); // { mode: "create" | "edit", data: {...} }
  const [saving, setSaving] = useState(false);
  const [estoqueModal, setEstoqueModal] = useState(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const json = await apiFetch("/produtos/gestor/todos");
      setProdutos(json.data || json);
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  const filtrados = produtos.filter(p => {
    if (filtroCat && p.categoria !== filtroCat) return false;
    if (filtroStatus === "ativo" && !p.ativo) return false;
    if (filtroStatus === "inativo" && p.ativo) return false;
    if (filtroStatus === "destaque" && !p.destaque) return false;
    return true;
  });

  const abrirCriar = () => setModal({ mode: "create", data: { ...empty } });
  const abrirEditar = (p) => setModal({ mode: "edit", data: { ...p } });

  const salvar = async () => {
    const d = modal.data;
    if (!d.nome?.trim() || d.preco === "" || d.preco == null) {
      showToast && showToast("Preencha nome e preço.", "err");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const body = {
        nome: d.nome.trim(),
        descricao: d.descricao?.trim() || null,
        categoria: d.categoria || null,
        preco: Number(d.preco) || 0,
        estoque: d.estoque === "" || d.estoque == null ? null : Number(d.estoque),
        foto_url: d.foto_url?.trim() || null,
        destaque: !!d.destaque,
        ativo: d.ativo !== false,
      };
      const url = modal.mode === "create"
        ? "/produtos/gestor"
        : `/produtos/gestor/${d.id}`;
      const method = modal.mode === "create" ? "POST" : "PUT";
      const json = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });
      showToast && showToast(json.mensagem || "Produto salvo!");
      setModal(null);
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setSaving(false); }
  };

  const desativar = async (p) => {
    if (!window.confirm(`Desativar "${p.nome}"?`)) return;
    try {
      await apiFetch(`/produtos/gestor/${p.id}`, { method: "DELETE" });
      showToast && showToast("Produto desativado.");
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  const reativar = async (p) => {
    try {
      await apiFetch(`/produtos/gestor/${p.id}/reativar`, { method: "PATCH" });
      showToast && showToast("Produto reativado!");
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  const salvarEstoque = async () => {
    const { produto, valor } = estoqueModal;
    try {
      await apiFetch(`/produtos/gestor/${produto.id}/estoque`, {
        method: "PATCH",
        body: JSON.stringify({ estoque: Number(valor) }),
      });
      showToast && showToast("Estoque atualizado!");
      setEstoqueModal(null);
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  if (loading) return <div className="skel" style={{ height: 240 }} />;

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 20 }}>🛍️</div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700 }}>Catálogo de Produtos</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{produtos.length} produto(s) · {produtos.filter(p => p.ativo).length} ativos · {produtos.filter(p => p.destaque).length} em destaque</div>
        </div>
        <button className="btn-gold" style={{ padding: "9px 16px", fontSize: 13 }} onClick={abrirCriar}>+ Novo produto</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select className="inp" value={filtroCat} onChange={e => setFiltroCat(e.target.value)} style={{ padding: "7px 10px", fontSize: 12 }}>
          <option value="">Todas categorias</option>
          {CATEGORIAS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
        <select className="inp" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ padding: "7px 10px", fontSize: 12 }}>
          <option value="">Todos status</option>
          <option value="ativo">Apenas ativos</option>
          <option value="inativo">Apenas inativos</option>
          <option value="destaque">Em destaque</option>
        </select>
        <div style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center", marginLeft: "auto" }}>
          {filtrados.length} resultado(s)
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🛍️</div><div className="empty-title">Nenhum produto encontrado</div><div className="empty-sub">Crie o primeiro produto com o botão acima.</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {filtrados.map(p => (
            <div key={p.id} style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 12,
              opacity: p.ativo ? 1 : 0.55,
              position: "relative",
            }}>
              {p.destaque && (
                <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16 }} title="Em destaque">⭐</div>
              )}
              <div style={{ width: "100%", height: 90, background: "var(--bg3)", borderRadius: 8, marginBottom: 10, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; e.target.parentElement.innerHTML = "<div style='font-size:32px;opacity:.4'>📦</div>"; }} />
                ) : (
                  <div style={{ fontSize: 32, opacity: 0.4 }}>📦</div>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{p.nome}</div>
              {p.descricao && <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.descricao}</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>{formatPreco(p.preco)}</span>
                {p.categoria && <span style={{ fontSize: 9, padding: "2px 6px", background: "var(--bg3)", borderRadius: 4, color: "var(--muted)", textTransform: "uppercase" }}>{CATEGORIAS.find(c => c.v === p.categoria)?.l || p.categoria}</span>}
                {p.estoque != null && (
                  <span
                    onClick={() => setEstoqueModal({ produto: p, valor: p.estoque })}
                    style={{ fontSize: 9, padding: "2px 6px", background: p.estoque <= 0 ? "rgba(220,38,38,.15)" : p.estoque <= 5 ? "rgba(234,179,8,.15)" : "rgba(34,197,94,.12)", color: p.estoque <= 0 ? "#ef4444" : p.estoque <= 5 ? "#eab308" : "#22c55e", borderRadius: 4, cursor: "pointer" }}
                    title="Clique pra ajustar"
                  >
                    {p.estoque <= 0 ? "Esgotado" : `Estoque: ${p.estoque}`}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                <button className="btn-sm" style={{ flex: 1, padding: "6px 8px", fontSize: 11 }} onClick={() => abrirEditar(p)}>✏ Editar</button>
                {p.ativo ? (
                  <button className="btn-sm btn-sm-red" style={{ padding: "6px 8px", fontSize: 11 }} onClick={() => desativar(p)} title="Desativar">✕</button>
                ) : (
                  <button className="btn-sm btn-sm-green" style={{ padding: "6px 8px", fontSize: 11 }} onClick={() => reativar(p)} title="Reativar">↻</button>
                )}
              </div>
              {!p.ativo && <div style={{ position: "absolute", top: 8, left: 8, fontSize: 9, padding: "2px 6px", background: "rgba(220,38,38,.2)", color: "#ef4444", borderRadius: 4, fontWeight: 600 }}>INATIVO</div>}
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={() => !saving && setModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto" }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, marginBottom: 16 }}>
              {modal.mode === "create" ? "Novo produto" : `Editar: ${modal.data.nome}`}
            </h3>
            <div className="inp-grp"><label className="inp-lbl">Nome *</label><input className="inp" value={modal.data.nome} onChange={e => setModal(m => ({ ...m, data: { ...m.data, nome: e.target.value } }))} placeholder="Ex: Pomada Modeladora" /></div>
            <div className="inp-grp"><label className="inp-lbl">Descrição</label><textarea className="inp" value={modal.data.descricao || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, descricao: e.target.value } }))} rows={2} placeholder="Detalhes do produto…" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="inp-grp">
                <label className="inp-lbl">Preço (R$) *</label>
                <input className="inp" type="number" step="0.01" min="0" value={modal.data.preco} onChange={e => setModal(m => ({ ...m, data: { ...m.data, preco: e.target.value } }))} />
              </div>
              <div className="inp-grp">
                <label className="inp-lbl">Categoria</label>
                <select className="inp" value={modal.data.categoria || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, categoria: e.target.value } }))}>
                  {CATEGORIAS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="inp-grp">
                <label className="inp-lbl">Estoque (vazio = sem controle)</label>
                <input className="inp" type="number" min="0" value={modal.data.estoque ?? ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, estoque: e.target.value } }))} />
              </div>
              <div className="inp-grp">
                <label className="inp-lbl">URL da foto</label>
                <input className="inp" value={modal.data.foto_url || ""} onChange={e => setModal(m => ({ ...m, data: { ...m.data, foto_url: e.target.value } }))} placeholder="https://…" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 10, marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={!!modal.data.destaque} onChange={e => setModal(m => ({ ...m, data: { ...m.data, destaque: e.target.checked } }))} />
                ⭐ Em destaque (home)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={modal.data.ativo !== false} onChange={e => setModal(m => ({ ...m, data: { ...m.data, ativo: e.target.checked } }))} />
                ✅ Ativo
              </label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-gold" style={{ flex: 1, padding: "10px" }} onClick={salvar} disabled={saving}>
                {saving ? <><div className="spinner" />Salvando...</> : "💾 Salvar"}
              </button>
              <button className="btn-sm" style={{ padding: "10px 16px" }} onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajuste de Estoque */}
      {estoqueModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={() => setEstoqueModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 360 }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 4 }}>Ajustar estoque</h3>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{estoqueModal.produto.nome}</div>
            <div className="inp-grp">
              <label className="inp-lbl">Quantidade em estoque</label>
              <input className="inp" type="number" min="0" value={estoqueModal.valor} onChange={e => setEstoqueModal(m => ({ ...m, valor: e.target.value }))} autoFocus />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-gold" style={{ flex: 1, padding: "10px" }} onClick={salvarEstoque}>💾 Atualizar</button>
              <button className="btn-sm" style={{ padding: "10px 16px" }} onClick={() => setEstoqueModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
