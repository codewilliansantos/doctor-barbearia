-- =========================================
-- Doctor Barbearia — Backup completo
-- Gerado em: 2026-06-04T10:41:50.462Z
-- Restauração: psql -U postgres -d <banco> < backup_full.sql
-- =========================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = 'on';

BEGIN;

-- ========================================
-- Tabela: usuarios
-- ========================================
DROP TABLE IF EXISTS "usuarios" CASCADE;
CREATE TABLE "usuarios" (
  "id" integer NOT NULL DEFAULT nextval('usuarios_id_seq'::regclass),
  "nome" character varying(100) NOT NULL,
  "email" character varying(150) NOT NULL,
  "whatsapp" character varying(20),
  "senha_hash" character varying(255) NOT NULL,
  "perfil" character varying(20) DEFAULT 'cliente'::character varying,
  "criado_em" timestamp without time zone DEFAULT now()
);

INSERT INTO "usuarios" ("id", "nome", "email", "whatsapp", "senha_hash", "perfil", "criado_em") VALUES
  (1, 'Luan Parra', 'luan@doctorbarbearia.com', '5512982671917', '$2a$10$pNn3/Qn4Gw.kU9vXeCQnsuYoDL1Glnc4NYBRAB0d7E4YBQvEWZIAu', 'gestor', '2026-05-29T11:20:02.069Z'),
  (7, 'Cliente Teste', 'cliente@teste.com', '11999998888', '$2a$10$9AzK9QtH4Jrxdvz/ELGYnuYSSmrvsrfKe5ZkAXUKdxAigcmNYW49y', 'cliente', '2026-06-04T01:43:42.239Z'),
  (8, 'willian santos', 'williansantos.iccacapava@gmail.com', '12981580939', '$2a$10$T.n88kgNgmBKC4hD06VmoeyL96OQBVudVbW084He5so2eCHh1MAjW', 'cliente', '2026-06-04T02:09:25.477Z');

-- ========================================
-- Tabela: barbeiros
-- ========================================
DROP TABLE IF EXISTS "barbeiros" CASCADE;
CREATE TABLE "barbeiros" (
  "id" integer NOT NULL DEFAULT nextval('barbeiros_id_seq'::regclass),
  "nome" character varying(100) NOT NULL,
  "especialidade" character varying(100),
  "avaliacao" numeric DEFAULT 5.0,
  "total_cortes" integer DEFAULT 0,
  "ativo" boolean DEFAULT true,
  "criado_em" timestamp without time zone DEFAULT now()
);

INSERT INTO "barbeiros" ("id", "nome", "especialidade", "avaliacao", "total_cortes", "ativo", "criado_em") VALUES
  (6, 'Luan Parra', 'Especialista em Degradê', '4.9', 1400, TRUE, '2026-06-03T22:59:34.975Z'),
  (7, 'Braz', 'Mestre em Barba Clássica', '5.0', 2200, TRUE, '2026-06-03T22:59:34.975Z'),
  (8, 'Willian', 'Especialista em Platinado', '4.8', 950, TRUE, '2026-06-04T01:30:00.856Z');

-- ========================================
-- Tabela: servicos
-- ========================================
DROP TABLE IF EXISTS "servicos" CASCADE;
CREATE TABLE "servicos" (
  "id" integer NOT NULL DEFAULT nextval('servicos_id_seq'::regclass),
  "nome" character varying(100) NOT NULL,
  "descricao" character varying(200),
  "duracao_min" integer NOT NULL,
  "preco" numeric NOT NULL,
  "emoji" character varying(10),
  "ativo" boolean DEFAULT true
);

INSERT INTO "servicos" ("id", "nome", "descricao", "duracao_min", "preco", "emoji", "ativo") VALUES
  (1, 'Corte Clássico', 'Tesoura ou máquina', 30, '40.00', '✂️', TRUE),
  (2, 'Corte + Barba', 'Combo completo', 55, '70.00', '🪒', TRUE),
  (3, 'Barba Completa', 'Navalha + toalha quente', 35, '40.00', '🧔', TRUE),
  (4, 'Degradê', 'Low fade, mid fade ou high', 40, '50.00', '💈', TRUE),
  (5, 'Platinado', 'Descoloração profissional', 90, '130.00', '⚡', TRUE),
  (6, 'Sobrancelha', 'Design e aparagem', 15, '20.00', '👁️', TRUE),
  (8, 'Pezinho', 'Acabamento do pescoço', 15, '25.00', '💇', TRUE),
  (7, 'Barboterapia', 'Barba + cabelo com óleos', 45, '55.00', '🧴', TRUE);

-- ========================================
-- Tabela: clientes
-- ========================================
DROP TABLE IF EXISTS "clientes" CASCADE;
CREATE TABLE "clientes" (
  "id" integer NOT NULL DEFAULT nextval('clientes_id_seq'::regclass),
  "nome" character varying(100) NOT NULL,
  "whatsapp" character varying(20) NOT NULL,
  "criado_em" timestamp without time zone DEFAULT now(),
  "data_nascimento" date
);

INSERT INTO "clientes" ("id", "nome", "whatsapp", "criado_em", "data_nascimento") VALUES
  (5, 'Luan Parra', '12981580939', '2026-06-03T18:27:18.737Z', NULL),
  (12, 'Cliente Teste', '11999998888', '2026-06-04T03:09:01.072Z', NULL),
  (4, 'Luan Parra', '5512982671917', '2026-06-03T00:53:19.479Z', NULL),
  (13, 'Visitante Espera', '11955556666', '2026-06-04T03:29:57.875Z', NULL),
  (14, 'Visitante Teste', '11999990001', '2026-06-04T10:31:36.001Z', NULL),
  (15, 'Aguardando', '11999990002', '2026-06-04T10:31:36.150Z', NULL);

-- ========================================
-- Tabela: agendamentos
-- ========================================
DROP TABLE IF EXISTS "agendamentos" CASCADE;
CREATE TABLE "agendamentos" (
  "id" integer NOT NULL DEFAULT nextval('agendamentos_id_seq'::regclass),
  "cliente_id" integer,
  "barbeiro_id" integer,
  "servico_id" integer,
  "data_hora" timestamp without time zone NOT NULL,
  "status" character varying(20) DEFAULT 'confirmado'::character varying,
  "avaliacao" integer,
  "lembrete_enviado" boolean DEFAULT false,
  "observacao" text,
  "criado_em" timestamp without time zone DEFAULT now(),
  "pagamento_status" character varying(20) DEFAULT 'pendente'::character varying,
  "pagamento_metodo" character varying(30),
  "pagamento_ref" character varying(100),
  "pagamento_id" integer,
  "lembrete_24h_enviado" boolean DEFAULT false,
  "retorno_enviado" boolean DEFAULT false,
  "cancelado_em" timestamp without time zone
);

INSERT INTO "agendamentos" ("id", "cliente_id", "barbeiro_id", "servico_id", "data_hora", "status", "avaliacao", "lembrete_enviado", "observacao", "criado_em", "pagamento_status", "pagamento_metodo", "pagamento_ref", "pagamento_id", "lembrete_24h_enviado", "retorno_enviado", "cancelado_em") VALUES
  (20, 12, 7, 1, '2026-06-05T19:00:00.000Z', 'cancelado', NULL, FALSE, NULL, '2026-06-04T03:09:01.072Z', 'pendente', NULL, NULL, NULL, FALSE, FALSE, '2026-06-04T03:09:01.172Z'),
  (21, 13, 6, 1, '2026-06-08T13:00:00.000Z', 'cancelado', NULL, FALSE, NULL, '2026-06-04T03:30:14.708Z', 'pendente', NULL, NULL, NULL, FALSE, FALSE, '2026-06-04T03:28:26.709Z'),
  (22, 14, 6, 1, '2026-06-15T17:00:00.000Z', 'confirmado', NULL, FALSE, NULL, '2026-06-04T10:31:36.001Z', 'pendente', NULL, NULL, NULL, FALSE, FALSE, NULL);

-- ========================================
-- Tabela: configuracoes
-- ========================================
DROP TABLE IF EXISTS "configuracoes" CASCADE;
CREATE TABLE "configuracoes" (
  "id" integer NOT NULL DEFAULT nextval('configuracoes_id_seq'::regclass),
  "barbearia_nome" character varying(100) DEFAULT 'Doctor Barbearia'::character varying,
  "barbearia_telefone" character varying(20),
  "barbearia_endereco" character varying(200),
  "pagseguro_token" text,
  "pagseguro_ativo" boolean DEFAULT false,
  "zapi_instance" character varying(100),
  "zapi_token" character varying(100),
  "zapi_client_token" character varying(100),
  "whatsapp_ativo" boolean DEFAULT false,
  "criado_em" timestamp without time zone DEFAULT now(),
  "atualizado_em" timestamp without time zone DEFAULT now(),
  "lembrete_24h_ativo" boolean DEFAULT true,
  "lembrete_1h_ativo" boolean DEFAULT true,
  "msg_retorno_ativo" boolean DEFAULT true,
  "msg_retorno_dias" integer DEFAULT 15
);

INSERT INTO "configuracoes" ("id", "barbearia_nome", "barbearia_telefone", "barbearia_endereco", "pagseguro_token", "pagseguro_ativo", "zapi_instance", "zapi_token", "zapi_client_token", "whatsapp_ativo", "criado_em", "atualizado_em", "lembrete_24h_ativo", "lembrete_1h_ativo", "msg_retorno_ativo", "msg_retorno_dias") VALUES
  (1, 'Doctor Barbearia', NULL, NULL, NULL, FALSE, NULL, NULL, NULL, FALSE, '2026-06-02T19:10:42.872Z', '2026-06-04T03:09:16.477Z', TRUE, TRUE, TRUE, 15);

-- ========================================
-- Tabela: jornadas
-- ========================================
DROP TABLE IF EXISTS "jornadas" CASCADE;
CREATE TABLE "jornadas" (
  "id" integer NOT NULL DEFAULT nextval('jornadas_id_seq'::regclass),
  "barbeiro_id" integer,
  "dia_semana" smallint NOT NULL,
  "hora_inicio" time without time zone NOT NULL,
  "hora_fim" time without time zone NOT NULL,
  "ativo" boolean DEFAULT true
);

-- (sem dados)

-- ========================================
-- Tabela: encaixes
-- ========================================
DROP TABLE IF EXISTS "encaixes" CASCADE;
CREATE TABLE "encaixes" (
  "id" integer NOT NULL DEFAULT nextval('encaixes_id_seq'::regclass),
  "barbeiro_id" integer,
  "data" date NOT NULL,
  "hora_inicio" time without time zone NOT NULL,
  "hora_fim" time without time zone NOT NULL,
  "motivo" character varying(200),
  "criado_em" timestamp without time zone DEFAULT now()
);

-- (sem dados)

-- ========================================
-- Tabela: lista_espera
-- ========================================
DROP TABLE IF EXISTS "lista_espera" CASCADE;
CREATE TABLE "lista_espera" (
  "id" integer NOT NULL DEFAULT nextval('lista_espera_id_seq'::regclass),
  "cliente_id" integer,
  "servico_id" integer,
  "barbeiro_id" integer,
  "data_desejada" date NOT NULL,
  "periodo" character varying(20) DEFAULT 'qualquer'::character varying,
  "status" character varying(20) DEFAULT 'aguardando'::character varying,
  "notificado_em" timestamp without time zone,
  "criado_em" timestamp without time zone DEFAULT now()
);

INSERT INTO "lista_espera" ("id", "cliente_id", "servico_id", "barbeiro_id", "data_desejada", "periodo", "status", "notificado_em", "criado_em") VALUES
  (4, 15, NULL, 6, '2026-06-15T03:00:00.000Z', 'qualquer', 'aguardando', NULL, '2026-06-04T10:31:36.158Z');

-- ========================================
-- Tabela: pagamentos
-- ========================================
DROP TABLE IF EXISTS "pagamentos" CASCADE;
CREATE TABLE "pagamentos" (
  "id" integer NOT NULL DEFAULT nextval('pagamentos_id_seq'::regclass),
  "agendamento_id" integer,
  "valor" numeric NOT NULL,
  "metodo" character varying(50) DEFAULT 'pix'::character varying,
  "status" character varying(50) DEFAULT 'pendente'::character varying,
  "pagseguro_charge_id" character varying(255),
  "pagseguro_qr_code" text,
  "pagseguro_qr_code_text" text,
  "pagseguro_link" text,
  "paid_at" timestamp without time zone,
  "expires_at" timestamp without time zone,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now()
);

-- (sem dados)

-- ========================================
-- Tabela: pacotes
-- ========================================
DROP TABLE IF EXISTS "pacotes" CASCADE;
CREATE TABLE "pacotes" (
  "id" integer NOT NULL DEFAULT nextval('pacotes_id_seq'::regclass),
  "nome" character varying(120) NOT NULL,
  "descricao" text,
  "preco_total" numeric NOT NULL,
  "sessoes" integer NOT NULL,
  "validade_dias" integer DEFAULT 180,
  "ativo" boolean DEFAULT true,
  "criado_em" timestamp without time zone DEFAULT now()
);

-- (sem dados)

-- ========================================
-- Tabela: pacote_servicos
-- ========================================
DROP TABLE IF EXISTS "pacote_servicos" CASCADE;
CREATE TABLE "pacote_servicos" (
  "id" integer NOT NULL DEFAULT nextval('pacote_servicos_id_seq'::regclass),
  "pacote_id" integer,
  "servico_id" integer,
  "quantidade" integer DEFAULT 1
);

-- (sem dados)

-- ========================================
-- Tabela: cliente_pacotes
-- ========================================
DROP TABLE IF EXISTS "cliente_pacotes" CASCADE;
CREATE TABLE "cliente_pacotes" (
  "id" integer NOT NULL DEFAULT nextval('cliente_pacotes_id_seq'::regclass),
  "cliente_id" integer,
  "pacote_id" integer,
  "sessoes_restantes" integer NOT NULL,
  "sessoes_usadas" integer DEFAULT 0,
  "data_compra" timestamp without time zone DEFAULT now(),
  "data_validade" date,
  "status" character varying(20) DEFAULT 'ativo'::character varying,
  "codigo" character varying(20)
);

-- (sem dados)

-- ========================================
-- Tabela: pacote_usos
-- ========================================
DROP TABLE IF EXISTS "pacote_usos" CASCADE;
CREATE TABLE "pacote_usos" (
  "id" integer NOT NULL DEFAULT nextval('pacote_usos_id_seq'::regclass),
  "cliente_pacote_id" integer,
  "agendamento_id" integer,
  "usado_em" timestamp without time zone DEFAULT now()
);

-- (sem dados)

-- ========================================
-- Tabela: caixa_sessoes
-- ========================================
DROP TABLE IF EXISTS "caixa_sessoes" CASCADE;
CREATE TABLE "caixa_sessoes" (
  "id" integer NOT NULL DEFAULT nextval('caixa_sessoes_id_seq'::regclass),
  "usuario_id" integer,
  "data_abertura" timestamp without time zone DEFAULT now(),
  "data_fechamento" timestamp without time zone,
  "saldo_inicial" numeric DEFAULT 0,
  "saldo_final" numeric,
  "status" character varying(20) DEFAULT 'aberto'::character varying,
  "observacoes" text
);

INSERT INTO "caixa_sessoes" ("id", "usuario_id", "data_abertura", "data_fechamento", "saldo_inicial", "saldo_final", "status", "observacoes") VALUES
  (1, 1, '2026-06-04T10:23:26.460Z', '2026-06-04T10:23:55.291Z', '100.00', '-1180.00', 'fechado', 'Abertura do dia');

-- ========================================
-- Tabela: caixa_movimentacoes
-- ========================================
DROP TABLE IF EXISTS "caixa_movimentacoes" CASCADE;
CREATE TABLE "caixa_movimentacoes" (
  "id" integer NOT NULL DEFAULT nextval('caixa_movimentacoes_id_seq'::regclass),
  "caixa_id" integer,
  "tipo" character varying(20) NOT NULL,
  "categoria" character varying(40),
  "descricao" character varying(200),
  "valor" numeric NOT NULL,
  "forma_pagamento" character varying(30),
  "agendamento_id" integer,
  "conta_pagar_id" integer,
  "conta_receber_id" integer,
  "criado_em" timestamp without time zone DEFAULT now()
);

INSERT INTO "caixa_movimentacoes" ("id", "caixa_id", "tipo", "categoria", "descricao", "valor", "forma_pagamento", "agendamento_id", "conta_pagar_id", "conta_receber_id", "criado_em") VALUES
  (1, 1, 'entrada', 'servico', 'Corte João', '50.00', 'pix', NULL, NULL, NULL, '2026-06-04T10:23:26.481Z'),
  (2, 1, 'saida', 'despesa', 'Material', '30.00', 'dinheiro', NULL, NULL, NULL, '2026-06-04T10:23:26.501Z'),
  (3, 1, 'saida', 'conta_pagar', 'Aluguel', '1500.00', 'pix', NULL, 1, NULL, '2026-06-04T10:23:54.592Z'),
  (4, 1, 'entrada', 'conta_receber', 'Pacote Carlos', '200.00', 'pix', NULL, NULL, 1, '2026-06-04T10:23:54.637Z');

-- ========================================
-- Tabela: contas_pagar
-- ========================================
DROP TABLE IF EXISTS "contas_pagar" CASCADE;
CREATE TABLE "contas_pagar" (
  "id" integer NOT NULL DEFAULT nextval('contas_pagar_id_seq'::regclass),
  "descricao" character varying(200) NOT NULL,
  "fornecedor" character varying(120),
  "categoria" character varying(40),
  "valor" numeric NOT NULL,
  "data_vencimento" date NOT NULL,
  "data_pagamento" date,
  "status" character varying(20) DEFAULT 'pendente'::character varying,
  "forma_pagamento" character varying(30),
  "observacoes" text,
  "criado_em" timestamp without time zone DEFAULT now()
);

INSERT INTO "contas_pagar" ("id", "descricao", "fornecedor", "categoria", "valor", "data_vencimento", "data_pagamento", "status", "forma_pagamento", "observacoes", "criado_em") VALUES
  (2, 'Produtos', NULL, NULL, '300.00', '2026-05-20T03:00:00.000Z', NULL, 'pendente', NULL, NULL, '2026-06-04T10:23:26.587Z'),
  (1, 'Aluguel', 'Imobiliária X', NULL, '1500.00', '2026-06-15T03:00:00.000Z', '2026-06-04T03:00:00.000Z', 'pago', 'pix', NULL, '2026-06-04T10:23:26.566Z');

-- ========================================
-- Tabela: contas_receber
-- ========================================
DROP TABLE IF EXISTS "contas_receber" CASCADE;
CREATE TABLE "contas_receber" (
  "id" integer NOT NULL DEFAULT nextval('contas_receber_id_seq'::regclass),
  "descricao" character varying(200) NOT NULL,
  "cliente_id" integer,
  "valor" numeric NOT NULL,
  "data_vencimento" date NOT NULL,
  "data_recebimento" date,
  "status" character varying(20) DEFAULT 'pendente'::character varying,
  "forma_pagamento" character varying(30),
  "agendamento_id" integer,
  "observacoes" text,
  "criado_em" timestamp without time zone DEFAULT now()
);

INSERT INTO "contas_receber" ("id", "descricao", "cliente_id", "valor", "data_vencimento", "data_recebimento", "status", "forma_pagamento", "agendamento_id", "observacoes", "criado_em") VALUES
  (1, 'Pacote Carlos', NULL, '200.00', '2026-06-20T03:00:00.000Z', '2026-06-04T03:00:00.000Z', 'recebido', 'pix', NULL, NULL, '2026-06-04T10:23:26.611Z');

-- Reativar sequences e constraints
SELECT setval(pg_get_serial_sequence('usuarios', 'id'), COALESCE((SELECT MAX(id) FROM usuarios), 1));
SELECT setval(pg_get_serial_sequence('barbeiros', 'id'), COALESCE((SELECT MAX(id) FROM barbeiros), 1));
SELECT setval(pg_get_serial_sequence('servicos', 'id'), COALESCE((SELECT MAX(id) FROM servicos), 1));
SELECT setval(pg_get_serial_sequence('clientes', 'id'), COALESCE((SELECT MAX(id) FROM clientes), 1));
SELECT setval(pg_get_serial_sequence('agendamentos', 'id'), COALESCE((SELECT MAX(id) FROM agendamentos), 1));
COMMIT;

-- Backup concluído.
