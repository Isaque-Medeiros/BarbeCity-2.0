# 12 · Operação e Deploy

## 1. Requisitos
- Node.js 20+ (`C:\Users\isaque.medeiros\Documents\node-v24.21.0-win-x64` nesta máquina).
- Conta Neon com o banco `neondb`.
- Conta Vercel + repositório privado no GitHub (upload manual).
- (Opcional) Brevo, Google Cloud, Mercado Pago, WhatsApp Cloud API.

## 2. Rodar local
```powershell
cd C:\Users\isaque.medeiros\Desktop\MeusProjetos\Barbecuts
& 'C:\Users\isaque.medeiros\Documents\node-v24.21.0-win-x64\npm.cmd' install
npm run db:setup      # migrate + seed + import (já executado)
npm run dev           # http://localhost:3000
```
Painel: `http://localhost:3000/admin.html` com o e-mail/senha de `ADMIN_EMAIL`/`ADMIN_SENHA` do `.env`.

## 3. Comandos
| Comando | Função |
|---|---|
| `npm run dev` | Servidor com `--watch` |
| `npm start` | Produção local |
| `npm run db:migrate` | Aplica `server/db/schema.sql` (idempotente) |
| `npm run db:seed` | Admin, serviços, horários e configurações |
| `npm run db:import` | Importa `legacy/*.json` |
| `npm run db:setup` | Os três acima em ordem |
| `npm run db:admin` | Recria/atualiza o admin do `.env` |
| `npm run db:status` | Contagens e próximos agendamentos |
| `npm test` | Testes unitários locais (sem rede) |
| `npm run smoke` | Teste ponta a ponta (precisa do servidor e do Neon) |

## 4. Testes
- `npm test`: 30 testes locais de datas/fuso, telefone, dinheiro, validação e migração.
- `npm run smoke`: sobe contra `http://localhost:3000`; verifica health, serviços, disponibilidade, criação/consulta/cancelamento, login admin e painel. **Requer rede liberada para o Neon**; em rede corporativa pode falhar.
- Verificação de HTML/assets: `node server/scripts/check-html.js`.

## 5. Vercel
- **Uma única função serverless**: `api/[...slug].js` (catch-all), que entrega toda a API.
- Front estático em `public/`.
- `vercel.json` define `maxDuration: 60` e `memory: 512` (dentro do plano gratuito).
- Não há cron nem funções por rota, respeitando o limite do plano Hobby.
- O driver do Neon usa WebSocket/HTTPS (443), o que funciona na Vercel e em redes que bloqueiam 5432.

### Variáveis na Vercel
Copie as chaves do `.env` para **Settings → Environment Variables**, com:
```
NODE_ENV=production
BASE_URL=https://seudominio.com
FRONTEND_URL=https://seudominio.com
COOKIE_SECURE=true
TRUST_PROXY=1
GOOGLE_REDIRECT_URI=https://seudominio.com/api/auth/google/callback
```
Depois de qualquer alteração, faça **Redeploy**.

## 6. Google OAuth
1. Suba o site e defina o domínio final.
2. Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web).
3. Authorized redirect URI: `https://SEU-DOMINIO/api/auth/google/callback`.
4. Copie Client ID/Secret para a Vercel e para o `.env` local.
5. O botão Google passa a funcionar automaticamente (flag `googleAtivo`).

## 7. Mercado Pago (Pix)
1. Crie a aplicação e obtenha o Access Token de produção.
2. Configure `PIX_ACCESS_TOKEN`, `PIX_PUBLIC_KEY` e `PIX_WEBHOOK_SECRET`.
3. Webhook: `https://SEU-DOMINIO/api/pagamentos/pix/webhook` (evento `payment`).
4. O backend valida `x-signature`, consulta o pagamento e confirma de forma idempotente.
5. Sem as chaves, o Pix online fica desabilitado e o cliente paga no local.

## 8. WhatsApp
- **Manual (padrão)**: gera link `wa.me` com a mensagem; o dono envia.
- **Automático**: configure `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` (Cloud API) e um template aprovado, se necessário.
- Todo envio/erro fica registrado em `notificacoes` e aparece no painel.

## 9. Backup e recuperação
- Neon: use o painel para snapshots/branch ou `pg_dump` a partir de uma rede que permita 5432.
- Alternativa: exportar via SQL pelo driver serverless (`SELECT` → JSON) usando um script Node.
- Os JSONs em `legacy/` são a fonte histórica imutável.

## 10. Segurança operacional
- `.env` nunca vai para o GitHub.
- **Rotacione** Brevo/Neon que apareceram em docs antigas.
- Troque a senha do admin após o primeiro login.
- Mantenha `COOKIE_SECURE=true` e `TRUST_PROXY=1` em produção.
- Revise as permissões de admin periodicamente (mínimo de 1 admin ativo é garantido pelo backend).

## 11. Problemas comuns
| Sintoma | Causa/providência |
|---|---|
| Timeout ao conectar no banco | Porta 5432 bloqueada; o driver serverless já usa 443 |
| `self-signed certificate` local | Proxy corporativo; em dev o WebSocket aceita o certificado; em produção a verificação fica ativa |
| Login admin não funciona | Rode `npm run db:admin` e confira `ADMIN_EMAIL`/`ADMIN_SENHA` |
| Google indisponível | Chaves ausentes ou redirect URI divergente |
| Pix não aparece | `PIX_ACCESS_TOKEN` ausente ou valor inválido |
| WhatsApp não envia sozinho | Sem Cloud API; use o link `wa.me` exibido |
| Vercel “too many functions” | Mantenha apenas `api/[...slug].js` |

## 12. Gemini e editor de tema

1. Crie as chaves no Google AI Studio e coloque em `GEMINI_API_KEYS` (separadas por vírgula).
2. **A cota é por projeto**, não por chave. Para a rotação realmente “pular” o limite, use chaves de projetos/contas diferentes.
3. A geração roda na mesma função `api/[...slug].js`, com `maxDuration: 60` e deadline interno de 40s.
4. Fluxo: `POST /api/admin/tema/gerar` → rascunho sanitizado → prévia em iframe isolado → `POST /api/admin/tema/:id/ativar`.
5. Para desfazer: botão **Voltar ao site original** (`POST /api/admin/tema/reset`) ou o próprio banco: `UPDATE temas_site SET status='arquivado' WHERE status='ativo';`.
6. Limite de 10 gerações por hora por IP. Sem chave, o botão fica desabilitado e o restante do sistema continua normal.
7. Logs registram modelo, posição da chave (nunca a chave) e avisos do sanitizador.
