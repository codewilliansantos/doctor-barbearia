-- Doctor Barbearia — SEED de dados essenciais
-- Execute APÓS as migrations em um banco limpo.
-- Idempotente: usa ON CONFLICT DO NOTHING / WHERE NOT EXISTS onde possível.

BEGIN;

-- ================================================
-- 1) SERVIÇOS padrão
-- ================================================
INSERT INTO servicos (nome, descricao, duracao_min, preco, emoji, ativo) VALUES
  ('Corte Masculino',     'Corte completo na máquina e tesoura, finalização com penteado.', 30, 40.00, '✂', TRUE),
  ('Barba',               'Barba feita na toalha quente, com navalha e produtos premium.', 30, 35.00, '🧔', TRUE),
  ('Corte + Barba',       'Combo completo: corte de cabelo + barba.',                       60, 70.00, '💈', TRUE),
  ('Sobrancelha',         'Design de sobrancelha masculina com pinça e navalha.',          15, 20.00, '👁', TRUE),
  ('Pigmentação',         'Pigmentação capilar e de barba para cobertura de fios brancos.', 45, 80.00, '🎨', TRUE),
  ('Hidratação Capilar',  'Hidratação profunda com máscara e massagem relaxante.',         40, 60.00, '💧', TRUE),
  ('Platinado',           'Descoloração global + tonalização. Inclui tratamento.',         120, 200.00, '⚡', TRUE),
  ('Corte Infantil',      'Corte para crianças de até 10 anos.',                            25, 30.00, '👶', TRUE)
ON CONFLICT (nome) DO NOTHING;

-- ================================================
-- 2) BARBEIROS (apenas Luan, Braz e Willian)
-- ================================================
INSERT INTO barbeiros (nome, whatsapp, bio, foto_url, ativo) VALUES
  ('Luan',    '11987654321', 'Especialista em cortes modernos e degradê. 8 anos de experiência.', '/barbeiros/luan.png',    TRUE),
  ('Braz',    '11987654322', 'Mestre da barba, tradicional e na toalha quente. 15 anos de experiência.', '/barbeiros/braz.png',    TRUE),
  ('Willian', '11987654323', 'Expert em platinado, coloração e cortes criativos. 6 anos de experiência.', '/barbeiros/willian.png', TRUE)
ON CONFLICT DO NOTHING;

-- ================================================
-- 3) USUÁRIOS essenciais
-- ================================================
-- Senha: 'admin123' e '123456' — geradas com bcrypt (hash abaixo já validado).
INSERT INTO usuarios (nome, email, whatsapp, senha_hash, tipo, ativo) VALUES
  ('Luan Gestor', 'luan@doctorbarbearia.com', '11987654321',
   '$2b$10$ZoBgWBcbwjJqdttQOlB3S.f1wsZpQTQVu6oMQ7xC5VHimjPM/Bjce',
   'gestor', TRUE),
  ('Atendente',  'atendente@doctorbarbearia.com', '11987654324',
   '$2b$10$ZoBgWBcbwjJqdttQOlB3S.f1wsZpQTQVu6oMQ7xC5VHimjPM/Bjce',
   'atendente', TRUE),
  ('Cliente Teste', 'cliente@teste.com', '11999998888',
   '$2b$10$ZoBgWBcbwjJqdttQOlB3S.f1wsZpQTQVu6oMQ7xC5VHimjPM/Bjce',
   'cliente', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ================================================
-- 4) CONFIGURAÇÕES padrão
-- ================================================
INSERT INTO configuracoes (id, nome_barbearia, whatsapp_admin, mensagem_boas_vindas, endereco, cidade, horario_funcionamento)
VALUES (1, 'Doctor Barbearia', '11987654321',
        'Olá! 👋 Bem-vindo à Doctor Barbearia. Como podemos ajudar?',
        'Estr. Municipal Martins Guimarães, 129 - Vila Tesouro', 'São José dos Campos - SP, 12221-520',
        'Seg-Sáb 09h-20h')
ON CONFLICT (id) DO NOTHING;

-- Atualiza flags de lembretes com defaults
UPDATE configuracoes SET
  lembrete_24h_ativo = COALESCE(lembrete_24h_ativo, TRUE),
  lembrete_1h_ativo  = COALESCE(lembrete_1h_ativo,  TRUE),
  mensagem_retorno   = COALESCE(mensagem_retorno, 'Oi, {nome}! Sentimos sua falta na Doctor Barbearia 💈 Que tal agendar um horário essa semana?'),
  mensagem_aniversario = COALESCE(mensagem_aniversario, 'Feliz aniversário, {nome}! 🎂 Vem celebrar com a gente na Doctor Barbearia — você tem 15% OFF hoje!')
WHERE id = 1;

-- ================================================
-- 5) JORNADA SEMANAL padrão (todos os dias 09:00-19:00)
-- ================================================
INSERT INTO jornadas (barbeiro_id, dia_semana, hora_inicio, hora_fim, ativo)
SELECT b.id, d, '09:00', '19:00', TRUE
FROM barbeiros b
CROSS JOIN generate_series(0, 6) d
WHERE b.ativo = TRUE
ON CONFLICT DO NOTHING;

-- ================================================
-- 6) PACOTES iniciais
-- ================================================
INSERT INTO pacotes (nome, descricao, total_sessoes, preco_total, ativo)
SELECT * FROM (VALUES
  ('Pacote Corte x5',    '5 cortes pelo preço de 4. Use em até 90 dias.',  5, 160.00, TRUE),
  ('Pacote Barba x5',    '5 barbas pelo preço de 4. Use em até 90 dias.',  5, 140.00, TRUE),
  ('Pacote VIP Mensal',  '4 cortes + 4 barbas no mês. Vip total.',        8, 280.00, TRUE)
) AS p(nome, descricao, total_sessoes, preco_total, ativo)
ON CONFLICT (nome) DO NOTHING;

-- Pacote Corte x5 → 5x Corte Masculino
INSERT INTO pacote_servicos (pacote_id, servico_id, quantidade)
SELECT p.id, s.id, 5
FROM pacotes p, servicos s
WHERE p.nome = 'Pacote Corte x5' AND s.nome = 'Corte Masculino'
ON CONFLICT DO NOTHING;

-- Pacote Barba x5 → 5x Barba
INSERT INTO pacote_servicos (pacote_id, servico_id, quantidade)
SELECT p.id, s.id, 5
FROM pacotes p, servicos s
WHERE p.nome = 'Pacote Barba x5' AND s.nome = 'Barba'
ON CONFLICT DO NOTHING;

-- Pacote VIP Mensal → 4x Corte + 4x Barba
INSERT INTO pacote_servicos (pacote_id, servico_id, quantidade)
SELECT p.id, s.id, 4
FROM pacotes p, servicos s
WHERE p.nome = 'Pacote VIP Mensal' AND s.nome IN ('Corte Masculino', 'Barba')
ON CONFLICT DO NOTHING;

COMMIT;

-- Relatório final
SELECT 'servicos' AS tabela, COUNT(*) AS total FROM servicos
UNION ALL SELECT 'barbeiros', COUNT(*) FROM barbeiros
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL SELECT 'configuracoes', COUNT(*) FROM configuracoes
UNION ALL SELECT 'jornadas', COUNT(*) FROM jornadas
UNION ALL SELECT 'pacotes', COUNT(*) FROM pacotes
UNION ALL SELECT 'pacote_servicos', COUNT(*) FROM pacote_servicos
ORDER BY tabela;
