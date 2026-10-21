# 02 · Arquitetura do Sistema

## 1. Decisão de arquitetura

O sistema precisa de **dois lados**:

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| **Front-end** | HTML + CSS + JavaScript (vanilla) | Interface, tema claro/escuro, responsividade |
| **Back-end (API REST)** | Node.js + Express | Guardar segredos, conectar no Neon, Brevo, Pix e WhatsApp |

> **Por que precisamos de back-end?**
> Chaves de API (Brevo, Google, Pix, banco) **não podem ficar no front-end** — ficariam expostas no navegador. Tudo que é sensível fica em variáveis de ambiente (`.env`) lidas pelo servidor Node.

## 2. Fluxo de dados (visão macro)

```
Navegador (Cliente/Admin)
        │  HTTP (REST, cookies de sessão)
        ▼
  API Node.js (Express)
   ├── Autenticação (Brevo token / Google OAuth / senha bcrypt)
   ├── Validação + Regras de negócio
   ├── Pagamento (API Pix → webhook de confirmação)
   ├── Notificação WhatsApp (via API/wa.me)
   └── Banco de dados
        │
        ▼
  Neon PostgreSQL
```

## 3. Estrutura de pastas (proposta)

```
Barbecuts/
├── .env                      ← segredos (NUNCA commitados no GitHub)
├── .env.example              ← template sem segredos (pode commitar)
├── .gitignore
├── package.json
├── README.md
├── docs/                     ← esta documentação
│
├── server/                   ← BACK-END (Node.js)
│   ├── index.js              ← entrypoint do servidor
│   ├── app.js                ← configuração do Express
│   ├── config/
│   │   ├── env.js            ← carrega e valida .env
│   │   └── db.js             ← pool de conexão Neon (pg)
│   ├── middlewares/
│   │   ├── auth.js           ← valida sessão/cookie
│   │   ├── csrf.js
│   │   └── rateLimit.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── services.routes.js
│   │   ├── bookings.routes.js
│   │   ├── payments.routes.js
│   │   ├── user.routes.js
│   │   └── admin.routes.js
│   ├── controllers/
│   ├── services/
│   │   ├── brevo.service.js
│   │   ├── google.service.js
│   │   ├── pix.service.js
│   │   └── whatsapp.service.js
│   └── utils/
│
└── public/                   ← FRONT-END (servido pela Vercel ou pelo Express)
    ├── index.html            ← Landing
    ├── cadastro.html
    ├── login.html
    ├── servicos.html
    ├── confirmacao.html
    ├── pagamento.html
    ├── usuario.html
    ├── admin.html
    ├── css/
    │   ├── tokens.css        ← variáveis de tema (claro/escuro)
    │   ├── base.css
    │   └── components.css
    ├── js/
    │   ├── theme.js          ← toggle claro/escuro
    │   ├── api.js            ← helper de fetch
    │   └── ... (por página)
    └── assets/
        ├── logo.svg
        └── icons/
```

## 4. Deploy

### GitHub
- Repositório **privado** em conta dedicada à barbearia.
- Upload **manual**: copiar os arquivos da pasta e colar no GitHub.dev (VS Code web) → commit.
- **Não** automatizar push/pull.

### Vercel
- Hospeda o front (e pode hospedar as serverless functions do Node, se quiser unificar).
- Domínio gratuito `.vercel.app` primeiro; depois domínio próprio pago.

### Neon PostgreSQL
- Banco serverless Postgres.
- Connection string em `.env`.

## 5. Node.js local
- Caminho do executável: `C:\Users\isaque.medeiros\Documents\node-v24.21.0-win-x64`.
- Comandos de exemplo (ajustar ao PATH):
  - Verificar versão: `"C:\Users\isaque.medeiros\Documents\node-v24.21.0-win-x64\node.exe" -v`
  - Instalar deps: `"C:\...\npm.cmd" install`
  - Rodar servidor: `"C:\...\node.exe" server/index.js`

## 6. Dependências sugeridas (back-end)
- `express` — servidor HTTP/rotas.
- `pg` — driver PostgreSQL (Neon).
- `bcrypt` — hash de senha.
- `jsonwebtoken` (opcional) ou sessões com cookie httpOnly.
- `cookie-parser` — leitura de cookies.
- `dotenv` — carregar `.env`.
- `cors` — controle de origem.
- `helmet` — cabeçalhos de segurança.
- `express-rate-limit` — limite de requisições.
- `@googleapis/oauth2` ou `google-auth-library` — Google OAuth.

---

## 7. Estrutura real implementada

```
Barbecuts/
├── api/[...slug].js          ← única função serverless da Vercel
├── server/
│   ├── index.js · app.js
│   ├── config/{env.js,db.js}   ← Neon serverless (WebSocket/443)
│   ├── db/{schema.sql,migrate.js,seed.js,import-legado.js,legado.js}
│   ├── middlewares/{auth,csrf,rateLimit,errors}.js
│   ├── controllers/{auth,servicos,agendamentos,pagamentos,usuario,admin.*,config}.js
│   ├── services/{agenda,agendamentos,notificacoes,brevo,google,pix,tokens,whatsapp}.js
│   ├── routes/*.routes.js
│   ├── scripts/{db-status,smoke,criar-admin,check-html}.js
│   └── utils/{datas,dinheiro,telefone,validacao,senha,codigos,http,serializadores}.js
├── public/
│   ├── *.html (12 páginas)
│   ├── css/{tokens,base,components}.css
│   ├── js/{api,core,layout,ui,...}.js
│   └── assets/{logo*.svg,favicon.svg,icons/sprite.svg}
├── legacy/ · docs/ · tests/
└── vercel.json
```

## 8. Decisões técnicas v2
- **Driver Neon serverless** em vez de `pg`: a rede local bloqueia 5432; WebSocket/HTTPS funciona e é o modo recomendado na Vercel.
- **Uma função catch-all** (`api/[...slug].js`) para respeitar o plano gratuito da Vercel.
- **Front multipágina sem build**: HTML/CSS/ES Modules servidos por Express localmente e pela Vercel em produção.
- **Transações** para criação de agendamento, pagamento, exclusão e conciliação.
- **Constraint de exclusão** no banco como última barreira contra overbooking.

- `axios`/`node-fetch` — chamadas HTTP (Brevo, Pix, WhatsApp).
