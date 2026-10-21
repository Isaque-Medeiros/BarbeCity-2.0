import { config, recursos } from '../config/env.js';
import { fetchJson } from '../utils/fetch.js';
import { HttpError } from '../utils/http.js';
import { compararSeguro, hmacSha256 } from '../utils/codigos.js';

export function pixConfigurado() {
  return recursos.pixAtivo;
}

/**
 * Cria uma cobrança Pix no Mercado Pago.
 * Docs: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
 */
export async function criarCobrancaPix({ pagamentoId, valor, descricao, emailPagador, nomePagador, expiraEmMinutos = 30 }) {
  if (!recursos.pixAtivo) {
    throw new HttpError(503, 'Pagamento Pix não está configurado. Escolha pagar no local.', 'pix_indisponivel');
  }
  const partesNome = String(nomePagador || 'Cliente').trim().split(/\s+/);
  const corpo = {
    transaction_amount: Number(Number(valor).toFixed(2)),
    description: descricao,
    payment_method_id: 'pix',
    external_reference: pagamentoId,
    notification_url: `${config.baseUrl}/api/pagamentos/pix/webhook`,
    date_of_expiration: new Date(Date.now() + expiraEmMinutos * 60_000).toISOString(),
    payer: {
      email: emailPagador || config.donoEmail || 'cliente@barbecityjaragua.com.br',
      first_name: partesNome[0] || 'Cliente',
      last_name: partesNome.slice(1).join(' ') || 'Barbe City',
    },
  };
  const resposta = await fetchJson('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.pix.accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `pix-${pagamentoId}`,
    },
    body: JSON.stringify(corpo),
  });
  const dadosPix = resposta?.point_of_interaction?.transaction_data || {};
  return {
    transacaoId: String(resposta?.id ?? ''),
    status: resposta?.status || 'pending',
    statusDetalhe: resposta?.status_detail || null,
    codigo: dadosPix.qr_code || null,
    qrBase64: dadosPix.qr_code_base64 || null,
    ticketUrl: dadosPix.ticket_url || null,
    expiracao: resposta?.date_of_expiration || corpo.date_of_expiration,
    payload: resposta,
  };
}

export async function consultarPagamento(transacaoId) {
  if (!recursos.pixAtivo) {
    throw new HttpError(503, 'Pagamento Pix não está configurado.', 'pix_indisponivel');
  }
  return fetchJson(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(transacaoId)}`, {
    headers: { Authorization: `Bearer ${config.pix.accessToken}` },
  });
}

/**
 * Valida o header x-signature do Mercado Pago.
 * Manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 */
export function validarAssinaturaWebhook({ headers, dataId }) {
  if (!config.pix.webhookSecret) return { valido: true, motivo: 'segredo_nao_configurado' };
  const assinatura = headers['x-signature'];
  const requestId = headers['x-request-id'];
  if (!assinatura || !requestId) return { valido: false, motivo: 'headers_ausentes' };

  const partes = Object.fromEntries(
    String(assinatura)
      .split(',')
      .map((item) => item.split('=').map((valor) => valor.trim()))
      .filter((par) => par.length === 2),
  );
  if (!partes.ts || !partes.v1) return { valido: false, motivo: 'assinatura_malformada' };

  const manifesto = `id:${dataId};request-id:${requestId};ts:${partes.ts};`;
  const esperado = hmacSha256(manifesto, config.pix.webhookSecret);
  return { valido: compararSeguro(esperado, partes.v1), motivo: 'ok' };
}

export function mapearStatusPagamento(statusGateway) {
  switch (String(statusGateway || '').toLowerCase()) {
    case 'approved':
    case 'accredited':
      return 'pago';
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'pendente';
    case 'rejected':
    case 'cancelled':
    case 'canceled':
    case 'charged_back':
      return 'falhou';
    case 'refunded':
      return 'estornado';
    default:
      return 'pendente';
  }
}
