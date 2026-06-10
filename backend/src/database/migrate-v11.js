/**
 * Migration v11 — Planos SaaS, Assinaturas, Multi-tenant
 *
 * Tabelas criadas:
 * - tenants        — cada barbearia-cliente (multi-tenant por subdomínio/path)
 * - planos         — catálogo de planos (Essencial, Profissional, Premium)
 * - assinaturas    — vincula tenant a um plano + ciclo de cobrança
 * - faturas        — histórico de cobranças (espelho do Asaas)
 *
 * Multi-tenant: cada agendamento/serviço/barbeiro agora tem `tenant_id`.
 * Migração retroativa: cria um tenant padrão (id=1) e atribui a todos
 * os registros existentes, mantendo 100% de compatibilidade.
 */
const pool = require('./connection');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Tabela de tenants (cada cliente do SaaS = 1 tenant)
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id              SERIAL PRIMARY KEY,
        slug            VARCHAR(60)  NOT NULL UNIQUE,
        nome            VARCHAR(120) NOT NULL,
        slug_subdominio VARCHAR(60)  UNIQUE,
        whatsapp        VARCHAR(20),
        email           VARCHAR(150),
        cor_primaria    VARCHAR(20)  DEFAULT '#C9A84C',
        cor_fundo       VARCHAR(20)  DEFAULT '#060606',
        logo_url        TEXT,
        asaas_customer_id VARCHAR(60),
        ativo           BOOLEAN DEFAULT TRUE,
        criado_em       TIMESTAMP DEFAULT NOW()
      )
    `);
    // Tenant padrão — Doctor Barbearia original
    await client.query(`
      INSERT INTO tenants (id, slug, nome, slug_subdominio, ativo)
      VALUES (1, 'doctor', 'Doctor Barbearia', 'doctor', TRUE)
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query(`SELECT setval('tenants_id_seq', (SELECT COALESCE(MAX(id),1) FROM tenants))`);
    console.log('✅ Tabela tenants criada (com tenant padrão id=1)');

    // 2) Catálogo de planos
    await client.query(`
      CREATE TABLE IF NOT EXISTS planos (
        id              SERIAL PRIMARY KEY,
        codigo          VARCHAR(40)  NOT NULL UNIQUE,
        nome            VARCHAR(80)  NOT NULL,
        descricao       TEXT,
        preco_mensal    NUMERIC(10,2) NOT NULL,
        limite_agendamentos_mes INT,
        limite_barbeiros INT,
        recursos        JSONB DEFAULT '[]'::jsonb,
        ativo           BOOLEAN DEFAULT TRUE,
        criado_em       TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      INSERT INTO planos (codigo, nome, descricao, preco_mensal, limite_agendamentos_mes, limite_barbeiros, recursos) VALUES
        ('essencial',     'Essencial',     'Para barbearias que estão começando.',                 79.90,  150,   2, '["Agendamentos ilimitados","Até 2 barbeiros","Agenda do dia","Lembretes WhatsApp","Relatórios básicos"]'::jsonb),
        ('profissional', 'Profissional',  'Para barbearias em crescimento que precisam de controle.', 149.90, 600,   5, '["Tudo do Essencial","Até 5 barbeiros","Gestão financeira","Pacotes de serviços","Lista de espera","Aniversariantes","Relatórios avançados"]'::jsonb),
        ('premium',      'Premium',       'Para redes e barbearias de alto volume.',                 299.90, NULL, NULL, '["Tudo do Profissional","Barbeiros ilimitados","Agendamentos ilimitados","Multi-unidades","Suporte prioritário","API dedicada","Onboarding personalizado"]'::jsonb)
      ON CONFLICT (codigo) DO NOTHING
    `);
    console.log('✅ Tabela planos criada (Essencial, Profissional, Premium)');

    // 3) Assinaturas (tenant ↔ plano, com ciclo de cobrança)
    await client.query(`
      CREATE TABLE IF NOT EXISTS assinaturas (
        id                  SERIAL PRIMARY KEY,
        tenant_id           INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        plano_id            INTEGER NOT NULL REFERENCES planos(id),
        status              VARCHAR(20) DEFAULT 'trial'
                            CHECK (status IN ('trial','ativa','inadimplente','cancelada','expirada')),
        ciclo               VARCHAR(20) DEFAULT 'mensal' CHECK (ciclo IN ('mensal','anual')),
        data_inicio         TIMESTAMP DEFAULT NOW(),
        data_proxima_cobranca TIMESTAMP,
        data_fim            TIMESTAMP,
        asaas_subscription_id VARCHAR(60),
        criado_em           TIMESTAMP DEFAULT NOW(),
        atualizado_em       TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assinaturas_tenant ON assinaturas(tenant_id)`);
    // Trial de 14 dias para o tenant padrão
    await client.query(`
      INSERT INTO assinaturas (tenant_id, plano_id, status, data_inicio, data_proxima_cobranca)
      SELECT 1, p.id, 'trial', NOW(), NOW() + INTERVAL '14 days'
      FROM planos p WHERE p.codigo = 'profissional'
      AND NOT EXISTS (SELECT 1 FROM assinaturas WHERE tenant_id = 1)
    `);
    console.log('✅ Tabela assinaturas criada (trial de 14 dias no tenant padrão)');

    // 4) Faturas (espelho das cobranças do Asaas)
    await client.query(`
      CREATE TABLE IF NOT EXISTS faturas (
        id              SERIAL PRIMARY KEY,
        tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        assinatura_id   INTEGER REFERENCES assinaturas(id) ON DELETE SET NULL,
        asaas_payment_id VARCHAR(60),
        valor           NUMERIC(10,2) NOT NULL,
        status          VARCHAR(30) DEFAULT 'pendente'
                        CHECK (status IN ('pendente','paga','atrasada','cancelada','reembolsada')),
        metodo          VARCHAR(20),
        data_vencimento DATE,
        data_pagamento  TIMESTAMP,
        pix_qr_code     TEXT,
        pix_copia_cola  TEXT,
        boleto_url      TEXT,
        fatura_url      TEXT,
        criado_em       TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_faturas_tenant ON faturas(tenant_id)`);
    console.log('✅ Tabela faturas criada');

    // 5) Multi-tenant: adicionar tenant_id nas tabelas principais
    //    Migração retroativa: tudo vira tenant_id=1
    const tabelas = ['usuarios', 'clientes', 'barbeiros', 'servicos', 'agendamentos', 'produtos', 'vendas'];
    for (const t of tabelas) {
      const temCol = await client.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'tenant_id'
      `, [t]);
      if (temCol.rows.length === 0) {
        await client.query(`ALTER TABLE ${t} ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE`);
        await client.query(`UPDATE ${t} SET tenant_id = 1 WHERE tenant_id IS NULL`);
        await client.query(`ALTER TABLE ${t} ALTER COLUMN tenant_id SET NOT NULL`);
        await client.query(`ALTER TABLE ${t} ALTER COLUMN tenant_id SET DEFAULT 1`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${t}_tenant ON ${t}(tenant_id)`);
        console.log(`  • ${t}: coluna tenant_id adicionada + registros migrados`);
      }
    }

    await client.query('COMMIT');
    console.log('\n🎉 Migration v11 concluída: multi-tenant + planos + assinaturas + Asaas ready!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration v11:', e.message);
    process.exit(1);
  } finally {
    client.release();
  }
})();
