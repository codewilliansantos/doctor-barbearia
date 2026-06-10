import { useState, useEffect } from "react";
import { apiFetch } from "./api";

/**
 * Lista de espera — gestor visualiza quem está aguardando vaga.
 */
export function GestaoListaEspera({ showToast }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/gestor/lista-espera");
      setLista(res.data || []);
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  const remover = async (id) => {
    try {
      await apiFetch(`/gestor/lista-espera/${id}`, { method: "DELETE" });
      showToast && showToast("Removido da lista de espera.");
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  if (loading) return <div className="skel" style={{ height: 200 }} />;

  const aguardando = lista.filter(l => l.status === "aguardando");
  const notificados = lista.filter(l => l.status === "notificado");

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 20 }}>📋</div>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700 }}>Lista de Espera</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{aguardando.length} aguardando · {notificados.length} notificados</div>
        </div>
      </div>

      {aguardando.length === 0 && notificados.length === 0 && (
        <div className="empty-state" style={{ padding: 30 }}>
          <div className="empty-icon">📋</div>
          <div className="empty-title">Lista vazia</div>
          <p style={{ fontSize: 12 }}>Clientes que esperam por uma vaga aparecem aqui.</p>
        </div>
      )}

      {aguardando.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--gold)", letterSpacing: ".08em", marginBottom: 8 }}>AGUARDANDO</div>
          {aguardando.map(l => (
            <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{l.cliente_nome}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  📅 {new Date(l.data_desejada).toLocaleDateString("pt-BR")}
                  {l.servico_nome && ` · ${l.servico_nome}`}
                  {l.barbeiro_nome && ` · ${l.barbeiro_nome}`}
                </div>
              </div>
              <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, background: "var(--bg3)", color: "var(--muted)" }}>{l.periodo || "qualquer"}</span>
              <button className="btn-sm btn-sm-red" onClick={() => remover(l.id)}>✕</button>
            </div>
          ))}
        </>
      )}

      {notificados.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--green)", letterSpacing: ".08em", margin: "16px 0 8px" }}>NOTIFICADOS</div>
          {notificados.map(l => (
            <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)", opacity: 0.6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{l.cliente_nome}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>📅 {new Date(l.data_desejada).toLocaleDateString("pt-BR")}</div>
              </div>
              <button className="btn-sm btn-sm-red" onClick={() => remover(l.id)}>✕</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
