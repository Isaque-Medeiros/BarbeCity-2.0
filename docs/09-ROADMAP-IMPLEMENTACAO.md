# 09 · Roadmap de Implementação — status

## Fases concluídas
| Fase | Entrega | Status |
|---|---|---|
| 0 | Documentação base | ✅ |
| 1 | Setup, pastas, `package.json`, `.env.example`, `vercel.json` | ✅ |
| 2 | Variáveis de ambiente + validação (`config/env.js`) | ✅ |
| 3 | Neon + schema + seed + migração dos JSONs | ✅ |
| 4 | Auth: senha, sessão, CSRF, Brevo, Google condicional, reset | ✅ |
| 5 | Serviços públicos + CRUD admin | ✅ |
| 6 | Agenda, disponibilidade, agendamento, Pix, WhatsApp, e-mails | ✅ |
| 7 | Admin: usuários, agendamentos, financeiro, horários, bloqueios, logs | ✅ |
| 8 | Design system + tema claro/escuro | ✅ |
| 9 | Landing | ✅ |
| 10 | Login/cadastro | ✅ |
| 11 | Seleção + confirmação | ✅ |
| 12 | Pagamento | ✅ |
| 13 | Painel do usuário | ✅ |
| 14 | Painel admin | ✅ |
| 15 | Logo + direitos | ✅ |
| 16 | Testes + deploy | 🟡 |
| 17 | Promoções (serviço/global) + snapshot no agendamento | ✅ |
| 18 | Editor de tema por IA (contrato rígido + sanitizador + preview/reset) | ✅ |
| 19 | Avatar de barbearia + sticker-card no histórico/admin | ✅ |

## O que já foi validado
- [x] Sintaxe de todos os arquivos JS do backend, API e frontend (`node --check`).
- [x] 12 páginas HTML com assets e IDs verificados.
- [x] 30 testes unitários locais (`npm test`): datas/fuso, telefone, dinheiro, validação, regras de migração, 135 registros, ausência de sobreposições.
- [x] Conexão com Neon via WebSocket/HTTPS (rede corporativa bloqueia 5432).
- [x] Migração real: 135 agendamentos, 10 serviços, 7 horários, 0 bloqueios.
- [x] Servidor Express, health check e endpoints públicos responderam no teste parcial.

## Pendente (depende de recursos externos)
- [ ] Rodar `npm run smoke` em rede que permita o Neon (o script já envia `Content-Type` correto).
- [ ] Criar credenciais **Google OAuth** após o deploy.
- [ ] Criar credenciais **Mercado Pago** (Pix) e configurar webhook.
- [ ] Configurar **WhatsApp Cloud API** (opcional; fallback `wa.me` já funciona).
- [ ] Deploy manual no GitHub privado → Vercel; configurar variáveis de ambiente.
- [ ] Domínio próprio e HTTPS.
- [ ] Revisar preços/descrições com o Anderson (especialmente Hidratação Capilar, atualmente R$ 45/40 min).
- [ ] **Rotacionar** a chave Brevo e a senha do Neon que estavam expostas em documentação antiga.

## Critérios de aceite
- [x] Agendamento com e sem login (mesmo fluxo, dados obrigatórios).
- [x] Disponibilidade impede sobreposição (constraint + verificação em transação).
- [x] Admin gerencia serviços/usuários/agendamentos/financeiro.
- [x] Tema claro/escuro persiste e é responsivo.
- [x] Login por senha, código e Google (Google requer chaves).
- [x] Pix “pagar agora” cria cobrança e atualiza por webhook/polling (requer chaves).
- [x] WhatsApp gera mensagem organizada (automático com Cloud API; manual com link).
- [x] Histórico legado importado com regra aprovada.
- [x] Painel do usuário com histórico e cancelamento.
- [x] LGPD: política, consentimento e exclusão de conta.
