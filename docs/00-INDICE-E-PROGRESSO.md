# 📋 Índice Geral & Controle de Progresso — v2

> **Leia-me primeiro (para qualquer agente/desenvolvedor):**
> 1. Leia este arquivo e confira a tabela de progresso.
> 2. Leia o doc da etapa correspondente antes de alterar código.
> 3. Execute apenas a próxima etapa pendente.
> 4. Ao concluir, atualize esta tabela com data e resumo.
> 5. **Nunca** faça `git push`/`pull` automaticamente — o envio é manual (GitHub.dev), salvo pedido explícito.

---

## 🗂️ Índice da documentação

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 01 | [01-VISAO-GERAL.md](./01-VISAO-GERAL.md) | Objetivo, regras de negócio, serviços, personas e escopo |
| 02 | [02-ARQUITETURA.md](./02-ARQUITETURA.md) | Stack, estrutura real de pastas, fluxo e deploy |
| 03 | [03-BANCO-DE-DADOS.md](./03-BANCO-DE-DADOS.md) | Schema final implementado no Neon |
| 04 | [04-SEGURANCA.md](./04-SEGURANCA.md) | Sessões, CSRF, Brevo, Google, rate limit |
| 05 | [05-API-REST.md](./05-API-REST.md) | Todos os endpoints implementados |
| 06 | [06-TELAS-FRONTEND.md](./06-TELAS-FRONTEND.md) | Telas e fluxos do front-end |
| 07 | [07-DESIGN-SYSTEM.md](./07-DESIGN-SYSTEM.md) | Tokens reais, tipografia, componentes e logo |
| 08 | [08-PAGAMENTOS-E-WHATSAPP.md](./08-PAGAMENTOS-E-WHATSAPP.md) | Pix Mercado Pago, dinheiro, cartão e notificações |
| 09 | [09-ROADMAP-IMPLEMENTACAO.md](./09-ROADMAP-IMPLEMENTACAO.md) | Ordem de implementação e status |
| 10 | [10-VARIAVEIS-AMBIENTE.md](./10-VARIAVEIS-AMBIENTE.md) | Template de `.env` **sem segredos reais** |
| 11 | [11-MIGRACAO-LEGADO.md](./11-MIGRACAO-LEGADO.md) | Migração dos 135 agendamentos e 4 JSONs legados |
| 12 | [12-OPERACAO-DEPLOY.md](./12-OPERACAO-DEPLOY.md) | Rodar local, banco, testes, Vercel e integrações |

---

## ✅ Controle de progresso

> Legenda: `✅ Concluída` · `🟡 Em andamento` · `⬜ Pendente` · `⛔ Bloqueada`

| Etapa | Descrição | Status | Data | Notas |
|-------|-----------|--------|------|-------|
| 0 | Documentação base (docs 01–10) | ✅ Concluída | 2026-10-20 | 11 arquivos em `docs/` |
| 1 | Setup do projeto + estrutura | ✅ Concluída | 2026-10-20 | `package.json`, `server/`, `public/`, `api/`, `vercel.json` |
| 2 | `.env` e variáveis | ✅ Concluída | 2026-10-20 | Neon, Brevo, WhatsApp, admin, agenda; Google/Pix pendentes de chaves |
| 3 | Neon + schema SQL | ✅ Concluída | 2026-10-20 | 12 tabelas, constraint anti-sobreposição, triggers |
| 4 | Auth (email/senha + Brevo + Google) | ✅ Concluída | 2026-10-20 | Sessão com hash, CSRF, magic code, Google condicional, reset |
| 5 | CRUD de serviços | ✅ Concluída | 2026-10-20 | Público + admin; exclusão vira desativação se houver histórico |
| 6 | Agendamento + pagamento + WhatsApp | ✅ Concluída | 2026-10-20 | Disponibilidade real, cash/cartão/Pix, webhook, fallback wa.me |
| 7 | Admin (back-end) | ✅ Concluída | 2026-10-20 | Dashboard, financeiro, usuários, horários, bloqueios, logs |
| 8 | Design system + tema | ✅ Concluída | 2026-10-20 | Escuro padrão, claro, tokens, componentes, responsivo |
| 9 | Landing page | ✅ Concluída | 2026-10-20 | Conteúdo real, serviços dinâmicos, mapa, versículo |
| 10 | Cadastro/login (front) | ✅ Concluída | 2026-10-20 | Senha, código por e-mail, Google, recuperação |
| 11 | Seleção + confirmação | ✅ Concluída | 2026-10-20 | Calendário de vagas + adicionais opcionais |
| 12 | Pagamento (front) | ✅ Concluída | 2026-10-20 | Dinheiro com troco, cartão, Pix agora/na hora + polling |
| 13 | Painel do usuário | ✅ Concluída | 2026-10-20 | Próximos, histórico, perfil, senha, exclusão LGPD |
| 14 | Painel admin (front) | ✅ Concluída | 2026-10-20 | 10 seções funcionais |
| 15 | Logo + direitos | ✅ Concluída | 2026-10-20 | marca, horizontal, favicon; logo antiga preservada |
| 16 | Testes + deploy | 🟡 Em andamento | 2026-10-20 | 30 testes unitários passando; smoke e deploy dependem de rede liberada |

---

## 📦 Dados legados importados

- **135 agendamentos**: 129 concluídos, 4 confirmados (futuros no momento da importação), 1 cancelado, 1 ausente.
- **10 serviços** ativos (9 legados + Hidratação Capilar).
- **7 horários** de funcionamento (segunda fechada; ter–sex 13:00–20:20; sáb/dom 09:00–20:20).
- **0 bloqueios** (lista legada vazia).
- Valor histórico estimado dos concluídos: **R$ 4.230,00** (sem pagamentos conciliados, conforme regra aprovada).
- Dados originais preservados em `legacy/` e `dados_origem` (JSONB) em cada agendamento.

---

## ⚠️ Observações importantes

1. **Rede corporativa**: a porta 5432 é bloqueada nesta máquina. O sistema usa o driver oficial `@neondatabase/serverless` via WebSocket/HTTPS (443), inclusive na Vercel. Testes que dependem do Neon podem falhar em redes restritas; `npm test` roda 100% local.
2. **Vercel free**: existe **uma única função serverless** (`api/[...slug].js`), dentro do limite do plano gratuito.
3. **Segredos**: `docs/10` foi sanitizado. A chave Brevo e a senha do Neon que estavam expostas devem ser **rotacionadas** antes de publicar o repositório.
4. **Upload**: manual, via GitHub.dev; nenhum push automático foi feito.
5. **Node local**: `C:\Users\isaque.medeiros\Documents\node-v24.21.0-win-x64`.
