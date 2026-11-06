# Deploy — Barbe City Jaraguá

Checklist para publicar na Vercel com segurança.

## 1. Pré-requisitos

- Node.js 20+ (`node -v`)
- Conta na Vercel e CLI: `npm i -g vercel` (ou conectar o repositório Git)
- Banco Neon acessível (`DATABASE_URL`)

## 2. Variáveis de ambiente (Settings → Environment Variables)

**Obrigatórias**

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | conexão com o Neon |
| `SESSION_SECRET` | assinatura do cookie de sessão (valor longo e aleatório) |
| `BASE_URL` | URL pública, ex.: `https://barbe-city-jaragua-eta.vercel.app` |
| `FRONTEND_URL` | mesma URL pública (usada em CORS/links) |
| `NODE_ENV` | `production` |

**Recomendadas**

| Grupo | Variáveis |
|---|---|
| E-mail (Brevo) | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` |
| Google Login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| Pix | `PIX_GATEWAY`, `PIX_ACCESS_TOKEN`, `PIX_PUBLIC_KEY`, `PIX_WEBHOOK_SECRET` |
| WhatsApp | `WHATSAPP_NUMBER`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| IA (tema) | `GEMINI_API_KEYS`, `GEMINI_MODELOS` |
| Agenda | `APP_TIMEZONE`, `BOOKING_SLOT_MINUTES`, `BOOKING_MAX_DIAS` |
| Admin inicial | `ADMIN_NOME`, `ADMIN_EMAIL`, `ADMIN_SENHA`, `OWNER_EMAIL` |

> Nunca comite o `.env`. Ele já está no `.gitignore` e no `.vercelignore`.

## 3. Publicar

```bash
vercel            # preview
vercel --prod     # produção
```

Se preferir Git: crie o repositório, faça o primeiro commit e importe na Vercel.
O `api/index.js` é a única função serverless (recebe `/api/*` via rewrite).

## 4. Depois do deploy — verificação

```bash
# API viva e banco conectado
curl -s https://SEU-DOMINIO/api/health

# cabeçalhos de segurança (CSP, HSTS, X-Frame-Options...)
curl -sI https://SEU-DOMINIO/ | findstr /I "content-security-policy strict-transport x-frame-options permissions-policy"

# cache dos assets versionados
curl -sI https://SEU-DOMINIO/css/v2.css | findstr /I "cache-control"
```

- Abrir `/robots.txt` e `/sitemap.xml`
- Testar login, agendamento completo e consulta no celular
- Conferir a prévia de link no WhatsApp (usa `/assets/og.png`)

## 5. Migrações do banco

Rodar **uma vez** contra o banco de produção, de uma máquina confiável:

```bash
npm run db:migrate
npm run db:seed       # apenas se o banco estiver vazio
npm run db:admin      # cria o administrador inicial
```

## 6. Domínio próprio (quando comprar o `.com`)

1. Vercel → Project → Settings → Domains → adicionar o domínio
2. No registrador, apontar `A`/`CNAME` conforme a Vercel indicar
3. Depois do domínio ativo, atualizar:
   - `canonical`, `og:url`, `og:image` e `twitter:image` em `public/index.html`
   - `public/robots.txt` (linha do `Sitemap`)
   - `public/sitemap.xml` (todas as `<loc>`)
   - `BASE_URL` e `FRONTEND_URL` na Vercel
   - `GOOGLE_REDIRECT_URI` (se usar login Google)

## 7. Rollback

- Vercel → Deployments → escolher o deploy anterior → **Promote to Production**
- Local: `.backup-2026-11-06/` guarda o estado anterior ao redesign
