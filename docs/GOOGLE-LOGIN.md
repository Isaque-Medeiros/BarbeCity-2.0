# Login com Google — configuração completa

O código já está pronto: `/api/auth/google` inicia o fluxo, `/api/auth/google/callback`
troca o código por token, cria ou vincula a conta e abre a sessão. Falta apenas
criar as credenciais no Google Cloud e cadastrá-las na Vercel.

## 1. Criar as credenciais no Google Cloud

1. Abra <https://console.cloud.google.com/> e crie um projeto (ex.: `barbe-city`).
2. Menu **APIs e serviços → Tela de consentimento OAuth**
   - Tipo de usuário: **Externo**
   - Nome do app: `Barbe City Jaraguá`
   - E-mail de suporte: o e-mail da barbearia
   - Domínios autorizados: o domínio do site
   - Escopos: `openid`, `email`, `profile` (são os únicos usados)
   - Enquanto estiver em **Testing**, adicione o e-mail do seu pai e o seu em
     **Usuários de teste** (limite de 100). Para abrir ao público, publique o app.
3. Menu **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**
   - Tipo: **Aplicativo da Web**
   - **URIs de redirecionamento autorizados** (adicione os dois):
     - `https://SEU-DOMINIO/api/auth/google/callback`
     - `http://localhost:3000/api/auth/google/callback`
   - Copie o **Client ID** e o **Client secret**.

> O `redirect_uri` é derivado da própria requisição quando `GOOGLE_REDIRECT_URI`
> está vazio. Isso faz o login funcionar em `localhost`, nos previews da Vercel e
> no domínio final sem trocar variável. Só preencha `GOOGLE_REDIRECT_URI` se
> quiser forçar um endereço fixo.

## 2. Testar local

No `.env`:

```
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
# GOOGLE_REDIRECT_URI=   (deixe vazio)
```

Reinicie o servidor e abra `http://localhost:3000/login.html`. O botão
"Continuar com Google" só aparece quando o servidor tem as duas variáveis
(o `/api/config/publica` informa `recursos.google`).

## 3. Configurar na Vercel

**Painel:** Project → **Settings** → **Environment Variables** → *Add New*.

| Nome | Valor | Ambientes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | client id copiado | Production, Preview, Development |
| `GOOGLE_CLIENT_SECRET` | client secret copiado | Production, Preview, Development |

Depois: **Deployments → ⋯ → Redeploy** (variável nova só vale em deploy novo).

**CLI (alternativa):**

```bash
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel --prod
```

## 4. Conferir se subiu

```bash
curl -s https://SEU-DOMINIO/api/config/publica | findstr recursos
# esperado: "recursos":{"google":true}
```

Se vier `false`, a variável não chegou ao deploy. Se o Google devolver
`redirect_uri_mismatch`, o endereço cadastrado no console não bate com o do site —
confira se `https://SEU-DOMINIO/api/auth/google/callback` está na lista.

## 5. O que acontece no login

1. O usuário clica em "Continuar com Google".
2. O servidor grava um `state` em cookie httpOnly e redireciona ao Google.
3. Na volta, o `state` é conferido, o código vira token e o perfil é lido.
4. Se o e-mail já existe, a conta é vinculada (`google_id`); se não, é criada com
   e-mail já verificado.
5. Agendamentos antigos feitos como convidado, com o mesmo e-mail, são vinculados
   à conta automaticamente.
6. O usuário cai em `/usuario.html?bemvindo=1`.

## Segurança envolvida

- `state` com 24 bytes aleatórios, comparado em tempo constante.
- Cookie `httpOnly` + `SameSite=Lax` + `Secure` em produção.
- Nenhum token do Google é guardado no navegador.
- O botão só aparece se o servidor estiver configurado.
