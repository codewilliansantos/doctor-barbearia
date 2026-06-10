import { useState, useEffect } from "react";
import { apiFetch } from "./api";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Relatórios gerenciais (últimos 30 dias).
 */
export function Relatorios({ showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ag, fat, bar] = await Promise.all([
          apiFetch("/gestor/relatorios/agendamentos-por-dia"),
          apiFetch("/gestor/relatorios/faturamento"),
          apiFetch("/gestor/relatorios/barbeiros"),
        ]);
        setData({
          agendamentos: ag.data || [],
          faturamento: fat.data || [],
          barbeiros: bar.data || [],
        });
      } catch (e) { showToast && showToast(e.message, "err"); }
      finally { setLoading(false); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="skel" style={{ height: 300 }} />;
  if (!data) return null;

  // Calcula totais
  const totalFaturamento = data.faturamento.reduce((a, d) => a + Number(d.faturamento), 0);
  const totalAtendimentos = data.faturamento.reduce((a, d) => a + Number(d.total_atendimentos), 0);
  const maxDia = Math.max(...data.agendamentos.map(d => Number(d.total)), 1);

  // Preenche dias da semana com 0 se não houver
  const agPorDia = Array.from({ length: 7 }, (_, i) => {
    const found = data.agendamentos.find(d => Number(d.dia_semana) === i);
    return { dia: i, total: found ? Number(found.total) : 0 };
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 20 }}>📊</div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700 }}>Relatórios (últimos 30 dias)</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Visão geral da operação</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
          <div style={{ background: "var(--bg3)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>Faturamento</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)" }}>R$ {totalFaturamento.toFixed(0)}</div>
          </div>
          <div style={{ background: "var(--bg3)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>Atendimentos</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{totalAtendimentos}</div>
          </div>
          <div style={{ background: "var(--bg3)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>Ticket médio</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>R$ {totalAtendimentos > 0 ? (totalFaturamento / totalAtendimentos).toFixed(0) : 0}</div>
          </div>
        </div>

        {/* Bar chart por dia da semana */}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>📅 Agendamentos por dia da semana</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, alignItems: "end", height: 140, marginBottom: 8 }}>
          {agPorDia.map(d => (
            <div key={d.dia} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>{d.total}</div>
              <div style={{
                width: "100%", height: `${(d.total / maxDia) * 100}%`, minHeight: 4,
                background: d.total === maxDia ? "var(--gold)" : "var(--gold-border)",
                borderRadius: "4px 4px 0 0", transition: "height .4s",
              }} />
              <div style={{ fontSize: 10, fontWeight: 600 }}>{DIAS_SEMANA[d.dia]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking de barbeiros */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>👑 Ranking de Barbeiros</div>
        {data.barbeiros.map((b, i) => {
          const maxFat = Math.max(...data.barbeiros.map(x => Number(x.faturamento)), 1);
          return (
            <div key={b.barbeiro} style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "30px 1fr auto", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: i === 0 ? "var(--gold)" : "var(--muted)" }}>{i + 1}º</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{b.barbeiro}</div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>R$ {Number(b.faturamento).toFixed(0)}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>{b.total_atendimentos} atend.</div>
                </div>
              </div>
              <div style={{ height: 4, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(Number(b.faturamento) / maxFat) * 100}%`, background: "var(--gold)", transition: "width .4s" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
