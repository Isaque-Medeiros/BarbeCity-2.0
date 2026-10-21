# 05 · API REST — implementada

Base: `/api` · JSON · sessão por cookie httpOnly `bcity_session` · CSRF por header `X-CSRF-Token` (double-submit cookie `bcity_csrf`).

Respostas de erro: `{ "erro": "mensagem", "codigo": "slug", "detalhes"?: {...} }`.

## 1. Público

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Status do servidor, banco e integrações |
| GET | `/api/config/publica` | Nome, contato, endereço, horários, flags, **promoções ativas** e **tema IA ativo** |
| GET | `/api/servicos` | Serviços ativos (`?categoria=`) |
| GET | `/api/servicos/:idOuSlug` | Detalhe |
| GET | `/api/agendamentos/disponibilidade?servico_id=&data=&adicionais=` | Slots do dia |
| GET | `/api/agendamentos/disponibilidade/mes?servico_id=&mes=AAAA-MM&adicionais=` | Vagas por dia |
| POST | `/api/agendamentos` | Cria agendamento (logado ou anônimo) |
| GET | `/api/agendamentos/consulta?codigo=&telefone=` | Consulta pública |
| POST | `/api/agendamentos/consulta/cancelar` | Cancelamento público |
| POST | `/api/pagamentos/pix/webhook` | Webhook Mercado Pago (isento de CSRF; valida assinatura) |
| GET | `/api/auth/google` | Inicia OAuth |
| GET | `/api/auth/google/callback` | Callback OAuth |

### `POST /api/agendamentos`
```json
{
  "servico_id": "uuid",
  "adicionais": ["uuid"],
  "data": "2026-11-05",
  "hora": "14:30",
  "nome": "João",
  "telefone": "(11) 99999-9999",
  "email": "joao@email.com",
  "observacao": "opcional",
  "aceitePrivacidade": true,
  "pagamento": {
    "metodo": "pix",
    "pagarAgora": true,
    "notaDinheiro": 100,
    "trocoPix": true
  }
}
```
Resposta `201`: agendamento, pagamento, código, link WhatsApp e, se Pix, QR/copia-e-cola.

## 2. Autenticação

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/auth/csrf` | Emite/retorna o token CSRF |
| POST | `/api/auth/cadastro` | Nome, e-mail, senha, telefone opcional, aceite |
| POST | `/api/auth/login` | E-mail + senha |
| POST | `/api/auth/solicitar-token` | Envia código de 6 dígitos (Brevo) |
| POST | `/api/auth/validar-token` | Valida código e cria sessão |
| GET | `/api/auth/me` | Usuário logado ou `null` |
| POST | `/api/auth/logout` | Encerra sessão |
| POST | `/api/auth/esqueci-senha` | Envia código de recuperação |
| POST | `/api/auth/redefinir-senha` | Código + nova senha |
| POST | `/api/auth/reenviar-verificacao` | Reenvia verificação (logado) |
| POST | `/api/auth/verificar-email` | Valida código de verificação |

## 3. Usuário logado

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/usuario` | Perfil + resumo (próximos, concluídos, total pago) |
| PUT | `/api/usuario` | Nome e telefone |
| PUT | `/api/usuario/senha` | Senha atual + nova |
| DELETE | `/api/usuario` | Exclusão LGPD (confirma senha) |
| GET | `/api/agendamentos/meus` | Histórico do usuário |
| GET | `/api/agendamentos/:id` | Detalhe (dono ou admin) |
| PATCH | `/api/agendamentos/:id/cancelar` | Cancelar |

## 4. Pagamentos

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/pagamentos` | Registra/atualiza pagamento (dono/admin ou código+telefone) |
| POST | `/api/pagamentos/pix/criar` | Gera/renova cobrança Pix |
| GET | `/api/pagamentos/pix/:agendamentoId/status?codigo=` | Polling do status |
| POST | `/api/pagamentos/pix/webhook` | Notificação do Mercado Pago |

## 5. Admin (`requireAdmin`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/admin/dashboard` | Contagens, agenda de hoje, pendências |
| GET | `/api/admin/financeiro?de=&ate=` | Receita conciliada, a receber, histórico, métodos, por dia, top serviços |
| GET/POST | `/api/admin/servicos` | Listar/criar |
| PUT/DELETE | `/api/admin/servicos/:id` | Editar/excluir (ou desativar) |
| GET | `/api/admin/usuarios` | Lista com busca, perfil, paginação |
| GET | `/api/admin/usuarios/:id` | Detalhe + últimos agendamentos |
| PATCH | `/api/admin/usuarios/:id/role` | Alterar perfil |
| PATCH | `/api/admin/usuarios/:id/ativo` | Ativar/desativar |
| DELETE | `/api/admin/usuarios/:id` | Excluir |
| GET | `/api/admin/agendamentos` | Filtros: status, de, ate, busca, ativos, página |
| POST | `/api/admin/agendamentos` | Criar manual |
| GET | `/api/admin/agendamentos/:id` | Detalhe |
| PATCH | `/api/admin/agendamentos/:id/status` | Alterar status |
| PATCH | `/api/admin/agendamentos/:id/reagendar` | Nova data/hora |
| POST | `/api/admin/agendamentos/:id/confirmar-pagamento` | Conciliar pagamento |
| GET/PUT | `/api/admin/configuracoes` | Configurações do site |
| GET/PUT | `/api/admin/horarios` | Horários de funcionamento |
| GET/POST | `/api/admin/bloqueios` | Listar/criar bloqueio |
| DELETE | `/api/admin/bloqueios/:id` | Remover bloqueio |
| GET | `/api/admin/logs` | Auditoria |
| GET | `/api/admin/notificacoes` | Histórico de envios |
| POST | `/api/admin/notificacoes/:id/reenviar` | Gera link para reenvio manual |
| GET/POST | `/api/admin/promocoes` | Listar/criar promoção (serviço ou global) |
| PUT/DELETE | `/api/admin/promocoes/:id` | Editar/encerrar/excluir |
| GET | `/api/admin/tema` | Tema ativo + histórico + status da IA |
| GET | `/api/admin/tema/:id` | Detalhe (html/css) para prévia |
| POST | `/api/admin/tema/gerar` | Gera rascunho com Gemini (10/h por IP) |
| POST | `/api/admin/tema/:id/ativar` | Aplica o tema no site |
| POST | `/api/admin/tema/reset` | Volta ao visual original |
| DELETE | `/api/admin/tema/:id` | Exclui rascunho/arquivado |

## 6. Códigos HTTP

`200` sucesso · `201` criado · `400` validação · `401` não autenticado · `403` sem permissão/CSRF · `404` não encontrado · `409` conflito (horário ocupado, e-mail, último admin) · `429` rate limit · `500` interno · `502/503/504` integrações externas.

## 7. Rate limits

Global 600/15 min; login 25/15 min; e-mail 6/h; agendamento 20/h; consulta 40/15 min; webhook 120/min; geração de tema por IA 10/h.

## 8. Promoções e tema IA (novos)

### `POST /api/admin/promocoes`
```json
{
  "rotulo": "Mês das crianças",
  "percentual": 20,
  "servicoId": null,
  "inicio": "2026-10-20T12:00:00.000Z",
  "fim": null,
  "ativo": true
}
```
`servicoId: null` aplica em todos os serviços. O endpoint público `/api/servicos` devolve `preco` (final), `precoOriginal`, `descontoPercentual` e `promocao`.

### `POST /api/admin/tema/gerar`
```json
{ "prompt": "Neste mês das crianças quero uma faixa com presentes...", "area": "ambos" }
```
Resposta: rascunho com `html`/`css` **já sanitizados**. Nada é aplicado até `POST /api/admin/tema/:id/ativar`.

Regras aplicadas pelo servidor:
- tags `div, section, span, p, strong, em, h2, h3, ul, li, br`;
- apenas atributo `class` com prefixo `bcity-tema-`;
- CSS escopado em `#bcity-tema-ativo`, sem `position`, `z-index`, `url()`, `@import`, `!important`;
- HTML ≤ 8 KB, CSS ≤ 8 KB, ≤ 60 regras e contraste mínimo 4.5:1.
