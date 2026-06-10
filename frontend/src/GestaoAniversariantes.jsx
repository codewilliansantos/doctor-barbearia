import { useState, useEffect } from "react";
import { apiFetch } from "./api";

/**
 * Aniversariantes — gestor cadastra data de nascimento e visualiza próximos.
 */
export function GestaoAniversariantes({ showToast }) {
  const [clientes, setClientes] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState("");
  const [aniv, setAniv] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const [cli, ani] = await Promise.all([
        apiFetch("/gestor/clientes"),
        apiFetch("/gestor/aniversariantes"),
      ]);
      setClientes(cli.data || cli || []);
      setAniv(ani.data || []);
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  const salvar = async (id) => {
    if (!editData) { setEditId(null); return; }
    try {
      await apiFetch(`/gestor/clientes/${id}/nascimento`, {
        method: "PUT",
        body: JSON.stringify({ data_nascimento: editData }),
      });
      showToast && showToast("Data de nascimento salva! 🎂");
      setEditId(null);
      carregar();
    } catch (e) { showToast && showToast(e.message, "err"); }
  };

  if (loading) return <div className="skel" style={{ height: 200 }} />;

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 20 }}>🎂</div>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700 }}>Aniversariantes</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Cadastre a data de nascimento dos clientes</div>
        </div>
      </div>

      {aniv.length > 0 && (
        <div style={{ background: "linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04))", border: "1px solid var(--gold-border)", borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)", marginBottom: 8, letterSpacing: ".06em" }}>PRÓXIMOS ANIVERSARIANTES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {aniv.slice(0, 8).map(a => (
              <div key={a.id} style={{ background: "var(--bg2)", borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
                <strong>{a.nome.split(" ")[0]}</strong> <span style={{ color: "var(--muted)" }}>· {a.dia_mes}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 4 }}>
        {clientes.map(c => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>📱 {c.whatsapp}</div>
            </div>
            {editId === c.id ? (
              <input
                type="date" className="inp"
                value={editData}
                onChange={e => setEditData(e.target.value)}
                style={{ padding: "6px 10px", fontSize: 12, width: 150 }}
                autoFocus
              />
            ) : (
              <div style={{ fontSize: 12, color: c.data_nascimento ? "var(--text)" : "var(--muted)" }}>
                {c.data_nascimento ? new Date(c.data_nascimento).toLocaleDateString("pt-BR") : "—"}
              </div>
            )}
            {editId === c.id ? (
              <button className="btn-sm btn-sm-gold" onClick={() => salvar(c.id)}>Salvar</button>
            ) : (
              <button className="btn-sm btn-sm-ghost" onClick={() => { setEditId(c.id); setEditData(""); }}>✏️</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
