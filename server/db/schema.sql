-- ============================================================
-- Barbe City Jaraguá · Schema v2 (Neon PostgreSQL)
-- Execute com: npm run db:migrate
-- Script idempotente: pode rodar várias vezes sem perder dados.
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  senha_hash TEXT,
  telefone TEXT,
  google_id TEXT,
  role TEXT NOT NULL DEFAULT 'cliente',
  email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_role_check CHECK (role IN ('cliente', 'admin'))
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_lower_uidx
  ON usuarios (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_google_id_uidx
  ON usuarios (google_id) WHERE google_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  ultimo_uso_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tokens_login (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'magic_link',
  expira_em TIMESTAMPTZ NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  tentativas INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tokens_login_tipo_check CHECK (tipo IN ('magic_link', 'verificacao_email', 'redefinir_senha'))
);

CREATE INDEX IF NOT EXISTS tokens_login_email_idx ON tokens_login (lower(email));
CREATE INDEX IF NOT EXISTS tokens_login_expira_idx ON tokens_login (expira_em);

CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legado_id INT UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  preco NUMERIC(10, 2) NOT NULL DEFAULT 0,
  duracao_min INT NOT NULL DEFAULT 30,
  categoria TEXT NOT NULL DEFAULT 'individual',
  icone TEXT NOT NULL DEFAULT 'scissors',
  destaque BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT servicos_preco_check CHECK (preco >= 0),
  CONSTRAINT servicos_duracao_check CHECK (duracao_min > 0),
  CONSTRAINT servicos_categoria_check CHECK (categoria IN ('individual', 'combo', 'outros'))
);

CREATE INDEX IF NOT EXISTS servicos_ativo_ordem_idx ON servicos (ativo, ordem);

CREATE TABLE IF NOT EXISTS horarios_funcionamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana SMALLINT NOT NULL UNIQUE,
  abertura TIME NOT NULL,
  fechamento TIME NOT NULL,
  intervalo_min INT NOT NULL DEFAULT 15,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT horarios_dia_check CHECK (dia_semana BETWEEN 0 AND 6),
  CONSTRAINT horarios_intervalo_check CHECK (intervalo_min BETWEEN 5 AND 120),
  CONSTRAINT horarios_horas_check CHECK (ativo = FALSE OR fechamento > abertura)
);

CREATE TABLE IF NOT EXISTS bloqueios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bloqueios_intervalo_check CHECK (fim > inicio)
);

CREATE INDEX IF NOT EXISTS bloqueios_inicio_idx ON bloqueios (inicio);

CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_publico TEXT NOT NULL UNIQUE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
  nome_cliente TEXT NOT NULL,
  email_cliente TEXT,
  telefone_cliente TEXT NOT NULL,
  data_hora_inicio TIMESTAMPTZ NOT NULL,
  data_hora_fim TIMESTAMPTZ NOT NULL,
  duracao_min INT NOT NULL,
  valor_original NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmado',
  observacao TEXT,
  origem TEXT NOT NULL DEFAULT 'site',
  legado_status TEXT,
  dados_origem JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agendamentos_status_check CHECK (status IN ('pendente', 'confirmado', 'concluido', 'cancelado', 'ausente')),
  CONSTRAINT agendamentos_origem_check CHECK (origem IN ('site', 'admin', 'legado')),
  CONSTRAINT agendamentos_intervalo_check CHECK (data_hora_fim > data_hora_inicio),
  CONSTRAINT agendamentos_valores_check CHECK (valor_original >= 0 AND valor_pago >= 0)
);

CREATE INDEX IF NOT EXISTS agendamentos_usuario_idx ON agendamentos (usuario_id);
CREATE INDEX IF NOT EXISTS agendamentos_data_idx ON agendamentos (data_hora_inicio);
CREATE INDEX IF NOT EXISTS agendamentos_status_idx ON agendamentos (status);
CREATE INDEX IF NOT EXISTS agendamentos_telefone_idx ON agendamentos (telefone_cliente);
CREATE INDEX IF NOT EXISTS agendamentos_email_idx ON agendamentos (lower(email_cliente));

-- Impede dois agendamentos ativos no mesmo horário (barbearia com um barbeiro).
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_sem_sobreposicao;
ALTER TABLE agendamentos
  ADD CONSTRAINT agendamentos_sem_sobreposicao
  EXCLUDE USING gist (tstzrange(data_hora_inicio, data_hora_fim, '[)') WITH &&)
  WHERE (status IN ('pendente', 'confirmado'));

CREATE TABLE IF NOT EXISTS agendamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
  nome_snapshot TEXT NOT NULL,
  preco NUMERIC(10, 2) NOT NULL DEFAULT 0,
  duracao_min INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agendamento_itens_unico UNIQUE (agendamento_id, servico_id)
);

CREATE INDEX IF NOT EXISTS agendamento_itens_agendamento_idx ON agendamento_itens (agendamento_id);

CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  metodo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  valor NUMERIC(10, 2) NOT NULL DEFAULT 0,
  nota_dinheiro NUMERIC(10, 2),
  troco_pix BOOLEAN NOT NULL DEFAULT FALSE,
  troco_valor NUMERIC(10, 2),
  pix_codigo TEXT,
  pix_qr_base64 TEXT,
  pix_transacao_id TEXT UNIQUE,
  pix_expiracao TIMESTAMPTZ,
  pagar_agora BOOLEAN NOT NULL DEFAULT FALSE,
  pago_em TIMESTAMPTZ,
  gateway_payload JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pagamentos_metodo_check CHECK (metodo IN ('dinheiro', 'cartao', 'pix', 'legado')),
  CONSTRAINT pagamentos_status_check CHECK (status IN ('pendente', 'pago', 'na_hora', 'falhou', 'estornado')),
  CONSTRAINT pagamentos_valor_check CHECK (valor >= 0)
);

CREATE INDEX IF NOT EXISTS pagamentos_agendamento_idx ON pagamentos (agendamento_id);
CREATE INDEX IF NOT EXISTS pagamentos_status_idx ON pagamentos (status);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descricao TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logs_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id TEXT,
  detalhes JSONB,
  ip TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS logs_admin_criado_idx ON logs_admin (criado_em DESC);

CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID REFERENCES agendamentos(id) ON DELETE CASCADE,
  canal TEXT NOT NULL,
  destino TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  assunto TEXT,
  mensagem TEXT,
  link_wa TEXT,
  erro TEXT,
  payload JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_em TIMESTAMPTZ,
  CONSTRAINT notificacoes_canal_check CHECK (canal IN ('whatsapp', 'email')),
  CONSTRAINT notificacoes_status_check CHECK (status IN ('pendente', 'enviado', 'falhou', 'link_gerado'))
);

CREATE INDEX IF NOT EXISTS notificacoes_agendamento_idx ON notificacoes (agendamento_id);
CREATE INDEX IF NOT EXISTS notificacoes_criado_idx ON notificacoes (criado_em DESC);

-- ============================================================
-- Promoções (desconto por serviço ou global)
-- ============================================================
CREATE TABLE IF NOT EXISTS promocoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotulo TEXT NOT NULL,
  percentual NUMERIC(5, 2) NOT NULL,
  servico_id UUID REFERENCES servicos(id) ON DELETE CASCADE,
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT promocoes_percentual_check CHECK (percentual > 0 AND percentual <= 90),
  CONSTRAINT promocoes_janela_check CHECK (fim IS NULL OR fim > inicio)
);

CREATE INDEX IF NOT EXISTS promocoes_ativas_idx ON promocoes (ativo, servico_id, inicio, fim);

-- ============================================================
-- Tema visual gerado por IA (apenas 1 ativo por vez)
-- ============================================================
CREATE TABLE IF NOT EXISTS temas_site (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'ambos',
  html TEXT NOT NULL DEFAULT '',
  css TEXT NOT NULL DEFAULT '',
  resumo TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  modelo TEXT,
  criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ativado_em TIMESTAMPTZ,
  CONSTRAINT temas_site_status_check CHECK (status IN ('rascunho', 'ativo', 'arquivado')),
  CONSTRAINT temas_site_area_check CHECK (area IN ('faixa_topo', 'card_landing', 'ambos'))
);

CREATE UNIQUE INDEX IF NOT EXISTS temas_site_ativo_uidx ON temas_site (status) WHERE status = 'ativo';

-- ============================================================
-- Avatar dos serviços e snapshot comercial dos agendamentos
-- ============================================================
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS avatar_traits JSONB;

ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS valor_desconto NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promocao_rotulo TEXT,
  ADD COLUMN IF NOT EXISTS promocao_detalhes JSONB,
  ADD COLUMN IF NOT EXISTS avatar JSONB;

-- ============================================================
-- Trigger genérica de atualizado_em
-- ============================================================
CREATE OR REPLACE FUNCTION fn_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_atualizado ON usuarios;
CREATE TRIGGER trg_usuarios_atualizado BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION fn_atualizado_em();

DROP TRIGGER IF EXISTS trg_servicos_atualizado ON servicos;
CREATE TRIGGER trg_servicos_atualizado BEFORE UPDATE ON servicos
  FOR EACH ROW EXECUTE FUNCTION fn_atualizado_em();

DROP TRIGGER IF EXISTS trg_agendamentos_atualizado ON agendamentos;
CREATE TRIGGER trg_agendamentos_atualizado BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION fn_atualizado_em();

DROP TRIGGER IF EXISTS trg_pagamentos_atualizado ON pagamentos;
CREATE TRIGGER trg_pagamentos_atualizado BEFORE UPDATE ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION fn_atualizado_em();

DROP TRIGGER IF EXISTS trg_configuracoes_atualizado ON configuracoes;
CREATE TRIGGER trg_configuracoes_atualizado BEFORE UPDATE ON configuracoes
  FOR EACH ROW EXECUTE FUNCTION fn_atualizado_em();
