// CSS compartilhado por todas as views.
// Design system: dark + gold premium (barbearia moderna).
// Sem dependência de Tailwind, sem framework CSS — só CSS-in-JS via style tag.

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --gold:#C9A84C;--gold2:#E8C96A;--gold-dim:rgba(201,168,76,.14);--gold-border:rgba(201,168,76,.3);
  --bg:#060606;--bg2:#101010;--bg3:#181818;--bg4:#202020;
  --border:rgba(255,255,255,.07);--border2:rgba(255,255,255,.13);
  --text:#F3EEE4;--muted:#585858;--muted2:#363636;
  --green:#3DB87A;--green-dim:rgba(61,184,122,.1);--green-border:rgba(61,184,122,.25);
  --red:#E05555;--red-dim:rgba(224,85,85,.08);--red-border:rgba(224,85,85,.2);
  --r:16px;--r-sm:12px;--r-xs:8px;--sidebar:220px;
}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pop{0%{transform:scale(.75);opacity:0}65%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,.4)}60%{box-shadow:0 0 0 8px rgba(201,168,76,0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
@keyframes grain{0%,100%{transform:translate(0,0)}25%{transform:translate(-2%,1%)}50%{transform:translate(1%,-1%)}75%{transform:translate(-1%,-2%)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
.fade-up{animation:fadeUp .3s ease both}
.fade-in{animation:fadeIn .25s ease both}
.slide-in{animation:slideInRight .3s ease both}

/* Scrollbar customizada (dark + gold) */
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(201,168,76,.18);border-radius:10px;border:2px solid var(--bg)}
::-webkit-scrollbar-thumb:hover{background:rgba(201,168,76,.4)}
*{scrollbar-width:thin;scrollbar-color:rgba(201,168,76,.3) transparent}

/* Seleção de texto */
::selection{background:var(--gold);color:var(--bg)}
::-moz-selection{background:var(--gold);color:var(--bg)}

html,body,#root{height:100%;overflow:hidden}
body{background:var(--bg);font-family:'Outfit',sans-serif;color:var(--text);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}

/* TOAST */
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999;padding:11px 20px;border-radius:12px;font-size:13px;font-weight:500;max-width:300px;text-align:center;animation:slideDown .3s ease;backdrop-filter:blur(20px)}
.toast-ok{background:rgba(20,50,20,.97);border:1px solid var(--green-border);color:#6BCF8A}
.toast-err{background:rgba(50,15,15,.97);border:1px solid var(--red-border);color:#F08080}
.spinner{width:15px;height:15px;border:2px solid rgba(0,0,0,.2);border-top-color:#000;border-radius:50%;animation:spin .6s linear infinite;display:inline-block}
.skel{background:linear-gradient(90deg,var(--bg2) 25%,var(--bg3) 50%,var(--bg2) 75%);background-size:400px 100%;animation:shimmer 1.4s infinite;border-radius:10px}

/* BUTTONS */
.btn-gold{background:var(--gold);border:none;border-radius:10px;padding:12px 18px;font-size:14px;font-weight:700;color:#060606;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;width:100%}
.btn-gold:hover{background:var(--gold2)}
.btn-gold:disabled{opacity:.35;cursor:not-allowed}
.btn-back{background:var(--bg3);border:1.5px solid var(--border);border-radius:10px;padding:11px 16px;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;font-family:'Outfit',sans-serif}
.btn-ghost{background:transparent;border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;font-size:13px;color:var(--muted);cursor:pointer;font-family:'Outfit',sans-serif;width:100%}
.btn-ghost:hover{border-color:var(--border2);color:var(--text)}
.btn-sm{flex:1;padding:8px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;border:none;transition:all .2s}
.btn-sm-ghost{background:var(--bg3);color:var(--muted);border:1px solid var(--border)}
.btn-sm-gold{background:var(--gold);color:#060606}
.btn-sm-green{background:var(--green-dim);color:var(--green);border:1px solid var(--green-border)}
.btn-sm-red{background:var(--red-dim);color:var(--red);border:1px solid var(--red-border)}
.btn-outline{background:transparent;border:1.5px solid var(--gold);color:var(--gold);border-radius:10px;padding:11px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.btn-outline:hover{background:var(--gold-dim)}

/* FORMS */
.inp-grp{margin-bottom:11px}
.inp-lbl{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:5px;display:block}
.inp{width:100%;background:var(--bg3);border:1.5px solid var(--border);border-radius:10px;padding:11px 14px;font-size:14px;color:var(--text);font-family:'Outfit',sans-serif;outline:none;transition:border-color .2s}
.inp:focus{border-color:var(--gold)}
.inp::placeholder{color:var(--muted2)}
.inp.err{border-color:var(--red)}
.err-msg{font-size:11px;color:var(--red);margin-top:3px}

/* LANDING PAGE */
.landing{height:100vh;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:var(--bg3) transparent}
.landing::-webkit-scrollbar{width:6px}
.landing::-webkit-scrollbar-thumb{background:var(--bg3);border-radius:6px}
.landing-nav{position:fixed;top:0;left:0;right:0;z-index:50;padding:18px 32px;display:flex;align-items:center;justify-content:space-between;background:rgba(6,6,6,.6);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
.landing-nav-logo{display:flex;align-items:center;gap:10px}
.landing-nav-logo-mark{width:36px;height:36px;border-radius:10px;background:var(--gold-dim);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:var(--gold)}
.landing-nav-logo-txt{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:700;color:var(--gold);line-height:1}
.landing-nav-logo-sub{font-size:9px;color:var(--muted);letter-spacing:.14em;text-transform:uppercase;margin-top:1px}
.landing-nav-actions{display:flex;gap:10px;align-items:center}
.landing-hero{position:relative;min-height:100vh;display:flex;align-items:center;padding:120px 32px 80px;overflow:hidden}
.landing-hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;filter:brightness(.45)}
.landing-hero-ov{position:absolute;inset:0;background:linear-gradient(160deg,rgba(6,6,6,.8) 0%,rgba(6,6,6,.5) 50%,rgba(6,6,6,.9) 100%)}
.landing-hero-grain{position:absolute;inset:0;opacity:.08;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")}
.landing-hero-content{position:relative;z-index:2;max-width:720px;animation:fadeUp .8s ease both}
.landing-hero-eyebrow{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:30px;background:var(--gold-dim);border:1px solid var(--gold-border);font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:24px}
.landing-hero-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2.5s infinite}
.landing-hero-h1{font-family:'Cormorant Garamond',serif;font-size:clamp(48px,8vw,96px);font-weight:700;line-height:.95;letter-spacing:-.03em;margin-bottom:24px;color:#fff}
.landing-hero-h1 span{color:var(--gold);font-style:italic}
.landing-hero-p{font-size:18px;line-height:1.6;color:rgba(255,255,255,.7);max-width:540px;margin-bottom:36px}
.landing-hero-ctas{display:flex;gap:14px;flex-wrap:wrap}
.landing-hero-cta-primary{background:var(--gold);color:#060606;border:none;border-radius:12px;padding:16px 28px;font-size:15px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;display:inline-flex;align-items:center;gap:8px;transition:all .2s}
.landing-hero-cta-primary:hover{background:var(--gold2);transform:translateY(-2px)}
.landing-hero-cta-secondary{background:#25D366;color:#fff;border:1.5px solid #25D366;border-radius:12px;padding:16px 28px;font-size:15px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;display:inline-flex;align-items:center;gap:8px;transition:all .2s;text-decoration:none}
.landing-hero-cta-secondary:hover{background:#1EBE57;border-color:#1EBE57;transform:translateY(-2px);box-shadow:0 8px 20px rgba(37,211,102,.35)}
.landing-hero-stats{display:flex;gap:48px;margin-top:56px;padding-top:32px;border-top:1px solid var(--border)}
.landing-hero-stat{display:flex;flex-direction:column;gap:4px}
.landing-hero-stat-val{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:700;color:var(--gold);line-height:1}
.landing-hero-stat-lbl{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.45)}

.landing-section{padding:100px 32px;max-width:1280px;margin:0 auto;position:relative}
.landing-section-hd{text-align:center;margin-bottom:64px;max-width:600px;margin-left:auto;margin-right:auto}
.landing-section-eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:14px}
.landing-section-h2{font-family:'Cormorant Garamond',serif;font-size:clamp(36px,5vw,56px);font-weight:700;line-height:1.05;margin-bottom:14px;letter-spacing:-.02em}
.landing-section-h2 span{color:var(--gold);font-style:italic}
.landing-section-p{font-size:15px;line-height:1.7;color:var(--muted)}

.landing-svc-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;max-width:1200px;margin:0 auto}
.landing-svc-grid .landing-svc-card{flex:0 1 280px;max-width:320px}

/* Vitrine de TIPOS de serviço (landing — sem preço, sem descrição) */
.landing-types-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:1100px;margin:0 auto}
.landing-type-card{position:relative;aspect-ratio:4/5;border-radius:18px;overflow:hidden;cursor:pointer;border:1.5px solid var(--border);transition:all .35s}
.landing-type-card:hover{border-color:var(--gold-border);transform:translateY(-3px)}
.landing-type-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s}
.landing-type-card:hover .landing-type-img{transform:scale(1.08)}
.landing-type-ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 40%,rgba(0,0,0,.85) 100%)}
.landing-type-name{position:absolute;left:0;right:0;bottom:0;padding:18px 16px;font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#fff;letter-spacing:-.01em;text-align:center}
.landing-svc-card{background:var(--bg2);border:1.5px solid var(--border);border-radius:18px;cursor:pointer;transition:all .3s;position:relative;overflow:hidden}
.landing-svc-card:hover{border-color:var(--gold-border);transform:translateY(-3px)}
.landing-svc-card-img{width:100%;height:180px;object-fit:cover;display:block;transition:transform .4s}
.landing-svc-card:hover .landing-svc-card-img{transform:scale(1.05)}
.landing-svc-card-body{padding:18px 18px 20px}
.landing-svc-name{font-size:16px;font-weight:600;margin-bottom:6px;letter-spacing:-.01em}
.landing-svc-meta{font-size:12px;color:var(--muted);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.landing-svc-meta-dot{width:3px;height:3px;border-radius:50%;background:var(--muted2)}
.landing-svc-foot{display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--border)}
.landing-svc-price{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:var(--gold);line-height:1}
.landing-svc-price-sub{font-size:10px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-top:2px}
.landing-svc-arrow{width:34px;height:34px;border-radius:50%;background:var(--gold-dim);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;color:var(--gold);transition:all .2s}
.landing-svc-card:hover .landing-svc-arrow{background:var(--gold);color:#060606;transform:rotate(-45deg)}
.tag-pop{position:absolute;top:12px;left:12px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 10px;border-radius:30px;background:var(--gold);color:#060606;z-index:2}

.landing-barbers-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:18px;max-width:900px;margin:0 auto}
.landing-barbers-grid .landing-barber-card{flex:0 1 260px;max-width:280px}
.landing-barber-card{position:relative;border-radius:18px;overflow:hidden;cursor:pointer;aspect-ratio:3/4;transition:transform .3s}
.landing-barber-card:hover{transform:translateY(-4px)}
.landing-barber-img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
.landing-barber-card:hover .landing-barber-img{transform:scale(1.06)}
.landing-barber-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(6,6,6,.95) 0%,rgba(6,6,6,.4) 50%,rgba(6,6,6,0) 100%)}
.landing-barber-info{position:absolute;left:0;right:0;bottom:0;padding:22px;color:#fff}
.landing-barber-name{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;margin-bottom:4px;line-height:1.1}
.landing-barber-role{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;display:flex;align-items:center;gap:6px}
.landing-barber-stars{font-size:11px;color:rgba(255,255,255,.7)}
.landing-barber-stars-gold{color:var(--gold);letter-spacing:1px}

.landing-prod-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;max-width:1200px;margin:0 auto}
.landing-prod-grid .landing-prod-card{flex:0 1 240px;max-width:280px}
.landing-prod-card{background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));border:1px solid var(--border);border-radius:16px;overflow:hidden;transition:all .2s;position:relative}
.landing-prod-card:hover{border-color:var(--gold-border);transform:translateY(-2px);box-shadow:0 16px 36px -8px rgba(0,0,0,.4)}
.landing-prod-card .tag-pop{position:absolute;top:10px;right:10px;z-index:2}
.landing-prod-img-wrap{width:100%;height:160px;background:linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.02));display:flex;align-items:center;justify-content:center;overflow:hidden}
.landing-prod-img{width:100%;height:100%;object-fit:cover}
.landing-prod-emoji{font-size:54px;opacity:.55;filter:grayscale(.1)}
.landing-prod-body{padding:14px 16px 16px}
.landing-prod-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;margin-bottom:4px;color:var(--text)}
.landing-prod-desc{font-size:11px;color:var(--muted);line-height:1.4;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:30px}
.landing-prod-price{font-size:16px;font-weight:700;color:var(--gold);letter-spacing:.02em}

.landing-book-cta{background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04));border:1px solid var(--gold-border);border-radius:24px;padding:60px 40px;text-align:center;position:relative;overflow:hidden}
.landing-book-cta::before{content:'';position:absolute;top:-50%;right:-20%;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(201,168,76,.2) 0%,transparent 70%);filter:blur(40px)}
.landing-book-cta-content{position:relative;z-index:1}
.landing-book-cta-h2{font-family:'Cormorant Garamond',serif;font-size:clamp(32px,4vw,48px);font-weight:700;margin-bottom:14px;line-height:1.05;letter-spacing:-.02em}
.landing-book-cta-h2 span{color:var(--gold);font-style:italic}
.landing-book-cta-p{font-size:15px;color:rgba(255,255,255,.7);max-width:480px;margin:0 auto 28px;line-height:1.6}
.landing-book-cta-btn{background:var(--gold);color:#060606;border:none;border-radius:12px;padding:18px 40px;font-size:16px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;display:inline-flex;align-items:center;gap:10px;transition:all .2s}
.landing-book-cta-btn:hover{background:var(--gold2);transform:translateY(-2px);box-shadow:0 20px 40px -10px rgba(201,168,76,.4)}

.landing-footer{padding:60px 32px 30px;border-top:1px solid var(--border);background:var(--bg2)}
.landing-footer-inner{max-width:1280px;margin:0 auto;display:flex;flex-direction:column;align-items:center;text-align:center;gap:24px}
.landing-footer-info{display:flex;flex-direction:column;gap:8px;align-items:center}
.landing-footer-info-txt{font-size:15px;color:var(--muted)}
.landing-footer-info-txt strong{color:var(--text);font-weight:600}
.landing-footer-links{display:flex;gap:24px;align-items:center;justify-content:center;flex-wrap:wrap}
.landing-footer-link{font-size:15px;color:var(--muted);cursor:pointer;transition:color .2s;text-decoration:none}
.landing-footer-link:hover{color:var(--gold)}
.landing-footer-pill{background:var(--green-dim);border:1px solid var(--green-border);border-radius:20px;padding:5px 10px;font-size:11px;color:var(--green);display:inline-flex;align-items:center;gap:5px;font-weight:500}

/* BOOKING FLOW (usado por landing e cliente logado) */
.book-layout{display:grid;grid-template-columns:1fr 340px;min-height:100vh;background:var(--bg)}
.book-main{padding:24px 32px;overflow-y:auto;height:100vh}
.book-aside{background:var(--bg2);border-left:1px solid var(--border);padding:24px 20px;display:flex;flex-direction:column;gap:16px;position:sticky;top:0;height:100vh;overflow-y:auto}
.book-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.book-topbar-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;line-height:1}
.book-topbar-sub{font-size:12px;color:var(--muted);margin-top:2px}
.book-step-bar{display:flex;align-items:flex-start;margin-bottom:28px}
.book-node{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px}
.book-circle{width:30px;height:30px;border-radius:50%;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--muted2);background:var(--bg2);transition:all .3s}
.book-circle.bc-active{border-color:var(--gold);color:var(--gold);background:var(--gold-dim)}
.book-circle.bc-done{border-color:var(--gold);background:var(--gold);color:#060606}
.book-slbl{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted2);font-weight:600}
.book-slbl.bs-active{color:var(--gold)}
.book-line{flex:1;height:1px;background:var(--border);margin-top:14px;transition:background .3s}
.book-line.bl-done{background:var(--gold)}
.page-ttl{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:700;margin-bottom:6px;letter-spacing:-.01em}
.page-sub{font-size:13px;color:var(--muted);margin-bottom:24px}
.slbl{font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--gold);margin-bottom:12px}
.book-svc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.barber-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.bc-card{background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--r);cursor:pointer;display:flex;align-items:center;transition:all .2s;overflow:hidden}
.bc-card:hover{border-color:var(--border2)}
.bc-card.bcc-sel{border-color:var(--gold)}
.bc-photo{width:64px;height:72px;object-fit:cover;flex-shrink:0}
.bc-info{flex:1;padding:12px}
.bc-name{font-size:13px;font-weight:600;margin-bottom:2px}
.bc-role{font-size:11px;color:var(--muted);margin-bottom:4px;display:flex;align-items:center;gap:4px}
.bc-stars{font-size:10px;color:var(--muted)}
.bc-star-g{color:var(--gold)}
.bc-chk2{width:20px;height:20px;border-radius:50%;background:var(--gold);color:#060606;font-size:11px;display:flex;align-items:center;justify-content:center;animation:pop .2s ease;margin-right:12px;flex-shrink:0;font-weight:700}
.bc-on-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);margin-right:4px}
.days-row{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;margin-bottom:20px;scrollbar-width:none}
.days-row::-webkit-scrollbar{display:none}
.day-chip{min-width:56px;background:var(--bg2);border:1.5px solid var(--border);border-radius:12px;padding:10px 7px;cursor:pointer;text-align:center;transition:all .2s;flex-shrink:0}
.day-chip:hover{border-color:var(--border2)}
.day-chip.dc-today{border-color:rgba(201,168,76,.3)}
.day-chip.dc-sel{background:var(--gold);border-color:var(--gold)}
.day-chip.dc-sel .dn,.day-chip.dc-sel .dd,.day-chip.dc-sel .today-dot{color:#060606}
.dn{font-size:9px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:3px}
.dd{font-size:16px;font-weight:700}
.today-dot{font-size:8px;color:var(--gold);font-weight:600;margin-top:2px}
.times-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:7px}
.tc{background:var(--bg2);border:1.5px solid var(--gold-border);border-radius:8px;padding:11px 0;text-align:center;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;color:var(--text)}
.tc:hover:not(.tc-busy){border-color:var(--gold);color:var(--gold)}
.tc.tc-sel{background:var(--gold);border-color:var(--gold);color:#060606;font-weight:700}
.tc.tc-busy{background:transparent;border-color:var(--border);color:var(--muted2);cursor:not-allowed;text-decoration:line-through}
.legend{display:flex;gap:14px;margin-top:12px;flex-wrap:wrap}
.leg-item{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)}
.leg-dot{width:7px;height:7px;border-radius:50%}
.cnf-card{background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;margin-bottom:14px}
.cnf-head{background:linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.04));border-bottom:1px solid var(--gold-border);padding:11px 16px;font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--gold)}
.cnf-row{display:flex;justify-content:space-between;align-items:center;padding:11px 16px;border-bottom:1px solid var(--border);font-size:13px}
.cnf-row:last-child{border-bottom:none}
.cnf-lbl{color:var(--muted);font-size:12px}
.cnf-val{font-weight:500}
.cnf-val.gold{color:var(--gold);font-size:16px;font-weight:700}
.wpp-box{background:rgba(37,211,102,.07);border:1px solid rgba(37,211,102,.18);border-radius:var(--r-sm);padding:12px 16px;font-size:12px;color:#5BCF7A;line-height:1.5;margin-bottom:16px;display:flex;align-items:flex-start;gap:10px}
.sum-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.sum-head{padding:10px 14px;border-bottom:1px solid var(--border);font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--gold)}
.sum-row{display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px}
.sum-row:last-child{border-bottom:none}
.sum-lbl{color:var(--muted)}
.sum-val{font-weight:500}

/* LAYOUT GERAL (sidebar) */
.app{display:flex;height:100vh;color:var(--text);overflow:hidden}
.sidebar{width:var(--sidebar);flex-shrink:0;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column}
.main{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:var(--bg3) transparent}
.main::-webkit-scrollbar{width:4px}
.main::-webkit-scrollbar-thumb{background:var(--bg3);border-radius:4px}

.sb-logo{padding:22px 18px 16px;border-bottom:1px solid var(--border)}
.logo{display:flex;align-items:center;gap:10px;cursor:pointer}
.logo-mark{width:36px;height:36px;border-radius:10px;background:var(--gold-dim);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:18px}
.logo-text{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:700;color:var(--gold);line-height:1}
.logo-sub{font-size:9px;color:var(--muted);letter-spacing:.14em;text-transform:uppercase;margin-top:1px}
.sb-status{padding:10px 18px;border-bottom:1px solid var(--border)}
.pill-green{background:var(--green-dim);border:1px solid var(--green-border);border-radius:20px;padding:5px 10px;font-size:11px;color:var(--green);display:inline-flex;align-items:center;gap:5px;font-weight:500}
.dot-live{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2.5s infinite}
.sb-nav{flex:1;padding:10px 8px;overflow-y:auto;scrollbar-width:none}
.sb-nav::-webkit-scrollbar{display:none}
.sb-section{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:8px 10px 5px}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;cursor:pointer;transition:all .15s;margin-bottom:2px;border:1px solid transparent}
.nav-item:hover{background:var(--bg3)}
.nav-item.active{background:var(--gold-dim);border-color:var(--gold-border)}
.nav-item.active .nav-lbl{color:var(--gold);font-weight:600}
.nav-ic{font-size:16px;width:20px;text-align:center;flex-shrink:0}
.nav-lbl{font-size:13px;color:var(--muted);font-weight:500}
.sb-user{padding:12px 14px;border-top:1px solid var(--border);display:flex;align-items:center;gap:9px}
.sb-av{width:32px;height:32px;border-radius:50%;overflow:hidden;border:1.5px solid var(--gold-border);flex-shrink:0;background:var(--bg3)}
.sb-av img{width:100%;height:100%;object-fit:cover}
.sb-uname{font-size:12px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-urole{font-size:10px;color:var(--muted)}
.sb-logout{font-size:14px;cursor:pointer;color:var(--muted);padding:4px;border-radius:6px;flex-shrink:0}
.sb-logout:hover{color:var(--red)}

.ph{padding:22px 28px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;background:rgba(6,6,6,.93);backdrop-filter:blur(20px)}
.ph h1{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;line-height:1}
.ph p{font-size:12px;color:var(--muted);margin-top:2px}

/* SUCCESS */
.success-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 40px;text-align:center;animation:fadeUp .5s ease;max-width:480px;margin:0 auto}
.succ-ring{width:80px;height:80px;border-radius:50%;background:var(--gold-dim);border:2px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:18px;animation:pop .5s ease}
.succ-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;margin-bottom:7px}
.succ-sub{font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.6}
.succ-card{width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;margin-bottom:11px;text-align:left}
.wpp-badge2{background:rgba(37,211,102,.07);border:1px solid rgba(37,211,102,.18);border-radius:9px;padding:9px 14px;font-size:12px;color:#5BCF7A;width:100%;display:flex;align-items:center;gap:8px;margin-bottom:14px}

/* HISTORICO */
.hist-tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}
.htab{padding:6px 13px;border-radius:20px;border:1.5px solid var(--border);background:transparent;color:var(--muted);font-size:12px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .2s}
.htab.ht-active{background:var(--gold-dim);border-color:var(--gold-border);color:var(--gold)}
.hist-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.hist-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;transition:border-color .2s}
.hist-card:hover{border-color:var(--border2)}
.hist-head{padding:9px 13px;display:flex;align-items:center;justify-content:space-between}
.hist-badge{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:20px}
.hb-done{background:var(--green-dim);color:var(--green);border:1px solid var(--green-border)}
.hb-cancel{background:var(--red-dim);color:var(--red);border:1px solid var(--red-border)}
.hb-upcoming{background:var(--gold-dim);color:var(--gold);border:1px solid var(--gold-border)}
.hist-body{padding:0 13px 11px;display:flex;align-items:center;gap:10px}
.hist-av{width:38px;height:38px;border-radius:50%;overflow:hidden;border:1.5px solid var(--border);flex-shrink:0}
.hist-av img{width:100%;height:100%;object-fit:cover}
.hist-info h4{font-size:13px;font-weight:600;margin-bottom:2px}
.hist-info p{font-size:11px;color:var(--muted)}
.hist-price{font-size:14px;font-weight:700;color:var(--gold);margin-left:auto;flex-shrink:0}
.hist-footer{padding:9px 13px;border-top:1px solid var(--border);display:flex;align-items:center;gap:7px}
.star-btn{font-size:15px;cursor:pointer;transition:transform .15s;line-height:1;background:none;border:none}
.star-btn:hover{transform:scale(1.2)}
.empty-state{text-align:center;padding:60px 20px;color:var(--muted)}
.empty-icon{font-size:40px;margin-bottom:11px}
.empty-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:5px}

/* GESTOR */
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;padding:22px 28px 0}
.stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-sm);padding:14px;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:-18px;right:-18px;width:60px;height:60px;border-radius:50%;background:var(--gold-dim)}
.stat-val{font-size:22px;font-weight:700;color:var(--gold);margin-bottom:2px;position:relative;z-index:1}
.stat-lbl{font-size:10px;color:var(--muted);position:relative;z-index:1}
.gestor-tabs{display:flex;gap:6px;margin-bottom:16px}
.gtab{padding:6px 13px;border-radius:20px;border:1.5px solid var(--border);background:transparent;color:var(--muted);font-size:12px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .2s}
.gtab.gt-active{background:var(--gold-dim);border-color:var(--gold-border);color:var(--gold)}
.agenda-item{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:11px}
.agenda-hora{font-size:14px;font-weight:700;color:var(--gold);min-width:44px}
.agenda-info{flex:1}
.agenda-svc{font-size:12px;font-weight:600;margin-bottom:2px}
.agenda-meta{font-size:11px;color:var(--muted)}
.agenda-actions{display:flex;gap:6px}
.clientes-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.cliente-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-sm);padding:12px 14px;display:flex;align-items:center;gap:10px}
.cliente-av{width:38px;height:38px;border-radius:50%;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--muted);flex-shrink:0}
.cliente-nome{font-size:13px;font-weight:600;margin-bottom:2px}
.cliente-meta{font-size:11px;color:var(--muted)}
.cliente-gasto{font-size:13px;font-weight:700;color:var(--gold);margin-left:auto}

/* PERFIL */
.prof-layout{display:grid;grid-template-columns:260px 1fr;min-height:100%}
.prof-left{background:var(--bg2);border-right:1px solid var(--border);padding:24px 20px;display:flex;flex-direction:column;gap:18px}
.prof-right{padding:24px 28px}
.prof-avatar{width:72px;height:72px;border-radius:50%;background:var(--bg3);border:3px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:var(--gold);margin-bottom:10px}
.prof-name{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;margin-bottom:2px}
.prof-role{font-size:11px;color:var(--muted)}
.prof-stat{background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:10px 13px;display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}
.prof-stat-val{font-size:16px;font-weight:700;color:var(--gold)}
.prof-stat-lbl{font-size:11px;color:var(--muted)}
.prof-section-title{font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--gold);margin-bottom:9px;margin-top:14px}
.prof-item{background:var(--bg2);border:1px solid var(--border);border-radius:9px;padding:11px 13px;display:flex;align-items:center;gap:9px;margin-bottom:7px;cursor:pointer;transition:all .2s}
.prof-item:hover{border-color:var(--border2)}
.prof-item-icon{width:30px;height:30px;border-radius:7px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.prof-item-label{flex:1;font-size:13px;font-weight:500}
.prof-item-arrow{color:var(--muted2);font-size:13px}
.prof-item-badge{font-size:10px;color:var(--gold);font-weight:600;background:var(--gold-dim);padding:2px 8px;border-radius:7px;border:1px solid var(--gold-border)}
.prof-item-wpp{background:rgba(37,211,102,.07);border-color:rgba(37,211,102,.2)}
.prof-item-wpp .prof-item-icon{background:rgba(37,211,102,.1);border-color:rgba(37,211,102,.2)}
.prof-item-wpp .prof-item-label{color:#5BCF7A}

/* MODAL */
.modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease}
.modal-box{background:var(--bg2);border:1px solid var(--border2);border-radius:18px;padding:24px;width:100%;max-width:380px;animation:pop .3s ease}
.modal-title{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;margin-bottom:5px}
.modal-sub{font-size:13px;color:var(--muted);margin-bottom:18px}
.modal-stars{display:flex;gap:10px;justify-content:center;margin-bottom:18px}
.modal-star{font-size:26px;cursor:pointer;transition:transform .15s;background:none;border:none}
.modal-star:hover{transform:scale(1.15)}

/* MOBILE TOPBAR (hamburguer) — só aparece no mobile */
.mobile-topbar{display:none}

/* DRAWER BACKDROP (overlay) */
.sb-backdrop{display:none}

/* RESPONSIVO */
@media (max-width: 900px){
  /* Forçar body scroll vertical (desktop usa overflow:hidden) */
  html,body,#root{height:auto;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
  body{position:relative}

  /* Topbar fixa no topo com botão hambúrguer */
  .mobile-topbar{display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:60;background:rgba(6,6,6,.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:10px 16px}
  .mobile-topbar-logo{display:flex;align-items:center;gap:8px}
  .mobile-topbar-logo-mark{width:30px;height:30px;border-radius:8px;background:var(--gold-dim);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:700;color:var(--gold)}
  .mobile-topbar-logo-txt{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:700;color:var(--gold);line-height:1}
  .mobile-topbar-logo-sub{font-size:8px;color:var(--muted);letter-spacing:.14em;text-transform:uppercase;margin-top:1px}
  .mobile-burger{width:38px;height:38px;border-radius:9px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;color:var(--text)}
  .mobile-burger:active{background:var(--bg4)}

  /* App vira coluna: topbar fixa + main que rola */
  .app{display:flex;flex-direction:column;height:auto;min-height:100vh;overflow:visible}

  /* Sidebar vira drawer off-canvas */
  .sidebar{position:fixed;top:0;left:0;bottom:0;width:280px;max-width:85vw;z-index:70;transform:translateX(-100%);transition:transform .25s ease;box-shadow:none;background:var(--bg2)}
  .sidebar.sb-open{transform:translateX(0);box-shadow:6px 0 28px rgba(0,0,0,.5)}
  .sb-backdrop{display:block;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:65;opacity:0;pointer-events:none;transition:opacity .2s ease;backdrop-filter:blur(2px)}
  .sb-backdrop.sb-open{opacity:1;pointer-events:auto}

  /* Main ocupa 100% e rola */
  .main{flex:1;width:100%;height:auto;overflow:visible;padding-bottom:24px}
  .main::-webkit-scrollbar{width:6px}

  /* Page header sticky mais compacto */
  .ph{padding:14px 16px 12px}
  .ph h1{font-size:20px}
  .ph p{font-size:11px}

  /* Grids empilhados */
  .stat-grid{grid-template-columns:1fr 1fr;gap:8px;padding:14px 16px 0}
  .stat-card{padding:11px 12px}
  .stat-val{font-size:18px}
  .stat-lbl{font-size:9px}
  .clientes-grid{grid-template-columns:1fr;gap:8px}
  .hist-grid{grid-template-columns:1fr;gap:8px}
  .prof-layout{grid-template-columns:1fr}
  .prof-left{border-right:none;border-bottom:1px solid var(--border)}
  .book-layout{grid-template-columns:1fr}
  .book-aside{border-left:none;border-top:1px solid var(--border);position:relative;height:auto;padding:18px 20px}
  .book-main{padding:18px 16px;height:auto;overflow:visible}
  .book-topbar-title{font-size:22px}
  .barber-cards{grid-template-columns:1fr}

  /* Horários: 4 colunas em vez de 6 */
  .times-grid{grid-template-columns:repeat(4,1fr);gap:6px}
  .tc{padding:10px 0;font-size:11px}

  /* Landing */
  .landing-nav{padding:12px 16px}
  .landing-nav-logo-sub{display:none}
  .landing-nav-actions .btn-outline{display:none}
  .landing-hero{padding:88px 18px 50px;min-height:auto}
  .landing-hero-h1{font-size:42px}
  .landing-hero-p{font-size:15px}
  .landing-hero-stats{gap:24px;margin-top:32px;padding-top:20px;flex-wrap:wrap}
  .landing-hero-stat-val{font-size:26px}
  .landing-section{padding:60px 20px}
  .landing-section-h2{font-size:32px}
  .landing-svc-card,.landing-prod-card{max-width:100%;flex:1 1 100%}
  .landing-barber-card{max-width:100%;flex:1 1 100%}
  .landing-book-cta{padding:40px 20px;border-radius:18px}
  .landing-footer{padding:40px 20px 24px}
  .landing-footer-inner{flex-direction:column;align-items:flex-start}

  /* Tabelas e formulários longos → scroll horizontal */
  .inp{font-size:16px}

  /* Modal mais compacto */
  .modal-ov{padding:16px}
  .modal-box{padding:18px;border-radius:14px}

  /* Page header title com mais respiro */
  .page-ttl{font-size:24px}
  .page-sub{font-size:12px}

  /* Booking step labels (dias) já tem min-width, mantém */

  /* Booking review aside (sumário) */
  .cnf-row{font-size:12px}
  .cnf-row .cnf-val.gold{font-size:14px}

  /* Day chips um pouco menores */
  .day-chip{min-width:48px;padding:8px 5px}
  .dd{font-size:14px}

  /* Page header flex-wrap pra badge de gestor não espremer */
  .ph > div:last-child{flex-shrink:0}
  .ph{gap:10px}

  /* Histórico de cards: menos altura no card */
  .hist-card .hist-price{font-size:13px}
  .agenda-item{padding:10px 12px;gap:9px;flex-wrap:wrap}
  .agenda-hora{min-width:38px;font-size:13px}
  .agenda-actions{width:100%;justify-content:flex-end}
}

/* TABLET (768–900) */
@media (min-width: 768px) and (max-width: 900px){
  .stat-grid{grid-template-columns:repeat(2,1fr)}
  .clientes-grid{grid-template-columns:1fr 1fr}
  .hist-grid{grid-template-columns:1fr 1fr}
}

/* MOBILE PEQUENO (<380) */
@media (max-width: 380px){
  .stat-grid{grid-template-columns:1fr}
  .ph h1{font-size:18px}
  .landing-hero-h1{font-size:34px}
  .landing-hero-stats{gap:18px}
  .landing-hero-stat-val{font-size:22px}
  .book-circle{width:26px;height:26px;font-size:11px}
  .book-slbl{font-size:8px}
}

/* LANDING: vitrine de tipos (3 → 2 colunas no tablet, 1 no mobile) */
@media (max-width: 768px){
  .landing-types-grid{grid-template-columns:repeat(2,1fr);gap:10px}
  .landing-type-name{font-size:18px;padding:14px 10px}
}
@media (max-width: 480px){
  .landing-types-grid{grid-template-columns:1fr 1fr;gap:8px}
  .landing-type-name{font-size:15px;padding:10px 8px}
}

/* DIAS — área de seleção de data com setas + botão calendário */
.days-wrap{position:relative;margin-bottom:20px}
.days-nav-btn{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:34px;height:34px;border-radius:50%;background:rgba(8,8,8,.85);border:1.5px solid var(--gold-border);color:var(--gold);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);transition:all .2s;box-shadow:0 4px 12px rgba(0,0,0,.4)}
.days-nav-btn:hover{background:var(--gold);color:#060606;transform:translateY(-50%) scale(1.1)}
.days-nav-btn:disabled{opacity:.3;cursor:default;transform:translateY(-50%)}
.days-nav-left{left:-4px}
.days-nav-right{right:-4px}
.days-fade-l,.days-fade-r{position:absolute;top:0;bottom:0;width:40px;pointer-events:none;z-index:2}
.days-fade-l{left:0;background:linear-gradient(90deg,var(--bg) 0%,transparent 100%)}
.days-fade-r{right:0;background:linear-gradient(270deg,var(--bg) 0%,transparent 100%)}
.days-actions{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px}
.days-title{font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--gold)}
.days-cal-btn{background:transparent;border:1px solid var(--border);color:var(--muted);padding:6px 12px;border-radius:8px;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all .2s}
.days-cal-btn:hover{border-color:var(--gold-border);color:var(--gold)}

/* CALENDÁRIO (modal de mês) */
.cal-ov{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(6px);z-index:200;display:grid;place-items:center;padding:20px;animation:fadeIn .2s}
.cal-box{background:var(--bg2);border:1.5px solid var(--gold-border);border-radius:18px;padding:24px;width:100%;max-width:380px;max-height:90vh;overflow-y:auto;margin:auto}
.cal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.cal-month{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--gold);text-transform:capitalize}
.cal-nav{background:transparent;border:1px solid var(--border);color:var(--muted);width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .2s}
.cal-nav:hover{border-color:var(--gold-border);color:var(--gold)}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px}
.cal-weekday{font-size:10px;font-weight:600;color:var(--muted);text-align:center;padding:6px 0;letter-spacing:.05em}
.cal-day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:transparent;border:1.5px solid transparent;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;color:#fff}
.cal-day:hover:not(:disabled){border-color:var(--gold-border);background:rgba(201,168,76,.08)}
.cal-day:disabled{color:rgba(255,255,255,.18);cursor:not-allowed}
.cal-day.cal-today{border-color:rgba(201,168,76,.3);color:var(--gold)}
.cal-day.cal-past{color:rgba(255,255,255,.12);cursor:not-allowed}
.cal-day.cal-sel{background:var(--gold);color:#060606;font-weight:700;border-color:var(--gold)}
.cal-day.cal-out{color:rgba(255,255,255,.25)}
  @media (max-width: 600px){
    .days-nav-btn{width:30px;height:30px;font-size:16px}
    .days-fade-l,.days-fade-r{width:28px}
    .cal-box{padding:18px}
  }

/* ── TEMA LIGHT ──────────────────────────── */
[data-theme="light"]{
  --bg:#FAFAF8;--bg2:#F0EFEC;--bg3:#E8E7E4;--bg4:#D8D7D4;
  --border:rgba(0,0,0,.07);--border2:rgba(0,0,0,.13);
  --text:#1A1A18;--muted:#999;--muted2:#bbb;
  --green:#2D8F55;--green-dim:rgba(45,143,85,.08);--green-border:rgba(45,143,85,.18);
  --red:#CC3333;--red-dim:rgba(204,51,51,.06);--red-border:rgba(204,51,51,.15);
}
[data-theme="light"] body{background:var(--bg)}
[data-theme="light"] .ph{background:rgba(250,250,248,.93)}
[data-theme="light"] .landing-nav{background:rgba(250,250,248,.7)}
[data-theme="light"] .landing-hero-ov{background:linear-gradient(160deg,rgba(250,250,248,.85) 0%,rgba(250,250,248,.5) 50%,rgba(250,250,248,.9) 100%)}
[data-theme="light"] .landing-hero-h1{color:#1A1A18}
[data-theme="light"] .landing-hero-p{color:rgba(0,0,0,.6)}
[data-theme="light"] .landing-hero-stats{border-top-color:var(--border)}
[data-theme="light"] .landing-hero-stat-lbl{color:var(--muted)}
[data-theme="light"] .mobile-topbar{background:rgba(250,250,248,.92)}
[data-theme="light"] .skel{background:linear-gradient(90deg,#e0e0e0 25%,#eee 50%,#e0e0e0 75%);background-size:400px 100%}
[data-theme="light"] ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-color:var(--bg)}
[data-theme="light"] .landing-type-name{color:#1A1A18}
[data-theme="light"] .btn-gold{color:#FAFAF8}
[data-theme="light"] .cal-day{color:#1A1A18}
[data-theme="light"] .cal-day.cal-past{color:rgba(0,0,0,.15)}
[data-theme="light"] .cal-box{background:var(--bg3)}
`;
