# Doctor Barbearia — SaaS de Agendamento + Play Store

Sistema completo de agendamento para barbearias, com painel do gestor, portal do cliente, gestão financeira, pacotes, lista de espera, aniversariantes, lembretes WhatsApp, **planos SaaS com cobrança recorrente (Asaas)** e **app Android pronto para Play Store (Capacitor)**.

---

## 🏗️ Arquitetura

```
doctor-barbearia/
├── frontend/    → React 18 + PWA + Capacitor (gera APK/AAB Android)
└── backend/     → Node.js + Express + PostgreSQL (multi-tenant + Asaas)
```

| Camada       | Stack                                          |
| ------------ | ---------------------------------------------- |
| Frontend     | React 18, PWA (manifest + service worker), Capacitor 6 (Android) |
| Backend      | Node 18+, Express, PostgreSQL 14+, JWT, Helmet |
| Pagamentos   | Asaas (PIX + Cartão + Boleto, sandbox/prod)    |
| Mensageria   | Z-API (WhatsApp)                               |
| Multi-tenant | Subdomínio (ex: `doctor.app.com`) ou path     |

---

## 🚀 Setup local (5 min)

### 1. Banco PostgreSQL

```bash
# Crie o banco
createdb doctor_barbearia
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edite .env (DB_*, JWT_SECRET, ZAPI_*, PAGSEGURO_*)
npm install
node src/database/migrate.js
node src/database/migrate-v11.js   # planos + multi-tenant + Asaas
node src/database/migrate-v12.js   # isolamento multi-tenant completo (caixa, contas, pacotes...)
node src/database/seed-limpo.js    # dados de exemplo (limpa + popula)
npm start
```

✅ Backend em `http://localhost:3001`  
✅ Health check: `http://localhost:3001/health`

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # se existir, senão crie com REACT_APP_API_URL=http://localhost:3001
npm install
npm start
```

✅ Frontend em `http://localhost:3000`

---

## 💳 Configurar Asaas (cobrança recorrente)

1. Crie conta em **https://www.asaas.com** (sandbox grátis pra testar).
2. Vá em **Integrações → API → Gerar Token** (ambiente Sandbox primeiro).
3. No `.env` do backend:
   ```env
   ASAAS_ENV=sandbox
   ASAAS_API_KEY=seu_token_aqui
   ASAAS_WEBHOOK_TOKEN=uma_senha_forte
   ```
4. Configure o webhook no painel Asaas:  
   `https://SEU_DOMINIO/billing/webhooks/asaas?token=ASAAS_WEBHOOK_TOKEN`
5. Em produção, troque `ASAAS_ENV=production` e gere um token de produção.

Os planos (Essencial R$79,90 / Profissional R$149,90 / Premium R$299,90) já estão cadastrados na migration v11.

---

## 🏢 Multi-tenant (white-label)

Cada cliente do SaaS é um **tenant** (1 barbearia = 1 tenant). Funciona assim:

- Subdomínio: `clienteX.doctorbarbearia.com` → tenant `clienteX`
- Header `X-Tenant-Slug` (app Android envia)
- Fallback dev: `DEFAULT_TENANT_SLUG=doctor`

Para **onboardar um novo cliente**:

```sql
INSERT INTO tenants (slug, nome, slug_subdominio, whatsapp, email, cor_primaria)
VALUES ('barbearia-joao', 'Barbearia do João', 'joao', '5511999999999', 'joao@email.com', '#C9A84C');

-- Cria trial de 14 dias
INSERT INTO assinaturas (tenant_id, plano_id, status, data_inicio, data_proxima_cobranca)
SELECT id, 1, 'trial', NOW(), NOW() + INTERVAL '14 days' FROM tenants WHERE slug = 'barbearia-joao';
```

A branding (nome, cor, logo, WhatsApp) é configurável por tenant. O backend expõe em `/publico/config` e o frontend aplica dinamicamente.

---

## 📱 Gerar APK/AAB para Play Store

### Pré-requisitos

1. **Android Studio** instalado (https://developer.android.com/studio)
2. **JDK 17** (vem com Android Studio)
3. Conta no **Google Play Console** ($25 único) — https://play.google.com/console

### Comandos

```bash
cd frontend
npm run cap:sync       # build do React + copia pro android/
npm run cap:open       # abre o projeto no Android Studio
```

No Android Studio:

1. **Build → Generate Signed Bundle / APK...**
2. Escolha **Android App Bundle** (formato exigido pela Play Store).
3. Crie um keystore novo (guarde com a vida — sem ele, updates ficam impossíveis):
   - Validity: 25 anos
   - Senha forte (anote)
4. Selecione **release** + **V2 (App Bundle)** → **Create**.
5. O `.aab` sai em `android/app/release/app-release.aab`.

### Submeter pra Play Store

1. Play Console → **Criar app** (Doctor Barbearia)
2. Preencher ficha da loja (descrição, screenshots, ícone 512×512, banner).
3. **Versões → Produção → Criar nova versão** → upload do `.aab`.
4. Preencher questionário de classificação de conteúdo.
5. Enviar para revisão (~3–7 dias na primeira vez).

---

## 🌐 Deploy em produção

### Frontend (PWA + app)

Recomendado: **Vercel** (grátis, HTTPS automático).

```bash
cd frontend
vercel
```

Configure:
- `REACT_APP_API_URL` = `https://api.doctorbarbearia.com`

### Backend (Node + Postgres)

Recomendado: **Railway** (https://railway.app) ou **Render**.

1. Conecte o repo.
2. Add-on PostgreSQL → pega as variáveis `DATABASE_URL`.
3. Configure: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `FRONTEND_URL`, `ASAAS_*`.
4. Build command: `npm install`  
   Start command: `npm start`
5. Rodar migrations no startup (adicione ao `npm start`):
   ```json
   "start": "node src/database/migrate.js && node src/database/migrate-v11.js && node src/server.js"
   ```

### Domínio + multi-tenant

- `doctorbarbearia.com` → site institucional + landing
- `*.doctorbarbearia.com` (wildcard DNS) → cada barbearia no seu subdomínio
- Configure no provedor: `*.doctorbarbearia.com CNAME doctorbarbearia.com`

---

## 💰 Modelo de negócio

| Canal              | Modelo                                  | Preço exemplo           |
| ------------------ | --------------------------------------- | ----------------------- |
| **Vende o sistema** | Licença anual, instalação + treinamento | R$ 1.500/ano (única)    |
| **SaaS mensal**     | Plano Essencial / Profissional / Premium | R$ 79,90 a R$ 299,90/mês |

Você pode combinar: dar 14 dias grátis → depois migrar pro plano pago. Tudo automatizado via Asaas.

---

## 📋 Checklist para ir ao ar

- [ ] PostgreSQL rodando e migrado (`migrate.js` + `migrate-v11.js` + `migrate-v12.js`)
- [ ] `.env` do backend com `JWT_SECRET` (32+ chars), `ASAAS_API_KEY`, `FRONTEND_URL` reais
- [ ] Asaas configurado (sandbox primeiro, depois produção)
- [ ] Webhook Asaas apontando para `/billing/webhooks/asaas`
- [ ] Frontend em produção (Vercel/Netlify/Railway)
- [ ] Backend em produção (Railway/Render)
- [ ] Domínio configurado (HTTPS obrigatório)
- [ ] DNS wildcard `*.dominio.com` (se for multi-tenant)
- [ ] Android Studio + JDK 17 instalados
- [ ] Keystore gerado e guardado em local seguro
- [ ] Conta no Google Play Console criada ($25)
- [ ] `.aab` gerado e submetido pra revisão
- [ ] Screenshots + ficha da loja preenchidos

---

## 🛠️ Comandos úteis

```bash
# Backend
cd backend
npm start                # inicia API
npm test                 # roda testes
node src/database/migrate.js       # recria/atualiza tabelas
node src/database/migrate-v11.js   # planos + multi-tenant
node src/database/migrate-v12.js   # isolamento completo (caixa, contas, pacotes)
node src/database/seed-limpo.js    # popula dados de exemplo (limpa antes)

# Frontend
cd frontend
npm start                # dev (http://localhost:3000)
npm run build            # gera build de produção em /build
npm test                 # roda testes
npm run cap:sync         # build + copia pro android/
npm run cap:open         # abre Android Studio
```

---

## 🔒 Segurança & QA

### Hardening aplicado

- **Helmet** ativado em todas as rotas (headers HTTP seguros)
- **CORS** restrito a `FRONTEND_URL` (não `*`)
- **Rate limit global**: 300 req / 15 min por IP
- **Rate limit em `/auth`**: 20 req / 15 min (anti força-bruta)
- **JWT** com `expiresIn: 30d`, segredo via `JWT_SECRET`
- **bcrypt** com cost 10 para hash de senhas
- **PostgreSQL**: queries parametrizadas (zero SQL injection)
- **Webhook Asaas**: validado por `ASAAS_WEBHOOK_TOKEN`
- **Sentry** opcional (`SENTRY_DSN`) — só envia se configurado
- **Validação de produção**: `NODE_ENV=production` exige `JWT_SECRET`, `FRONTEND_URL`, `PAGSEGURO_WEBHOOK_SECRET`

### Multi-tenant — isolamento

Cada requisição carrega `req.tenantId` (resolvido por subdomínio ou header `X-Tenant-Slug`). **Toda** query de leitura/escrita filtra por `tenant_id`. Migration `v12` adiciona `tenant_id` em **todas** as tabelas de negócio:

- `usuarios, clientes, barbeiros, servicos, agendamentos, produtos, vendas` (v11)
- `caixa_sessoes, caixa_movimentacoes, contas_pagar, contas_receber, venda_itens, jornadas, encaixes, lista_espera, pacotes, pacote_servicos, cliente_pacotes, pacote_usos, configuracoes, pagamentos` (v12)

**Testes automatizados** (`__tests__/multi-tenant.test.js`) validam que INSERTs, UPDATEs e queries de leitura incluem `tenant_id`.

### Pendências de segurança (conhecidas)

- **JWT_SECRET fraco no `.env` de dev** — trocar por `openssl rand -hex 32` antes de produção
- **30 vulnerabilidades npm** (alta/moderada) — todas em deps transitivas de `react-scripts` (dev only). Recomenda-se migrar para Vite + React 18 quando o `react-scripts` chegar ao EOL
- **PAGSEGURO_TOKEN em código** (não `.env`) — variável existe mas valor default é `'seu_token_aqui'`

### Auditoria de QA

| Categoria | Status | Detalhes |
|-----------|--------|----------|
| Testes backend | ✅ 55/55 | `backend/__tests__/` — auth, agendamentos, financeiro, health, whatsapp, multi-tenant, validation |
| Testes frontend | ✅ 44/44 | `frontend/src/__tests__/` — api, shared, whatsapp-mirror, api-security |
| Lint backend | n/a | (sem ESLint configurado; usar `node --check` se quiser) |
| Lint frontend | ✅ 0 erros / 0 warnings | Build limpo — `npm run build` em ambos os projetos |
| Build produção | ✅ | `npm run build` em ambos os projetos |
| Multi-tenant | ✅ | Migration v12 + queries filtradas + testes |
| SQL injection | ✅ | Todas as queries parametrizadas com `$1, $2...` |
| XSS | ✅ | React escapa por padrão; Helmet seta CSP básico |
| CORS | ✅ | Whitelist via `FRONTEND_URL` |
| Dados sensíveis em logs | ⚠️ | `console.error` em `agendamentos.js` mostra dados do agendamento (não token/senha) |
| Backup automatizado | ❌ | Pendente — Railway Cron + `pg_dump` |
| Sentry em prod | ⚠️ | Opcional via `SENTRY_DSN` |

---

## 🚀 Deploy (Railway / Render)

O conteúdo detalhado de deploy que antes ficava em `DEPLOY.md` está consolidado aqui.

**Railway** (mais simples):

1. `railway.app` → New Project → Deploy from GitHub
2. Adicionar **PostgreSQL** no projeto
3. Backend: detecta `Dockerfile.backend` automaticamente. Adicione `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` em Variables
4. Frontend: Static Site, build `cd frontend && npm install && npm run build`, publish `frontend/build`
5. Após primeiro deploy: `railway run psql $DATABASE_URL < db/seed.sql` (opcional, dados de exemplo)

**Domínio customizado**: Settings → Domains → Custom Domain → DNS conforme instruções. Railway/Render emitem SSL automático.

**Backup diário** (cron no Railway):

```bash
0 3 * * *  cd /app && node export_full.js && cp backup_full.sql /backups/$(date +\%Y\%m\%d).sql
```

---

## 📊 Monitoramento (Sentry)

Conteúdo consolidado de `SENTRY.md`.

**Sentry** captura exceptions e envia para dashboard com stacktraces, contexto, breadcrumbs.

**Setup (5 min)**:

1. Conta grátis em [sentry.io/signup](https://sentry.io/signup) — free tier = 5k eventos/mês
2. Crie Organization + projeto Node.js (backend) + React (frontend)
3. Backend: copie o DSN → `backend/.env`: `SENTRY_DSN=https://abc123@o456.ingest.sentry.io/789`
4. Frontend: `frontend/.env`: `REACT_APP_SENTRY_DSN=https://xyz789@o456.ingest.sentry.io/012`
5. Reinicie / rebuild. Erros passam a aparecer no dashboard

**Não captura** (intencional): erros 4xx, validações UX, health checks.

**Alternativas**: Rollbar (free tier maior), Bugsnag, GlitchTip (self-hosted).

---

## 📞 Suporte

- Documentação Asaas: https://docs.asaas.com
- Documentação Capacitor: https://capacitorjs.com/docs
- Play Console help: https://support.google.com/googleplay/android-developer
