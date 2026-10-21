# 03 · Banco de Dados (Neon PostgreSQL) — implementado

> Schema real: [`server/db/schema.sql`](../server/db/schema.sql).
> Conexão: driver `@neondatabase/serverless` (WebSocket/HTTPS na porta 443), pois a rede local corporativa bloqueia a 5432.

## 1. Visão geral

- PostgreSQL 18 (Neon), banco `neondb`.
- IDs `UUID` (`gen_random_uuid()`), datas `TIMESTAMPTZ` (UTC).
- `lista de serviços`, horários e bloqueios são dinâmicos (admin).
- Integridade: FKs, CHECKs, índices, triggers de `atualizado_em`.

## 2. Tabelas

### `usuarios`
`id`, `nome`, `email` (único por `lower(email)`), `senha_hash`, `telefone`, `google_id` (único), `role` (`cliente|admin`), `email_verificado`, `ativo`, `ultimo_login_em`, `criado_em`, `atualizado_em`.

### `sessoes`
Sessão via cookie httpOnly. O banco **não guarda o token em claro**: `token_hash` (SHA-256), `usuario_id`, `expira_em`, `ultimo_uso_em`, `criado_em`.

### `tokens_login`
Códigos de 6 dígitos com hash, `email`, `usuario_id`, `tipo` (`magic_link|verificacao_email|redefinir_senha`), `expira_em` (15 min), `usado`, `tentativas` (máx. 5).

### `servicos`
`id`, `legado_id` (único, mapeia ids 6/7/9/10/11/14/15/16/17), `slug`, `nome`, `descricao`, `preco`, `duracao_min`, `categoria` (`individual|combo|outros`), `icone`, `destaque`, `ativo`, `ordem`, `avatar_traits` (JSONB, opcional: `cabelo|barba|sobrancelha|luzes|tratamento`), timestamps.

### `agendamentos`
`id`, `codigo_publico` (único, 10 hex), `usuario_id` (opcional), `servico_id`, `nome_cliente`, `email_cliente`, `telefone_cliente` (E.164), `data_hora_inicio/fim`, `duracao_min`, `valor_original`, `valor_desconto`, `promocao_rotulo`, `promocao_detalhes` (JSONB), `avatar` (JSONB), `valor_pago`, `status`, `observacao`, `origem` (`site|admin|legado`), `legado_status`, `dados_origem` (JSONB), timestamps.

- Status: `pendente`, `confirmado`, `concluido`, `cancelado`, `ausente`.
- **Constraint de exclusão GiST** impede dois agendamentos ativos sobrepostos:
  ```sql
  EXCLUDE USING gist (tstzrange(data_hora_inicio, data_hora_fim, '[)') WITH &&)
  WHERE (status IN ('pendente', 'confirmado'));
  ```
- `dados_origem` preserva o JSON legado integral.

### `agendamento_itens`
Serviços extras do agendamento: `agendamento_id`, `servico_id`, snapshots de nome/preço/duração; único por par.

### `pagamentos`
`agendamento_id`, `metodo` (`dinheiro|cartao|pix|legado`), `status` (`pendente|pago|na_hora|falhou|estornado`), `valor`, `nota_dinheiro`, `troco_pix`, `troco_valor`, `pix_codigo`, `pix_qr_base64`, `pix_transacao_id` (único), `pix_expiracao`, `pagar_agora`, `pago_em`, `gateway_payload`, timestamps.

### `promocoes`
`id`, `rotulo`, `percentual` (1–90), `servico_id` (nulo = todos os serviços), `inicio`, `fim` (opcional), `ativo`, `criado_por`, `criado_em`.

- Regra: promoção do serviço vence a global; empate pelo maior percentual e depois pela mais recente.
- O valor final é calculado no servidor (`server/utils/promocoes.js`) e fotografado em `agendamentos.valor_desconto/promocao_detalhes`, então mudar ou encerrar a promoção não altera o histórico.

### `temas_site`
`id`, `prompt`, `area` (`faixa_topo|card_landing|ambos`), `html`, `css`, `resumo`, `status` (`rascunho|ativo|arquivado`), `modelo`, `criado_por`, `criado_em`, `ativado_em`.

- Índice único parcial `temas_site_ativo_uidx` garante **um único tema ativo**.
- HTML/CSS passam pelo sanitizador (`server/utils/tema.js`) antes de serem gravados.

### `horarios_funcionamento`
`dia_semana` (`0=domingo … 6=sábado`, único), `abertura`, `fechamento`, `intervalo_min`, `ativo`. Regra: dia inativo pode ter `00:00–00:00`; ativo exige fechamento > abertura.

### `bloqueios`
`inicio`, `fim`, `motivo`, `criado_por`; CHECK `fim > inicio`.

### `configuracoes`
`chave` (PK), `valor` (TEXT), `descricao`, `atualizado_em`. Guarda nome, slogan, endereço, contato, horário textual, mapa, versículo, aviso etc.

### `logs_admin`
`admin_id`, `acao`, `entidade`, `entidade_id`, `detalhes` (JSONB), `ip`, `criado_em`.

### `notificacoes`
`agendamento_id`, `canal` (`whatsapp|email`), `destino`, `status` (`pendente|enviado|falhou|link_gerado`), `assunto`, `mensagem`, `link_wa`, `erro`, `payload`, `enviado_em`.

## 3. Índices principais

```sql
usuarios_email_lower_uidx, usuarios_google_id_uidx
servicos_ativo_ordem_idx
agendamentos_usuario_idx, agendamentos_data_idx, agendamentos_status_idx,
agendamentos_telefone_idx, agendamentos_email_idx
agendamento_itens_agendamento_idx
pagamentos_agendamento_idx, pagamentos_status_idx
bloqueios_inicio_idx
tokens_login_email_idx, tokens_login_expira_idx
logs_admin_criado_idx
notificacoes_agendamento_idx, notificacoes_criado_idx
```

## 4. Regras de status

| Contexto | Valores |
|---|---|
| Agendamento | `pendente`, `confirmado`, `concluido`, `cancelado`, `ausente` |
| Pagamento | `pendente`, `pago`, `na_hora`, `falhou`, `estornado` |
| Usuário | `cliente`, `admin` |
| Origem | `site`, `admin`, `legado` |

## 5. Migração legada

O mapeamento completo está em [11-MIGRACAO-LEGADO.md](./11-MIGRACAO-LEGADO.md). Resumo:

- Serviço legado → `servicos.legado_id`.
- `agendado` no passado → `concluido`; no futuro → `confirmado`.
- `ausente` e `cancelado` preservados.
- `hash_id` → `codigo_publico`.
- Datas locais (America/Sao_Paulo) → UTC.
- Telefones normalizados para E.164 (`55…`).
- Nenhum pagamento histórico inventado.

## 6. Operação

```bash
npm run db:migrate   # schema idempotente
npm run db:seed      # admin, serviços, horários, configurações
npm run db:import    # JSONs de legacy/
npm run db:setup     # os três acima, em ordem
npm run db:status    # contagens e próximos agendamentos
```
