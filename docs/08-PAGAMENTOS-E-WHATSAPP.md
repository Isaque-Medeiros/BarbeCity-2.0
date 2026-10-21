# 08 · Pagamentos & WhatsApp — implementado

## 1. Métodos
| Método | Comportamento |
|---|---|
| **Dinheiro** | Registra a nota, calcula troco e pergunta se aceita troco via Pix. Status inicial `na_hora`. |
| **Cartão** | Pagamento presencial na maquininha. Status inicial `na_hora`. |
| **Pix agora** | Cria cobrança no Mercado Pago, exibe QR/copia-e-cola, status `pendente` e confirma por webhook/polling. |
| **Pix na hora** | Não gera cobrança; status `na_hora`. |
| **Legado** | Usado apenas na conciliação manual de atendimentos históricos. |

## 2. Fluxo Pix (Mercado Pago)
1. `POST /api/pagamentos/pix/criar` (ou criação junto do agendamento).
2. Backend chama `POST https://api.mercadopago.com/v1/payments` com `payment_method_id=pix`, `external_reference` = id do pagamento e `X-Idempotency-Key`.
3. Retorno: `qr_code`, `qr_code_base64`, `ticket_url`, `date_of_expiration`.
4. Frontend mostra QR + copia-e-cola e faz polling a cada 4 s em `/api/pagamentos/pix/:agendamentoId/status`.
5. Webhook `POST /api/pagamentos/pix/webhook` valida `x-signature` (`id:…;request-id:…;ts:…;` com HMAC SHA-256 + `PIX_WEBHOOK_SECRET`), consulta o pagamento no gateway, confere `external_reference` e atualiza de forma idempotente.
6. Status `pago` atualiza `pagamentos.status`, `pago_em` e `agendamentos.valor_pago`.

Sem `PIX_ACCESS_TOKEN`, o recurso é desabilitado no front e a API responde de forma clara; o agendamento continua funcionando com pagamento no local.

## 3. WhatsApp
Dois modos:

### Cloud API (automático)
Configure `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`. O backend envia texto para `WHATSAPP_NUMBER` via Graph API.

### Fallback `wa.me` (manual)
Sem token, o sistema monta a mensagem, salva em `notificacoes` com status `link_gerado` e devolve um link `https://wa.me/<dono>?text=...`. A tela de sucesso exibe “Avisar a barbearia”.

> O `wa.me` **não envia sozinho**: ele apenas abre a conversa. Para envio 100% automático é necessário WhatsApp Cloud API ou um provedor (Z-API, Evolution etc.).

## 4. Mensagem padrão
```
💈 *NOVO AGENDAMENTO*
━━━━━━━━━━━━━━
👤 Cliente: João da Silva
📱 Telefone: (11) 99999-9999
📧 E-mail: joao@email.com
✂️ Serviço: Corte + Barba
💰 Valor: R$ 50,00
📅 Data: 05/11/2026 às 14:30
💳 Pagamento: Pix (PAGO ✅)
📝 Obs.: ...
🔖 Código: a1b2c3d4e5
━━━━━━━━━━━━━━
```

## 5. E-mails (Brevo)
- Código de acesso / recuperação / verificação.
- Boas-vindas ao criar conta.
- Confirmação ao cliente e aviso ao dono.
- Cancelamento.
- Registro em `notificacoes` (canal `email`, status enviado/falhou).

## 6. Status de pagamento
`pendente` → aguardando Pix; `pago` → confirmado; `na_hora` → pagar no local; `falhou` → recusado/expirado; `estornado` → devolvido.

## 7. Conciliação
No admin, “Confirmar pagamento” permite registrar dinheiro/Pix/cartão/legado, atualizando `valor_pago`. O financeiro separa **receita conciliada**, **a receber** e **histórico estimado** (legado sem pagamento).
