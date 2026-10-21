# 10 · Variáveis de Ambiente

> ⚠️ **Este documento foi sanitizado.** Nunca cole chaves reais em arquivos versionados.
> O `.env` local já contém os valores reais e está no `.gitignore`.
> Copie o bloco abaixo para `.env` e edite apenas os valores.

```env
# ─────────────────────────────────────────────
# SERVIDOR
# ─────────────────────────────────────────────
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
TRUST_PROXY=0

# ─────────────────────────────────────────────
# BANCO DE DADOS (Neon PostgreSQL)
# ─────────────────────────────────────────────
DATABASE_URL=postgresql://USUARIO:SENHA@HOST/neondb?sslmode=require

# ─────────────────────────────────────────────
# SESSÃO / COOKIES
# ─────────────────────────────────────────────
SESSION_SECRET=troque-por-uma-string-aleatoria-com-64-caracteres
SESSION_DAYS=30
COOKIE_SECURE=false

# ─────────────────────────────────────────────
# BREVO (e-mail transacional / código de acesso)
# ─────────────────────────────────────────────
BREVO_API_KEY=
BREVO_SENDER_EMAIL=contato@seudominio.com
BREVO_SENDER_NAME=Barbe City Jaraguá

# ─────────────────────────────────────────────
# GOOGLE OAUTH (preencher depois de subir o site)
# ─────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# ─────────────────────────────────────────────
# PAGAMENTO PIX — MERCADO PAGO
# ─────────────────────────────────────────────
PIX_GATEWAY=mercadopago
PIX_ACCESS_TOKEN=
PIX_PUBLIC_KEY=
PIX_WEBHOOK_SECRET=

# ─────────────────────────────────────────────
# WHATSAPP
# WHATSAPP_NUMBER: dono, com DDI+DDD, só dígitos
# WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID: Cloud API (opcional)
# ─────────────────────────────────────────────
WHATSAPP_NUMBER=5511915040871
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# ─────────────────────────────────────────────
# GEMINI · EDITOR DE TEMA POR IA (opcional)
# A cota é por PROJETO, não por chave. Use chaves de projetos/contas
# diferentes para a rotação realmente aumentar o limite.
# Sem GEMINI_API_KEYS o botão "Gerar tema" fica desabilitado.
# ─────────────────────────────────────────────
GEMINI_API_KEYS=
GEMINI_MODELOS=gemini-2.5-flash,gemini-2.5-flash-lite
GEMINI_TIMEOUT_MS=40000
GEMINI_MAX_KEYS_PER_REQUEST=3
GEMINI_COOLDOWN_MIN=5
GEMINI_MAX_TOKENS=4096

# ─────────────────────────────────────────────
# ADMINISTRADOR INICIAL
# ─────────────────────────────────────────────
ADMIN_NOME=Anderson
ADMIN_EMAIL=admin@seudominio.com
ADMIN_SENHA=troque-esta-senha
OWNER_EMAIL=admin@seudominio.com

# ─────────────────────────────────────────────
# AGENDA
# ─────────────────────────────────────────────
APP_TIMEZONE=America/Sao_Paulo
BOOKING_SLOT_MINUTES=15
BOOKING_MAX_DIAS=60

# ─────────────────────────────────────────────
# DADOS DA BARBEARIA (fallback)
# ─────────────────────────────────────────────
BARBEARIA_NOME=Barbe City Jaraguá
BARBEARIA_TELEFONE=(11) 91504-0871
BARBEARIA_ENDERECO=R. Jairo de Almeida Machado, 220 - Jaraguá, São Paulo - SP
```

## 1. Obrigatórias
| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão Neon (o driver remove `channel_binding` automaticamente) |
| `SESSION_SECRET` | Assinatura/segredo de sessão (mín. 32 caracteres) |
| `ADMIN_EMAIL` + `ADMIN_SENHA` | Criação do admin no `db:seed` |

## 2. Onde obter
| Variável | Onde |
|---|---|
| `DATABASE_URL` | Neon → Connection string (pooled) |
| `BREVO_API_KEY` | Brevo → SMTP & API → API Keys |
| `BREVO_SENDER_EMAIL` | Brevo → Senders (e-mail verificado) |
| `GOOGLE_CLIENT_ID/SECRET` | Google Cloud Console → OAuth 2.0 |
| `PIX_ACCESS_TOKEN` | Mercado Pago → Credenciais de produção |
| `PIX_WEBHOOK_SECRET` | Mercado Pago → Webhooks → assinatura secreta |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Meta for Developers → WhatsApp Cloud API |

## 3. Produção (Vercel)
- `NODE_ENV=production`
- `BASE_URL=https://seudominio.com`
- `FRONTEND_URL=https://seudominio.com`
- `COOKIE_SECURE=true`
- `TRUST_PROXY=1`
- `GOOGLE_REDIRECT_URI=https://seudominio.com/api/auth/google/callback`
- `APP_TIMEZONE=America/Sao_Paulo`

## 4. Segurança
- **Rotacione** a chave Brevo e a senha do Neon usadas durante o desenvolvimento (elas apareceram em versões antigas da documentação).
- Nunca commite `.env`.
- Use valores diferentes para `SESSION_SECRET` em produção.
- O admin inicial definido em `ADMIN_SENHA` deve ser trocado após o primeiro login (`/usuario.html` → Senha).

## 5. Observações
- Sem `BREVO_API_KEY`, login por código e e-mails ficam desabilitados, mas senha/Google continuam.
- Sem `PIX_ACCESS_TOKEN`, Pix online fica desabilitado; o cliente pode pagar no local.
- Sem `GOOGLE_CLIENT_ID/SECRET`, o botão Google é exibido com aviso de indisponível (ou oculto pela flag `googleAtivo`).
- Sem `WHATSAPP_TOKEN`, o sistema gera link `wa.me` para envio manual.
