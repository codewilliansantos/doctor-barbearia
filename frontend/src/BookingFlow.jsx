import { useState, useEffect, useRef } from "react";
import { apiFetch } from "./api";
import { PaymentScreen } from "./PaymentScreen";
import {
  STEPS, gerarDias, SEMANA,
  formatPreco, formatWhatsapp,
  getSvcImg, getBarbImg, useApi, useToast, Toast,
} from "./shared";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

/**
 * Fluxo de agendamento reutilizável.
 * Props:
 *   - onClose(): chamado quando o usuário clica em "Fechar"/"Voltar"
 *   - initialData: { nome, whatsapp } pré-preenchidos (cliente logado)
 *   - onBooked(result): chamado após criar agendamento
 */
export function BookingFlow({ onClose, initialData, onBooked, showToast: showToastExt }) {
  const { toast, showToast } = useToast();
  const show = showToastExt || showToast;
  const DIAS = gerarDias(30);
  const daysRowRef = useRef(null);
  const [showCal, setShowCal] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { ano: d.getFullYear(), mes: d.getMonth() };
  });

  const [bookStep, setBS] = useState(0);
  const [svcId, setSvc] = useState(null);
  const [barbId, setBarb] = useState(null);
  const [selDay, setSelDay] = useState(DIAS[0]);
  const [time, setTime] = useState(null);
  const [grade, setGrade] = useState([]);
  const [submitting, setSub] = useState(false);
  const [booked, setBooked] = useState(null);
  const [nome, setNome] = useState(initialData?.nome || "");
  const [phone, setPhone] = useState(initialData?.whatsapp || "");
  const [paying, setPaying] = useState(null);
  const [formErr, setFErr] = useState({});

  const { data: servicos, loading: loadSvc } = useApi(() => apiFetch("/servicos"));
  const { data: barbeiros, loading: loadBarb } = useApi(() => apiFetch("/barbeiros"));

  const service = servicos?.find(s => s.id === svcId);
  const barberObj = barbeiros?.find(b => b.id === barbId);

  useEffect(() => {
    if (!barbId) return;
    apiFetch(`/barbeiros/${barbId}/horarios?data=${selDay.iso}`)
      .then(d => setGrade(d.grade || []))
      .catch(() => setGrade([]));
  }, [barbId, selDay]);

  const validate = () => {
    const errs = {};
    if (!nome.trim()) errs.nome = "Informe seu nome";
    if (!phone.trim()) errs.phone = "Informe seu WhatsApp";
    else if (phone.replace(/\D/g, "").length < 10) errs.phone = "Número inválido";
    setFErr(errs);
    return Object.keys(errs).length === 0;
  };

  const submitBook = async () => {
    if (!validate()) return;
    setSub(true);
    try {
      const result = await apiFetch("/agendamentos", {
        method: "POST",
        body: JSON.stringify({
          nome,
          whatsapp: phone.replace(/\D/g, ""),
          servico_id: svcId,
          barbeiro_id: barbId,
          data_hora: `${selDay.iso}T${time}:00`,
        }),
      });
      setBooked(result);
      onBooked && onBooked(result);
      show("Agendamento criado! Pague para confirmar.", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setSub(false);
    }
  };

  const canNext = [svcId !== null, barbId !== null, time !== null, true];

  // SUCCESS
  if (booked) {
    return (
      <>
        <style>{null}</style>
        <Toast msg={toast.msg} type={toast.type} />
        {paying && <PaymentScreen agendamento={paying} onClose={() => setPaying(null)} onSuccess={() => { setPaying(null); show("Pagamento confirmado!"); }} />}
        <div style={{ display: "flex", justifyContent: "center", padding: "50px 28px", minHeight: "100vh", background: "var(--bg)" }}>
          <div className="success-wrap">
            <div className="succ-ring">✓</div>
            <h2 className="succ-title">Agendado!</h2>
            <p className="succ-sub">Seu horário está confirmado.<br />Aguarde a mensagem no WhatsApp.</p>
            <div className="succ-card">
              <div className="cnf-head">Resumo</div>
              <CnfRow l="Serviço" v={booked.servico || service?.nome} />
              <CnfRow l="Barbeiro" v={booked.barbeiro || barberObj?.nome} />
              <CnfRow l="Data" v={booked.data_fmt || `${selDay.num}/${selDay.mes} às ${time}`} />
              <CnfRow l="Total" v={formatPreco(booked.preco || service?.preco)} gold />
            </div>
            <div className="wpp-badge2">📱 Confirmação enviada via WhatsApp</div>
            <button className="btn-gold" style={{ marginBottom: 9 }} onClick={() => setPaying({ ...booked, emoji: booked.emoji || service?.emoji })}>💳 Pagar agora</button>
            <button className="btn-back" style={{ width: "100%" }} onClick={onClose}>Voltar ao início</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toast msg={toast.msg} type={toast.type} />
      {paying && <PaymentScreen agendamento={paying} onClose={() => setPaying(null)} onSuccess={() => { setPaying(null); show("Pagamento confirmado!"); }} />}
      <div className="book-layout fade-up">
        <div className="book-main">
          <div className="book-topbar">
            <div>
              <h1 className="book-topbar-title">Agendar horário</h1>
              <p className="book-topbar-sub">Passo {bookStep + 1} de 4 — {STEPS[bookStep]}</p>
            </div>
            <button className="btn-back" onClick={onClose}>✕ Fechar</button>
          </div>

          <div className="book-step-bar">
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
                <div className="book-node">
                  <div className={`book-circle ${i < bookStep ? "bc-done" : i === bookStep ? "bc-active" : ""}`}>
                    {i < bookStep ? "✓" : i + 1}
                  </div>
                  <span className={`book-slbl ${i === bookStep ? "bs-active" : ""}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`book-line ${i < bookStep ? "bl-done" : ""}`} />}
              </div>
            ))}
          </div>

          {bookStep === 0 && (
            <>
              <h2 className="page-ttl">Qual serviço?</h2>
              <p className="page-sub">Escolha o que você quer hoje</p>
              {loadSvc ? <div className="book-svc-grid">{[1,2,3,4,5,6].map(i => <div key={i} className="skel" style={{ height: 220 }} />)}</div>
                : <div className="book-svc-grid">{servicos?.map(s => (
                  <div key={s.id} className={`landing-svc-card ${svcId === s.id ? "sc-sel" : ""}`} onClick={() => setSvc(s.id)} style={svcId === s.id ? { borderColor: "var(--gold)" } : {}}>
                    {s.id <= 2 && <div className="tag-pop">Popular</div>}
                    <img className="landing-svc-card-img" src={getSvcImg(s.id)} alt={s.nome} loading="lazy" />
                    <div className="landing-svc-card-body">
                      <div className="landing-svc-name">{s.nome}</div>
                      <div className="landing-svc-meta">{s.descricao} · {s.duracao_min} min</div>
                      <div className="landing-svc-foot">
                        <div>
                          <div className="landing-svc-price">{formatPreco(s.preco)}</div>
                        </div>
                        <div className="landing-svc-arrow">{svcId === s.id ? "✓" : "→"}</div>
                      </div>
                    </div>
                  </div>
                ))}</div>}
            </>
          )}

          {bookStep === 1 && (
            <>
              <h2 className="page-ttl">Seu barbeiro</h2>
              <p className="page-sub">Escolha o profissional da sua preferência</p>
              <div className="barber-cards">
                {loadBarb ? [1,2].map(i => <div key={i} className="skel" style={{ height: 75 }} />)
                  : barbeiros?.map(b => (
                    <div key={b.id} className={`bc-card ${barbId === b.id ? "bcc-sel" : ""}`} onClick={() => setBarb(b.id)}>
                      <img className="bc-photo" src={getBarbImg(b.nome)} alt={b.nome} loading="lazy" />
                      <div className="bc-info">
                        <div className="bc-name">{b.nome}</div>
                        <div className="bc-role"><span className="bc-on-dot" />Online agora</div>
                        <div className="bc-stars"><span className="bc-star-g">★★★★★</span> {b.avaliacao} · {b.total_cortes} cortes</div>
                      </div>
                      {barbId === b.id && <div className="bc-chk2">✓</div>}
                    </div>
                  ))}
              </div>
            </>
          )}

          {bookStep === 2 && (
            <>
              <h2 className="page-ttl">Quando?</h2>
              <p className="page-sub">Escolha o melhor dia e horário para você</p>

              <div className="days-actions">
                <span className="days-title">Próximos 30 dias</span>
                <button className="days-cal-btn" onClick={() => setShowCal(true)}>
                  📅 Ver mês
                </button>
              </div>

              <div className="days-wrap">
                <div className="days-fade-l" />
                <div className="days-fade-r" />
                <button
                  className="days-nav-btn days-nav-left"
                  onClick={() => daysRowRef.current?.scrollBy({ left: -240, behavior: "smooth" })}
                  aria-label="Anterior"
                >‹</button>
                <button
                  className="days-nav-btn days-nav-right"
                  onClick={() => daysRowRef.current?.scrollBy({ left: 240, behavior: "smooth" })}
                  aria-label="Próximo"
                >›</button>
                <div className="days-row" ref={daysRowRef}>
                  {DIAS.map(d => (
                    <div key={d.iso} className={`day-chip ${d.hoje ? "dc-today" : ""} ${selDay.iso === d.iso ? "dc-sel" : ""}`}
                      onClick={() => { setSelDay(d); setTime(null); daysRowRef.current?.querySelector(`.dc-sel`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }}>
                      <div className="dn">{d.label}</div>
                      <div className="dd">{d.num}</div>
                      {d.hoje && <div className="today-dot">hoje</div>}
                    </div>
                  ))}
                </div>
              </div>

              <p className="slbl">Horários — {selDay.num}/{selDay.mes}</p>
              {grade.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>
                  <div className="empty-icon">🚫</div>
                  <div className="empty-title">Sem horários disponíveis</div>
                  <p style={{ fontSize: 12 }}>Este barbeiro não atende nesse dia. Escolha outro dia ou profissional.</p>
                </div>
              ) : (
                <div className="times-grid">
                  {grade.map(({ hora, ocupado }) => (
                    <div key={hora} className={`tc ${ocupado ? "tc-busy" : ""} ${time === hora ? "tc-sel" : ""}`} onClick={() => !ocupado && setTime(hora)}>
                      {hora}
                    </div>
                  ))}
                </div>
              )}
              <div className="legend">
                <div className="leg-item"><div className="leg-dot" style={{ border: "1.5px solid var(--gold)" }} />Livre</div>
                <div className="leg-item"><div className="leg-dot" style={{ background: "var(--border)" }} />Ocupado</div>
                <div className="leg-item"><div className="leg-dot" style={{ background: "var(--gold)" }} />Selecionado</div>
              </div>

              {showCal && (
                <CalendarioMes
                  mes={calMonth}
                  setMes={setCalMonth}
                  selIso={selDay.iso}
                  onPick={(iso) => {
                    const d = DIAS.find(x => x.iso === iso) || gerarDias(30).find(x => x.iso === iso);
                    if (d) { setSelDay(d); setTime(null); setShowCal(false); }
                    else {
                      // data fora dos 30 dias: amplia
                      const hoje = new Date(); const dt = new Date(iso + "T12:00:00");
                      const off = Math.round((dt - hoje) / 86400000);
                      if (off < 0) return;
                      const dNovo = { label: SEMANA[dt.getDay()], num: String(dt.getDate()).padStart(2, "0"), mes: String(dt.getMonth() + 1).padStart(2, "0"), ano: dt.getFullYear(), iso, hoje: off === 0 };
                      setSelDay(dNovo); setTime(null); setShowCal(false);
                    }
                  }}
                  onClose={() => setShowCal(false)}
                />
              )}
            </>
          )}

          {bookStep === 3 && (
            <>
              <h2 className="page-ttl">Confirmar agendamento</h2>
              <p className="page-sub">Revise e informe seus dados de contato</p>
              <div className="cnf-card">
                <div className="cnf-head">Resumo do agendamento</div>
                <CnfRow l="Serviço" v={service?.nome} />
                <CnfRow l="Duração" v={`${service?.duracao_min} min`} />
                <CnfRow l="Barbeiro" v={barberObj?.nome} />
                <CnfRow l="Data" v={`${selDay.num}/${selDay.mes}/${selDay.ano}`} />
                <CnfRow l="Horário" v={time} />
                <CnfRow l="Total" v={formatPreco(service?.preco)} gold />
              </div>
              <div className="wpp-box">
                <span style={{ fontSize: 17, flexShrink: 0 }}>📱</span>
                <span>Confirmação e lembrete 1h antes pelo <strong>WhatsApp</strong>.</span>
              </div>
              <p className="slbl">Seus dados</p>
              <div className="inp-grp">
                <label className="inp-lbl">Nome completo</label>
                <input className={`inp${formErr.nome ? " err" : ""}`} placeholder="Ex: João Silva" value={nome} onChange={e => setNome(e.target.value)} />
                {formErr.nome && <div className="err-msg">{formErr.nome}</div>}
              </div>
              <div className="inp-grp">
                <label className="inp-lbl">WhatsApp</label>
                <input className={`inp${formErr.phone ? " err" : ""}`} placeholder="(11) 99999-9999" value={phone} onChange={e => setPhone(formatWhatsapp(e.target.value))} />
                {formErr.phone && <div className="err-msg">{formErr.phone}</div>}
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {bookStep > 0 && <button className="btn-back" onClick={() => setBS(s => s - 1)}>← Voltar</button>}
            <button className="btn-gold" disabled={!canNext[bookStep] || submitting} onClick={() => bookStep < 3 ? setBS(s => s + 1) : submitBook()}>
              {submitting ? <><div className="spinner" />Enviando...</> : bookStep === 3 ? "✓ Confirmar agendamento" : "Continuar →"}
            </button>
          </div>
        </div>

        <div className="book-aside">
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--gold)" }}>Resumo</div>
          <div className="sum-card">
            <div className="sum-head">Selecionado</div>
            <div className="sum-row"><span className="sum-lbl">Serviço</span><span className="sum-val">{service?.nome || "—"}</span></div>
            <div className="sum-row"><span className="sum-lbl">Barbeiro</span><span className="sum-val">{barberObj?.nome || "—"}</span></div>
            <div className="sum-row"><span className="sum-lbl">Data</span><span className="sum-val">{time ? `${selDay.num}/${selDay.mes}` : "—"}</span></div>
            <div className="sum-row"><span className="sum-lbl">Horário</span><span className="sum-val">{time || "—"}</span></div>
            <div className="sum-row">
              <span className="sum-lbl">Total</span>
              <span className="sum-val" style={{ color: "var(--gold)", fontWeight: 700 }}>{service ? formatPreco(service.preco) : "—"}</span>
            </div>
          </div>
          <div style={{ background: "rgba(37,211,102,.07)", border: "1px solid rgba(37,211,102,.18)", borderRadius: 10, padding: "11px 13px", fontSize: 12, color: "#5BCF7A", lineHeight: 1.6 }}>
            📱 Confirmação enviada pelo WhatsApp após o agendamento
          </div>
        </div>
      </div>
    </>
  );
}

function CnfRow({ l, v, gold }) {
  return (
    <div className="cnf-row">
      <span className="cnf-lbl">{l}</span>
      <span className={`cnf-val${gold ? " gold" : ""}`}>{v}</span>
    </div>
  );
}

/**
 * Calendário mensal — modal que mostra um mês inteiro com navegação.
 * Permite escolher qualquer dia (hoje → 90 dias à frente).
 */
function CalendarioMes({ mes, setMes, selIso, onPick, onClose }) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const max = new Date(hoje); max.setDate(max.getDate() + 90);

  const firstOfMonth = new Date(mes.ano, mes.mes, 1);
  const lastOfMonth  = new Date(mes.ano, mes.mes + 1, 0);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth  = lastOfMonth.getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ kind: "out" });
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(mes.ano, mes.mes, d);
    const iso = `${mes.ano}-${String(mes.mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isPast = dt < hoje;
    const isFuture = dt > max;
    const isToday = dt.getTime() === hoje.getTime();
    cells.push({ kind: "in", d, iso, isPast, isFuture, isToday });
  }
  while (cells.length % 7 !== 0) cells.push({ kind: "out" });

  const canGoPrev = !(mes.ano === hoje.getFullYear() && mes.mes === hoje.getMonth());
  const canGoNext = !(mes.ano === max.getFullYear() && mes.mes === max.getMonth());

  const goPrev = () => {
    if (!canGoPrev) return;
    setMes(m => m.mes === 0 ? { ano: m.ano - 1, mes: 11 } : { ano: m.ano, mes: m.mes - 1 });
  };
  const goNext = () => {
    if (!canGoNext) return;
    setMes(m => m.mes === 11 ? { ano: m.ano + 1, mes: 0 } : { ano: m.ano, mes: m.mes + 1 });
  };

  return (
    <div className="cal-ov" onClick={onClose}>
      <div className="cal-box" onClick={e => e.stopPropagation()}>
        <div className="cal-hd">
          <button className="cal-nav" onClick={goPrev} disabled={!canGoPrev} aria-label="Mês anterior">‹</button>
          <div className="cal-month">{MESES[mes.mes]} {mes.ano}</div>
          <button className="cal-nav" onClick={goNext} disabled={!canGoNext} aria-label="Próximo mês">›</button>
        </div>
        <div className="cal-grid">
          {SEMANA.map(s => <div key={s} className="cal-weekday">{s}</div>)}
          {cells.map((c, i) => {
            if (c.kind === "out") return <div key={i} className="cal-day cal-out" />;
            const cls = [
              "cal-day",
              c.isToday ? "cal-today" : "",
              c.isPast || c.isFuture ? "cal-past" : "",
              selIso === c.iso ? "cal-sel" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                key={i}
                className={cls}
                disabled={c.isPast || c.isFuture}
                onClick={() => onPick(c.iso)}
              >{c.d}</button>
            );
          })}
        </div>
        <button className="btn-back" style={{ width: "100%", marginTop: 14 }} onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
