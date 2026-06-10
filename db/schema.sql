-- Doctor Barbearia - Schema exportado em 2026-06-04T10:32:39.707Z


-- =====================================
-- Tabela: agendamentos
-- =====================================
CREATE TABLE IF NOT EXISTS agendamentos (
  id integer NOT NULL DEFAULT nextval('agendamentos_id_seq'::regclass),
  cliente_id integer,
  barbeiro_id integer,
  servico_id integer,
  data_hora timestamp without time zone NOT NULL,
  status character varying(20) DEFAULT 'confirmado'::character varying,
  avaliacao integer,
  lembrete_enviado boolean DEFAULT false,
  observacao text,
  criado_em timestamp without time zone DEFAULT now(),
  pagamento_status character varying(20) DEFAULT 'pendente'::character varying,
  pagamento_metodo character varying(30),
  pagamento_ref character varying(100),
  pagamento_id integer,
  lembrete_24h_enviado boolean DEFAULT false,
  retorno_enviado boolean DEFAULT false,
  cancelado_em timestamp without time zone
);

-- =====================================
-- Tabela: barbeiros
-- =====================================
CREATE TABLE IF NOT EXISTS barbeiros (
  id integer NOT NULL DEFAULT nextval('barbeiros_id_seq'::regclass),
  nome character varying(100) NOT NULL,
  especialidade character varying(100),
  avaliacao numeric DEFAULT 5.0,
  total_cortes integer DEFAULT 0,
  ativo boolean DEFAULT true,
  criado_em timestamp without time zone DEFAULT now()
);

-- =====================================
-- Tabela: caixa_movimentacoes
-- =====================================
CREATE TABLE IF NOT EXISTS caixa_movimentacoes (
  id integer NOT NULL DEFAULT nextval('caixa_movimentacoes_id_seq'::regclass),
  caixa_id integer,
  tipo character varying(20) NOT NULL,
  categoria character varying(40),
  descricao character varying(200),
  valor numeric NOT NULL,
  forma_pagamento character varying(30),
  agendamento_id integer,
  conta_pagar_id integer,
  conta_receber_id integer,
  criado_em timestamp without time zone DEFAULT now()
);

-- =====================================
-- Tabela: cliente_pacotes
-- =====================================
CREATE TABLE IF NOT EXISTS cliente_pacotes (
  id integer NOT NULL DEFAULT nextval('cliente_pacotes_id_seq'::regclass),
  cliente_id integer,
  pacote_id integer,
  sessoes_restantes integer NOT NULL,
  sessoes_usadas integer DEFAULT 0,
  data_compra timestamp without time zone DEFAULT now(),
  data_validade date,
  status character varying(20) DEFAULT 'ativo'::character varying,
  codigo character varying(20)
);

-- =====================================
-- Tabela: clientes
-- =====================================
CREATE TABLE IF NOT EXISTS clientes (
  id integer NOT NULL DEFAULT nextval('clientes_id_seq'::regclass),
  nome character varying(100) NOT NULL,
  whatsapp character varying(20) NOT NULL,
  criado_em timestamp without time zone DEFAULT now(),
  data_nascimento date
);

-- =====================================
-- Tabela: configuracoes
-- =====================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id integer NOT NULL DEFAULT nextval('configuracoes_id_seq'::regclass),
  barbearia_nome character varying(100) DEFAULT 'Doctor Barbearia'::character varying,
  barbearia_telefone character varying(20),
  barbearia_endereco character varying(200),
  pagseguro_token text,
  pagseguro_ativo boolean DEFAULT false,
  zapi_instance character varying(100),
  zapi_token character varying(100),
  zapi_client_token character varying(100),
  whatsapp_ativo boolean DEFAULT false,
  criado_em timestamp without time zone DEFAULT now(),
  atualizado_em timestamp without time zone DEFAULT now(),
  lembrete_24h_ativo boolean DEFAULT true,
  lembrete_1h_ativo boolean DEFAULT true,
  msg_retorno_ativo boolean DEFAULT true,
  msg_retorno_dias integer DEFAULT 15
);

-- =====================================
-- Tabela: contas_pagar
-- =====================================
CREATE TABLE IF NOT EXISTS contas_pagar (
  id integer NOT NULL DEFAULT nextval('contas_pagar_id_seq'::regclass),
  descricao character varying(200) NOT NULL,
  fornecedor character varying(120),
  categoria character varying(40),
  valor numeric NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status character varying(20) DEFAULT 'pendente'::character varying,
  forma_pagamento character varying(30),
  observacoes text,
  criado_em timestamp without time zone DEFAULT now()
);

-- =====================================
-- Tabela: contas_receber
-- =====================================
CREATE TABLE IF NOT EXISTS contas_receber (
  id integer NOT NULL DEFAULT nextval('contas_receber_id_seq'::regclass),
  descricao character varying(200) NOT NULL,
  cliente_id integer,
  valor numeric NOT NULL,
  data_vencimento date NOT NULL,
  data_recebimento date,
  status character varying(20) DEFAULT 'pendente'::character varying,
  forma_pagamento character varying(30),
  agendamento_id integer,
  observacoes text,
  criado_em timestamp without time zone DEFAULT now()
);

-- =====================================
-- Tabela: encaixes
-- =====================================
CREATE TABLE IF NOT EXISTS encaixes (
  id integer NOT NULL DEFAULT nextval('encaixes_id_seq'::regclass),
  barbeiro_id integer,
  data date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fim time without time zone NOT NULL,
  motivo character varying(200),
  criado_em timestamp without time zone DEFAULT now()
);

-- =====================================
-- Tabela: jornadas
-- =====================================
CREATE TABLE IF NOT EXISTS jornadas (
  id integer NOT NULL DEFAULT nextval('jornadas_id_seq'::regclass),
  barbeiro_id integer,
  dia_semana smallint NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fim time without time zone NOT NULL,
  ativo boolean DEFAULT true
);

-- =====================================
-- Tabela: lista_espera
-- =====================================
CREATE TABLE IF NOT EXISTS lista_espera (
  id integer NOT NULL DEFAULT nextval('lista_espera_id_seq'::regclass),
  cliente_id integer,
  servico_id integer,
  barbeiro_id integer,
  data_desejada date NOT NULL,
  periodo character varying(20) DEFAULT 'qualquer'::character varying,
  status character varying(20) DEFAULT 'aguardando'::character varying,
  notificado_em timestamp without time zone,
  criado_em timestamp without time zone DEFAULT now()
);

-- =====================================
-- Tabela: pacote_servicos
-- =====================================
CREATE TABLE IF NOT EXISTS pacote_servicos (
  id integer NOT NULL DEFAULT nextval('pacote_servicos_id_seq'::regclass),
  pacote_id integer,
  servico_id integer,
  quantidade integer DEFAULT 1
);

-- =====================================
-- Tabela: pacote_usos
-- =====================================
CREATE TABLE IF NOT EXISTS pacote_usos (
  id integer NOT NULL DEFAULT nextval('pacote_usos_id_seq'::regclass),
  cliente_pacote_id integer,
  agendamento_id integer,
  usado_em timestamp without time zone DEFAULT now()
);

-- =====================================
-- Tabela: pacotes
-- =====================================
CREATE TABLE IF NOT EXISTS pacotes (
  id integer NOT NULL DEFAULT nextval('pacotes_id_seq'::regclass),
  nome character varying(120) NOT NULL,
  descricao text,
  preco_total numeric NOT NULL,
  sessoes integer NOT NULL,
  validade_dias integer DEFAULT 180,
  ativo boolean DEFAULT true,
  criado_em timestamp without time zone DEFAULT now()
);

-- =====================================
-- Tabela: pagamentos
-- =====================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id integer NOT NULL DEFAULT nextval('pagamentos_id_seq'::regclass),
  agendamento_id integer,
  valor numeric NOT NULL,
  metodo character varying(50) DEFAULT 'pix'::character varying,
  status character varying(50) DEFAULT 'pendente'::character varying,
  pagseguro_charge_id character varying(255),
  pagseguro_qr_code text,
  pagseguro_qr_code_text text,
  pagseguro_link text,
  paid_at timestamp without time zone,
  expires_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- =====================================
-- Tabela: servicos
-- =====================================
CREATE TABLE IF NOT EXISTS servicos (
  id integer NOT NULL DEFAULT nextval('servicos_id_seq'::regclass),
  nome character varying(100) NOT NULL,
  descricao character varying(200),
  duracao_min integer NOT NULL,
  preco numeric NOT NULL,
  emoji character varying(10),
  ativo boolean DEFAULT true
);
