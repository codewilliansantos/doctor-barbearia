/* ─── COMPONENTE DE PAGAMENTO ───
   Use: <PaymentScreen agendamento={apt} onClose={()=>setPaying(null)} onSuccess={()=>reloadHist()} />
─── */

import { useState, useEffect } from "react";
import { apiFetch } from "./api";

export function PaymentScreen({ agendamento, onClose, onSuccess }) {
  const [step, setStep]       = useState("metodo"); // metodo | pix | aguardando | pago
  const [pixData, setPixData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [cpf, setCpf]         = useState("");

  /* Polling para verificar pagamento a cada 5s */
  useEffect(() => {
    if (step !== "aguardando") return;
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/pagamentos/status/${agendamento.id}`);
        if (res.pagamento_status === "pago") {
          setStep("pago");
          onSuccess?.();
          clearInterval(interval);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [step, agendamento.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const gerarPix = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/pagamentos/pix", {
        method: "POST",
        body: JSON.stringify({ agendamento_id: agendamento.id, cpf }),
      });
      setPixData(res);
      setStep("aguardando");
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(pixData?.qr_code || "");
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const styles = {
    overlay: { position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center" },
    box: { background:"#111",border:"1px solid rgba(255,255,255,.12)",borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:430,animation:"slideUp .35s ease" },
    handle: { width:36,height:4,borderRadius:2,background:"rgba(255,255,255,.15)",margin:"0 auto 20px" },
    title: { fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:"#F3EEE4",marginBottom:6 },
    sub: { fontSize:13,color:"#585858",marginBottom:24,lineHeight:1.5 },
    card: { background:"#191919",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:"14px 16px",marginBottom:12 },
    row: { display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 },
    lbl: { fontSize:12,color:"#585858" },
    val: { fontSize:13,fontWeight:500,color:"#F3EEE4" },
    total: { fontSize:18,fontWeight:700,color:"#C9A84C" },
    btn: { width:"100%",background:"#C9A84C",border:"none",borderRadius:14,padding:"14px",fontSize:15,fontWeight:700,color:"#060606",cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:8 },
    btnGhost: { width:"100%",background:"transparent",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:14,padding:"13px",fontSize:14,fontWeight:500,color:"#585858",cursor:"pointer",fontFamily:"'Outfit',sans-serif" },
    metodoBtn: { background:"#191919",border:"1.5px solid rgba(255,255,255,.07)",borderRadius:16,padding:"16px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:14,width:"100%",textAlign:"left" },
    metodoBtnIcon: { width:44,height:44,borderRadius:12,background:"rgba(201,168,76,.1)",border:"1px solid rgba(201,168,76,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 },
    qrWrap: { background:"#fff",borderRadius:16,padding:16,textAlign:"center",marginBottom:16 },
    qrImg: { width:180,height:180,margin:"0 auto 8px" },
    pixCode: { background:"#191919",border:"1px solid rgba(255,255,255,.07)",borderRadius:10,padding:"12px 14px",fontSize:11,color:"#585858",wordBreak:"break-all",marginBottom:12,lineHeight:1.6 },
    inp: { width:"100%",background:"#191919",border:"1.5px solid rgba(255,255,255,.07)",borderRadius:12,padding:"12px 16px",fontSize:14,color:"#F3EEE4",fontFamily:"'Outfit',sans-serif",outline:"none",marginBottom:12 },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.box} onClick={e => e.stopPropagation()}>
        <div style={styles.handle}/>

        {/* RESUMO */}
        <div style={styles.card}>
          <div style={styles.row}>
            <span style={styles.lbl}>Serviço</span>
            <span style={styles.val}>{agendamento.emoji} {agendamento.servico}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.lbl}>Barbeiro</span>
            <span style={styles.val}>{agendamento.barbeiro}</span>
          </div>
          <div style={{...styles.row,marginBottom:0,marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.06)"}}>
            <span style={styles.lbl}>Total</span>
            <span style={styles.total}>R$ {Number(agendamento.preco).toFixed(2)}</span>
          </div>
        </div>

        {/* ESCOLHA DO MÉTODO */}
        {step === "metodo" && <>
          <div style={styles.title}>Como pagar?</div>
          <div style={styles.sub}>Escolha a forma de pagamento</div>

          <button style={styles.metodoBtn} onClick={() => setStep("pix_form")}>
            <div style={styles.metodoBtnIcon}>💠</div>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"#F3EEE4",marginBottom:2}}>Pix</div>
              <div style={{fontSize:12,color:"#585858"}}>Aprovação imediata · Taxa 1,99%</div>
            </div>
            <div style={{marginLeft:"auto",color:"rgba(255,255,255,.3)",fontSize:18}}>›</div>
          </button>

          <button style={styles.metodoBtn} onClick={() => setStep("cartao")}>
            <div style={styles.metodoBtnIcon}>💳</div>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"#F3EEE4",marginBottom:2}}>Cartão de crédito</div>
              <div style={{fontSize:12,color:"#585858"}}>Até 12x · Aprovação rápida</div>
            </div>
            <div style={{marginLeft:"auto",color:"rgba(255,255,255,.3)",fontSize:18}}>›</div>
          </button>

          <button style={styles.btnGhost} onClick={onClose}>Pagar depois</button>
        </>}

        {/* FORMULÁRIO PIX */}
        {step === "pix_form" && <>
          <div style={styles.title}>Pagar com Pix</div>
          <div style={styles.sub}>Informe seu CPF para gerar o QR Code</div>
          <input style={styles.inp} placeholder="CPF (apenas números)" value={cpf} onChange={e => setCpf(e.target.value.replace(/\D/g,"").slice(0,11))} maxLength={11}/>
          <button style={styles.btn} disabled={loading || cpf.length < 11} onClick={gerarPix}>
            {loading ? "Gerando..." : "💠 Gerar QR Code Pix"}
          </button>
          <button style={styles.btnGhost} onClick={() => setStep("metodo")}>← Voltar</button>
        </>}

        {/* QR CODE PIX */}
        {step === "aguardando" && pixData && <>
          <div style={styles.title}>Escaneie o QR Code</div>
          <div style={styles.sub}>Aguardando confirmação do pagamento...</div>

          <div style={styles.qrWrap}>
            {pixData.simulado ? (
              <div style={{width:180,height:180,margin:"0 auto 8px",background:"#f0f0f0",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}>
                <div style={{fontSize:32}}>💠</div>
                <div style={{fontSize:11,color:"#666",textAlign:"center"}}>QR Code simulado<br/>em modo teste</div>
              </div>
            ) : (
              <img src={pixData.qr_code_image} alt="QR Code Pix" style={styles.qrImg}/>
            )}
            <div style={{fontSize:12,color:"#999",marginTop:4}}>Válido por 30 minutos</div>
          </div>

          <div style={styles.pixCode}>{pixData.qr_code}</div>

          <button style={styles.btn} onClick={copiarCodigo}>
            {copiado ? "✓ Copiado!" : "📋 Copiar código Pix"}
          </button>

          <div style={{textAlign:"center",fontSize:12,color:"#585858",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#3DB87A",animation:"pulse 2s infinite"}}/>
            Aguardando pagamento...
          </div>
        </>}

        {/* CARTÃO */}
        {step === "cartao" && <>
          <div style={styles.title}>Cartão de crédito</div>
          <div style={styles.sub}>Em breve! Por enquanto use o Pix.</div>
          <button style={styles.btn} onClick={() => setStep("metodo")}>← Escolher outro método</button>
        </>}

        {/* PAGO */}
        {step === "pago" && <>
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:56,marginBottom:16,animation:"pop .5s ease"}}>✅</div>
            <div style={styles.title}>Pagamento confirmado!</div>
            <div style={styles.sub}>Seu agendamento está pago e garantido.</div>
            <button style={styles.btn} onClick={onClose}>Fechar</button>
          </div>
        </>}
      </div>
    </div>
  );
}
