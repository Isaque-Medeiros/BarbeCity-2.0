# 💈 Barbe City Jaraguá — v2

Sistema de agendamento da barbearia do Anderson, em Jaraguá/SP. Versão remasterizada do site antigo, com banco PostgreSQL (Neon), autenticação, pagamento Pix, painel do cliente e painel administrativo.

## ✨ Funcionalidades
- Landing page com identidade visual premium, serviços dinâmicos, mapa, contato e versículo.
- Agendamento com e sem login, calendário real de disponibilidade e serviços adicionais.
- **Promoções**: desconto por serviço ou global, com período, selo `-X%` e snapshot no histórico.
- **Tema visual por IA**: o dono descreve a decoração, a IA gera uma máscara sanitizada e ele ativa/desfaz com um clique.
- **Avatar de barbearia**: prévia ao vivo conforme os serviços escolhidos e sticker-card no histórico e no painel.
- Pagamento em dinheiro (com troco), cartão e Pix (agora ou na hora).
- Pix via Mercado Pago com QR/copia-e-cola, webhook e polling.
- Login por e-mail/senha, código de 6 dígitos (Brevo) e Google OAuth.
- Área do cliente: próximos horários, histórico, perfil, senha e exclusão LGPD.
- Painel admin: dashboard, agendamentos, serviços, usuários, financeiro, horários, bloqueios, configurações, logs e notificações.
- Tema escuro padrão + claro, responsivo, acessível.
- WhatsApp: envio automático via Cloud API ou link `wa.me` pronto.
- 135 agendamentos históricos importados do sistema anterior.

## 🧰 Stack
- Node.js 24 + Express 4 (ESM)
- PostgreSQL 18 (Neon) com `@neondatabase/serverless`
- HTML/CSS/JS vanilla (ES Modules), sem build
- Brevo, Google OAuth, Mercado Pago, WhatsApp Cloud API (opcionais)
- Vercel (uma única função serverless)

## 🚀 Rodar local
```powershell
cd C:\Users\isaque.medeiros\Desktop\MeusProjetos\Barbecuts
& 'C:\Users\isaque.medeiros\Documents\node-v24.21.0-win-x64\npm.cmd' install
npm run db:setup
npm run dev
```
Acesse `http://localhost:3000` e o painel em `/admin.html` com o admin do `.env`.

## 📜 Scripts
| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor com watch |
| `npm start` | Servidor normal |
| `npm run db:migrate` | Aplica o schema |
| `npm run db:seed` | Admin, serviços, horários, configurações |
| `npm run db:import` | Importa `legacy/*.json` |
| `npm run db:setup` | Migrate + seed + import |
| `npm run db:admin` | Recria o admin do `.env` |
| `npm run db:status` | Status e contagens do banco |
| `npm test` | Testes unitários locais |
| `npm run smoke` | Teste ponta a ponta (rede liberada) |

## 🗂️ Estrutura
```
api/[...slug].js        → única função serverless (Vercel)
server/                 → Express, controllers, services, db, middlewares
public/                 → HTML, CSS, JS, logos e sprite de ícones
legacy/                 → JSONs originais + checksums
docs/                   → documentação 00–12
tests/                  → testes unitários (node:test)
```

## 🔑 Configuração
- Copie `.env.example` para `.env` e preencha.
- `ADMIN_EMAIL`/`ADMIN_SENHA` criam o primeiro administrador.
- Sem Google/Pix/WhatsApp as funcionalidades degradam sem quebrar o site.
- Em produção: `COOKIE_SECURE=true`, `TRUST_PROXY=1`, `NODE_ENV=production` e domínio em `BASE_URL`.

## 📊 Dados importados
- 135 agendamentos (129 concluídos, 4 confirmados, 1 cancelado, 1 ausente).
- 10 serviços (9 legados + Hidratação Capilar).
- 7 horários (segunda fechada; ter–sex 13:00–20:20; sáb/dom 09:00–20:20).
- Valor histórico estimado dos concluídos: R$ 4.230,00, **sem** pagamentos inventados.

> 🔒 **LGPD:** `legacy/agendamentos.json` (e a cópia da raiz) contém nomes e telefones reais de clientes e **não é versionado**. Mantenha o arquivo apenas no seu ambiente local para rodar `npm run db:import`. Sem ele, o import de serviços/horários/bloqueios continua funcionando.

## 🔒 Segurança
- Senhas com bcrypt (cost 12); sessão httpOnly com hash no banco.
- CSRF double-submit, helmet/CSP, rate limits, validação de entrada e SQL parametrizado.
- **Rotacione a chave Brevo e a senha do Neon** que estavam expostas em documentação antiga.
- Nunca commite `.env`.

## ☁️ Deploy
- GitHub privado + Vercel; upload manual, sem push automático.
- Uma única função `api/[...slug].js` (plano gratuito).
- O driver Neon usa WebSocket/HTTPS (443), contornando bloqueios de 5432.
- Passo a passo completo em [`docs/12-OPERACAO-DEPLOY.md`](docs/12-OPERACAO-DEPLOY.md).

## 📚 Documentação
Comece por [`docs/00-INDICE-E-PROGRESSO.md`](docs/00-INDICE-E-PROGRESSO.md). Migração em [`docs/11-MIGRACAO-LEGADO.md`](docs/11-MIGRACAO-LEGADO.md).

## ⚠️ Limitações conhecidas
- Pix online/Google/WhatsApp automático exigem credenciais externas.
- `npm run smoke` depende de rede liberada para o Neon; em rede corporativa pode falhar.
- Fotos reais do espaço ainda não foram adicionadas.
- Preços/descrições (especialmente Hidratação Capilar) devem ser revisados pelo dono.
