# 04 · Segurança (REST + Cookies + Auth)

## 1. Princípios
- **Nunca** expor segredos no front-end. Tudo sensível vive no `.env` (back-end).
- Autenticação via **cookie de sessão httpOnly** (mais seguro que localStorage para tokens).
- Senhas sempre com **hash bcrypt** (nunca texto puro).
- Login por e-mail usa **token de uso único** enviado pelo **Brevo** (magic link/código).
- Login **Google OAuth** para criar/entrar.
- Proteção **CSRF**, **helmet**, **rate limit**, validação de entrada.
- Controle de acesso por **role** (`cliente` vs `admin`).

## 2. Fluxo de autenticação (e-mail/senha)
1. Usuário envia `email` + `senha`.
2. Back-end busca usuário, compara com `bcrypt.compare`.
3. Se ok, cria registro em `sessoes` (UUID), expira em X dias.
4. Retorna cookie `Set-Cookie: session=<uuid>; HttpOnly; Secure; SameSite=Lax; Path=/`.
5. Em cada requisição autenticada, o middleware `auth.js` lê o cookie, busca a sessão e anexa o usuário ao `req`.

## 3. Fluxo de login por token (Brevo)
1. Usuário informa **apenas o e-mail** e pede o código.
2. Back-end gera `tokens_login` (UUID, expira 15 min, `usado=false`).
3. Envia e-mail via **Brevo** com o link/código.
4. Usuário clica no link ou digita o código.
5. Back-end valida o token (não expirado, não usado), marca `usado=true`, cria sessão (cookie).
6. Se o e-mail não tem conta, **cria a conta automaticamente** (ou pede para completar cadastro).

## 4. Fluxo de login Google (OAuth)
1. Front redireciona para a URL de consentimento do Google (client id em `.env`).
2. Google retorna `authorization code` para o callback.
3. Back-end troca o code por tokens, busca `google_id`/`email`.
4. Se não existe usuário, cria; depois cria sessão (cookie).

## 5. Proteções adicionais
| Proteção | Implementação |
|----------|---------------|
| **CSRF** | token CSRF por sessão; validar em rotas de escrita (POST/PUT/DELETE) |
| **Helmet** | cabeçalhos seguros (CSP, X-Frame-Options, etc.) |
| **Rate limit** | `express-rate-limit`: ex. 100 req/15min; mais rígido em `/auth` |
| **Validação** | validar todos os inputs (tamanho, tipo, formato de e-mail/telefone) |
| **SQL Injection** | sempre usar parâmetros/`$1` no `pg` (nunca concatenar strings) |
| **XSS** | sanitizar saída no front (escapar HTML) |
| **HTTPS** | `Secure` no cookie; Vercel já fornece HTTPS |

## 6. Controle de acesso (middleware)
- `requireAuth` → exige sessão válida.
- `requireAdmin` → exige sessão com `role = 'admin'`.
- Rotas públicas: listar serviços, criar agendamento, login, cadastro, landing.

## 7. Boas práticas de senha
- Mínimo 8 caracteres.
- `bcrypt` com cost ≥ 10.
- Nunca retornar `senha_hash` na API.

## 8. Rotação e expiração
- Sessão expira (ex.: 30 dias) → renovar se ativo.
- Tokens de login expiram em 15 min e são de **uso único**.
- Ao alterar senha/deslogar → apagar sessões do usuário.

## 9. Exemplo de middleware `auth.js` (pseudocódigo)
```js
async function requireAuth(req, res, next) {
  const sessionId = req.cookies.session;
  if (!sessionId) return res.status(401).json({ erro: 'Não autenticado' });
  const sessao = await db.query(
    'SELECT * FROM sessoes WHERE id = $1 AND expira_em > now()', [sessionId]
  );
  if (!sessao.rows[0]) return res.status(401).json({ erro: 'Sessão expirada' });
  const usuario = await db.query('SELECT * FROM usuarios WHERE id = $1', [sessao.rows[0].usuario_id]);
  req.usuario = usuario.rows[0];
  next();
}
```

---

## 10. Implementação real de segurança (v2)

- **Sessão:** token de 32 bytes no cookie httpOnly `bcity_session`; o banco guarda apenas o SHA-256 (`sessoes.token_hash`). Expiração padrão de 30 dias com renovação deslizante.
- **Senha:** bcrypt com custo 12; nunca retornada pela API.
- **CSRF:** double-submit cookie `bcity_csrf` + header `X-CSRF-Token`; webhook do Pix é isento e validado por assinatura própria.
- **Rate limit:** global 600/15 min; login 25/15 min; e-mail 6/h; agendamento 20/h; consulta 40/15 min; webhook 120/min.
- **Headers:** Helmet com CSP restritiva (self, fontes Google, imagens data/https, iframe do Google Maps), `X-Frame-Options`, `Referrer-Policy`.
- **Validação:** todos os inputs passam por `utils/validacao.js`; SQL sempre parametrizado (`$1`, `$2`…).
- **Autorização:** `requireAuth`, `requireAdmin`; rotas de dono verificam `usuario_id`; cancelamento público exige código + telefone.
- **Auditoria:** alterações administrativas em `logs_admin` com IP e detalhes JSON.
- **E-mails:** código de 6 dígitos com hash, 15 min, máximo de 5 tentativas, uso único.
- **Google OAuth:** `state` em cookie httpOnly de 10 min e validação no callback.
- **Pix:** assinatura `x-signature` (HMAC SHA-256) e consulta do pagamento no gateway antes de confirmar; idempotência por transação.
- **LGPD:** consentimento nos formulários, política pública e exclusão/anonimização de conta.
- **Segredos:** `.env` fora do repositório; docs sanitizados; recomenda-se rotacionar Brevo e Neon que vazaram em docs antigas.

