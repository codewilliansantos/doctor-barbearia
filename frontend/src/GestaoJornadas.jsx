import { useState, useEffect } from "react";
import { apiFetch } from "./api";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Gestão de jornada semanal por barbeiro.
 * Tabela editável com 7 linhas (uma por dia da semana) + preview semanal visual.
 */
export function GestaoJornadas({ showToast }) {
  const [barbeiros, setBarbeiros] = useState([]);
  const [barbeiroId, setBarbeiroId] = useState(null);
  const [jornadas, setJornadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/barbeiros");
        setBarbeiros(res.data || res || []);
        if ((res.data || res || []).length > 0) setBarbeiroId((res.data || res)[0].id);
      } catch (e) { showToast && showToast(e.message, "err"); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!barbeiroId) return;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch("/gestor/jornadas");
        const todas = res.data || [];
        const doBarbeiro = todas.filter(j => j.barbeiro_id === barbeiroId);

        const mapa = new Map(doBarbeiro.map(j => [j.dia_semana, j]));
        const completo = Array.from({ length: 7 }, (_, dia) => {
          const j = mapa.get(dia);
          return j ? {
            dia_semana: dia,
            hora_inicio: j.hora_inicio.slice(0, 5),
            hora_fim: j.hora_fim.slice(0, 5),
            ativo: j.ativo,
          } : { dia_semana: dia, hora_inicio: "09:00", hora_fim: "18:00", ativo: false };
        });
        setJornadas(completo);
      } catch (e) { showToast && showToast(e.message, "err"); }
      finally { setLoading(false); }
    })();
  }, [barbeiroId]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (idx, field, value) => {
    setJornadas(jornadas.map((j, i) => i === idx ? { ...j, [field]: value } : j));
  };

  const totalHoras = jornadas
    .filter(j => j.ativo)
    .reduce((acc, j) => {
      const [h1, m1] = j.hora_inicio.split(":").map(Number);
      const [h2, m2] = j.hora_fim.split(":").map(Number);
      return acc + (h2 + m2/60) - (h1 + m1/60);
    }, 0);
  const diasAtivos = jornadas.filter(j => j.ativo).length;

  const aplicarPreset = (preset) => {
    const map = {
      comercial:   [{i:"09:00",f:"18:00"}, {i:"09:00",f:"18:00"}, {i:"09:00",f:"18:00"}, {i:"09:00",f:"18:00"}, {i:"09:00",f:"18:00"}, null, null],
      sabado:      [null, null, {i:"09:00",f:"18:00"}, {i:"09:00",f:"18:00"}, {i:"09:00",f:"18:00"}, {i:"09:00",f:"18:00"}, {i:"09:00",f:"17:00"}],
      meio:        [null, {i:"09:00",f:"18:00"}, {i:"09:00",f:"18:00"}, {i:"09:00",f:"18:00"}, {i:"09:00",f:"18:00"}, {i:"09:00",f:"18:00"}, {i:"09:00",f:"14:00"}],
    };
    const config = map[preset];
    if (!config) return;
    setJornadas(jornadas.map((j, idx) => {
      const c = config[idx];
      if (!c) return { ...j, ativo: false };
      return { ...j, hora_inicio: c.i, hora_fim: c.f, ativo: true };
    }));
  };

  const salvar = async () => {
    setSaving(true);
    try {
      await apiFetch(`/gestor/jornadas/${barbeiroId}`, {
        method: "PUT",
        body: JSON.stringify({ jornadas }),
      });
      showToast && showToast("Jornadas salvas! ✅");
    } catch (e) { showToast && showToast(e.message, "err"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="skel" style={{ height: 240 }} />;

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 20 }}>📅</div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700 }}>Jornada de Trabalho</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{diasAtivos} dias ativos · {totalHoras.toFixed(1)}h semanais</div>
        </div>
        <select
          className="inp"
          value={barbeiroId || ""}
          onChange={e => setBarbeiroId(Number(e.target.value))}
          style={{ width: "auto", padding: "8px 12px" }}
        >
          {barbeiros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
        </select>
      </div>

      {/* Preview semanal visual */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 18, padding: 12, background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
        {jornadas.map((j, idx) => {
          const hoje = new Date().getDay() === idx;
          return (
            <div key={idx} style={{
              textAlign: "center", padding: "10px 4px", borderRadius: 6,
              background: j.ativo ? "linear-gradient(180deg,rgba(201,168,76,.15),rgba(201,168,76,.05))" : "var(--bg3)",
              border: `1px solid ${j.ativo ? "var(--gold-border)" : "var(--border)"}`,
              opacity: j.ativo ? 1 : 0.5,
              position: "relative",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: j.ativo ? "var(--gold)" : "var(--muted)", marginBottom: 4 }}>{DIAS[idx]}</div>
              {j.ativo ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{j.hora_inicio}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)" }}>↓</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{j.hora_fim}</div>
                </>
              ) : (
                <div style={{ fontSize: 16, color: "var(--muted)", marginTop: 6 }}>✕</div>
              )}
              {hoje && (
                <div style={{ position: "absolute", top: -6, right: -4, fontSize: 8, background: "var(--gold)", color: "#000", padding: "1px 5px", borderRadius: 8, fontWeight: 700 }}>HOJE</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "var(--muted)", alignSelf: "center", marginRight: 4 }}>PRESETS:</span>
        <button className="btn-sm" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => aplicarPreset("comercial")} title="Seg-Sex 9-18">💼 Seg-Sex</button>
        <button className="btn-sm" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => aplicarPreset("sabado")} title="Ter-Sáb 9-18">📅 Ter-Sáb</button>
        <button className="btn-sm" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => aplicarPreset("meio")} title="Seg-Sex 9-18 + Sáb 9-14">⚡ 5½ dias</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px 80px 1fr 1fr", gap: 10, padding: "8px 0", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)" }}>
          <div>Dia</div>
          <div>Atende</div>
          <div>Início</div>
          <div>Fim</div>
        </div>
        {jornadas.map((j, idx) => (
          <div key={j.dia_semana} style={{ display: "grid", gridTemplateColumns: "60px 80px 1fr 1fr", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{DIAS[j.dia_semana]}</div>
            <button
              onClick={() => update(idx, "ativo", !j.ativo)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                background: j.ativo ? "var(--gold)" : "var(--bg3)",
                position: "relative", transition: "background .2s",
              }}
            >
              <div style={{
                position: "absolute", top: 2, left: j.ativo ? 22 : 2,
                width: 20, height: 20, borderRadius: "50%", background: "#fff",
                transition: "left .2s",
              }} />
            </button>
            <input
              type="time" className="inp"
              disabled={!j.ativo}
              value={j.hora_inicio}
              onChange={e => update(idx, "hora_inicio", e.target.value)}
              style={{ padding: "7px 10px", fontSize: 13 }}
            />
            <input
              type="time" className="inp"
              disabled={!j.ativo}
              value={j.hora_fim}
              onChange={e => update(idx, "hora_fim", e.target.value)}
              style={{ padding: "7px 10px", fontSize: 13 }}
            />
          </div>
        ))}
      </div>

      <button
        className="btn-gold"
        style={{ marginTop: 16, padding: "11px 16px", fontSize: 13 }}
        disabled={saving}
        onClick={salvar}
      >
        {saving ? <><div className="spinner" />Salvando...</> : "💾 Salvar jornada"}
      </button>
    </div>
  );
}
