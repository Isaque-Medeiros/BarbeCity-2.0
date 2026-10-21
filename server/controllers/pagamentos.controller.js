import { comTransacao, um, varios } from '../config/db.js';
import { config, recursos } from '../config/env.js';
import { asyncHandler, conflito, invalido, naoEncontrado, proibido } from '../utils/http.js';
import { compararSeguro } from '../utils/codigos.js';
import { calcularTroco } from '../utils/dinheiro.js';
import { normalizarTelefone } from '../utils/telefone.js';
import { textoOpcional, umDe, validarTelefone, validarUUID } from '../utils/validacao.js';
import { buscarPorId } from '../services/agendamentos.service.js';
import { consultarPagamento, criarCobrancaPix, mapearStatusPagamento, validarAssinaturaWebhook } from '../services/pix.service.js';

async function pagamentoDoAgendamento(agendamentoId) {
  return um(
    `SELECT * FROM pagamentos WHERE agendamento_id = $1 ORDER BY criado_em DESC LIMIT 1`,
    [agendamentoId],
  );
}

function valorCobrado(agendamento) {
  return Math.max(0, Number(agendamento.valor_original) - Number(agendamento.valor_desconto || 0));
}

function autorizar(req, agendamento, { exigirTelefone = false } = {}) {
  if (req.usuario?.role === 'admin') return;
  if (req.usuario && String(agendamento.usuario_id) === String(req.usuario.id)) return;

  const codigo = req.body?.codigo || req.query?.codigo;
  if (codigo && compararSeguro(agendamento.codigo_publico, String(codigo))) {
    if (exigirTelefone) {
      const telefone = req.body?.telefone || req.query?.telefone;
      if (!telefone || normalizarTelefone(telefone) !== normalizarTelefone(agendamento.telefone_cliente)) {
        throw proibido('Não foi possível validar este agendamento.');
      }
    }
    return;
  }
  throw proibido('Você não tem acesso a este pagamento.');
}

async function sincronizarComGateway(pagamento, gateway) {
  const novoStatus = mapearStatusPagamento(gateway?.status);
  return comTransacao(async (cliente) => {
    const atualizado = await cliente.query(
      `UPDATE pagamentos
       SET status = $1,
           pago_em = CASE WHEN $1 = 'pago' THEN COALESCE(pago_em, now()) ELSE pago_em END,
           gateway_payload = $2::jsonb
       WHERE id = $3
       RETURNING *`,
      [novoStatus, JSON.stringify(gateway ?? null), pagamento.id],
    );
    if (novoStatus === 'pago') {
      await cliente.query('UPDATE agendamentos SET valor_pago = $1 WHERE id = $2', [
        pagamento.valor,
        pagamento.agendamento_id,
      ]);
    }
    return atualizado.rows[0];
  });
}

export const registrar = asyncHandler(async (req, res) => {
  const agendamentoId = validarUUID(req.body?.agendamento_id, 'agendamento_id');
  const agendamento = await buscarPorId(agendamentoId);
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');
  autorizar(req, agendamento, { exigirTelefone: true });

  const metodo = umDe(req.body?.metodo, ['dinheiro', 'cartao', 'pix'], 'metodo');
  const pagamento = await pagamentoDoAgendamento(agendamentoId);
  if (pagamento?.status === 'pago') {
    throw conflito('Este agendamento já está pago.', 'pagamento_ja_confirmado');
  }
  const valor = valorCobrado(agendamento);
  const nota = metodo === 'dinheiro' && req.body?.notaDinheiro ? Number(req.body.notaDinheiro) : null;
  const trocoPix = metodo === 'dinheiro' && Boolean(req.body?.trocoPix);
  const trocoValor = nota ? calcularTroco(nota, valor) : null;
  const status = metodo === 'pix' && req.body?.pagarAgora ? 'pendente' : 'na_hora';

  let registro;
  if (pagamento) {
    const atualizado = await um(
      `UPDATE pagamentos
       SET metodo = $1, status = $2, valor = $3, nota_dinheiro = $4, troco_pix = $5, troco_valor = $6, pagar_agora = $7
       WHERE id = $8 RETURNING *`,
      [metodo, status, valor, nota, trocoPix, trocoValor, status === 'pendente', pagamento.id],
    );
    registro = atualizado;
  } else {
    registro = await um(
      `INSERT INTO pagamentos (agendamento_id, metodo, status, valor, nota_dinheiro, troco_pix, troco_valor, pagar_agora)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [agendamentoId, metodo, status, valor, nota, trocoPix, trocoValor, status === 'pendente'],
    );
  }

  let pix = null;
  if (status === 'pendente' && recursos.pixAtivo) {
    pix = await criarCobrancaPix({
      pagamentoId: registro.id,
      valor,
      descricao: `Barbe City Jaraguá — ${agendamento.servico_nome}`,
      emailPagador: agendamento.email_cliente,
      nomePagador: agendamento.nome_cliente,
    });
    registro = await um(
      `UPDATE pagamentos
       SET pix_codigo = $1, pix_qr_base64 = $2, pix_transacao_id = $3, pix_expiracao = $4, gateway_payload = $5::jsonb
       WHERE id = $6 RETURNING *`,
      [pix.codigo, pix.qrBase64, pix.transacaoId, pix.expiracao ? new Date(pix.expiracao) : null, JSON.stringify(pix.payload), registro.id],
    );
  }

  return res.status(201).json({
    pagamento: {
      id: registro.id,
      metodo: registro.metodo,
      status: registro.status,
      valor: Number(registro.valor),
      notaDinheiro: registro.nota_dinheiro ? Number(registro.nota_dinheiro) : null,
      trocoPix: Boolean(registro.troco_pix),
      trocoValor: registro.troco_valor ? Number(registro.troco_valor) : null,
      pixCodigo: registro.pix_codigo,
      pixQrBase64: registro.pix_qr_base64,
      pixExpiracao: registro.pix_expiracao,
    },
    pix,
  });
});

export const criarPix = asyncHandler(async (req, res) => {
  const agendamentoId = validarUUID(req.body?.agendamento_id, 'agendamento_id');
  const agendamento = await buscarPorId(agendamentoId);
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');
  autorizar(req, agendamento, { exigirTelefone: true });

  if (!recursos.pixAtivo) {
    throw invalido('O Pix online não está configurado. Escolha pagar no local.', { campo: 'metodo' });
  }

  let pagamento = await pagamentoDoAgendamento(agendamentoId);
  if (pagamento?.status === 'pago') {
    return res.json({
      jaPago: true,
      status: 'pago',
      pagamento: { id: pagamento.id, status: 'pago', valor: Number(pagamento.valor) },
    });
  }

  if (!pagamento) {
    pagamento = await um(
      `INSERT INTO pagamentos (agendamento_id, metodo, status, valor, pagar_agora)
       VALUES ($1, 'pix', 'pendente', $2, TRUE) RETURNING *`,
      [agendamentoId, valorCobrado(agendamento)],
    );
  }

  const pix = await criarCobrancaPix({
    pagamentoId: pagamento.id,
    valor: valorCobrado(agendamento),
    descricao: `Barbe City Jaraguá — ${agendamento.servico_nome}`,
    emailPagador: agendamento.email_cliente,
    nomePagador: agendamento.nome_cliente,
  });

  const atualizado = await um(
    `UPDATE pagamentos
     SET metodo = 'pix', status = $1, pix_codigo = $2, pix_qr_base64 = $3, pix_transacao_id = $4,
         pix_expiracao = $5, pagar_agora = TRUE, gateway_payload = $6::jsonb
     WHERE id = $7 RETURNING *`,
    [
      pix.status === 'approved' ? 'pago' : 'pendente',
      pix.codigo,
      pix.qrBase64,
      pix.transacaoId || null,
      pix.expiracao ? new Date(pix.expiracao) : null,
      JSON.stringify(pix.payload ?? null),
      pagamento.id,
    ],
  );

  if (atualizado.status === 'pago') {
    await um('UPDATE agendamentos SET valor_pago = $1 WHERE id = $2', [atualizado.valor, agendamentoId]);
  }

  return res.status(201).json({
    pagamento: {
      id: atualizado.id,
      metodo: atualizado.metodo,
      status: atualizado.status,
      valor: Number(atualizado.valor),
      pixCodigo: atualizado.pix_codigo,
      pixQrBase64: atualizado.pix_qr_base64,
      pixExpiracao: atualizado.pix_expiracao,
    },
    pix: {
      codigo: pix.codigo,
      qrBase64: pix.qrBase64,
      ticketUrl: pix.ticketUrl,
      expiracao: pix.expiracao,
      transacaoId: pix.transacaoId,
    },
  });
});

export const statusPix = asyncHandler(async (req, res) => {
  const agendamentoId = validarUUID(req.params.agendamentoId, 'agendamentoId');
  const agendamento = await buscarPorId(agendamentoId);
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');
  autorizar(req, agendamento);

  let pagamento = await pagamentoDoAgendamento(agendamentoId);
  if (!pagamento) throw naoEncontrado('Pagamento não encontrado.');

  if (pagamento.status === 'pendente' && pagamento.pix_transacao_id && recursos.pixAtivo) {
    try {
      const gateway = await consultarPagamento(pagamento.pix_transacao_id);
      pagamento = await sincronizarComGateway(pagamento, gateway);
    } catch (erro) {
      console.error('[pix] falha ao consultar status:', erro.message);
    }
  }

  return res.json({
    status: pagamento.status,
    valor: Number(pagamento.valor),
    pagoEm: pagamento.pago_em,
    pixExpiracao: pagamento.pix_expiracao,
    pixCodigo: pagamento.pix_codigo,
  });
});

export const webhookPix = asyncHandler(async (req, res) => {
  const dataId =
    req.query['data.id'] || req.body?.data?.id || req.query.id || req.body?.id || null;

  if (!dataId) return res.json({ ok: true, ignorado: 'sem_id' });

  if (config.pix.webhookSecret) {
    const assinatura = validarAssinaturaWebhook({ headers: req.headers, dataId: String(dataId) });
    if (!assinatura.valido) {
      console.warn('[pix] webhook com assinatura inválida:', assinatura.motivo);
      return res.status(401).json({ ok: false, erro: 'assinatura_invalida' });
    }
  }

  const pagamento = await um('SELECT * FROM pagamentos WHERE pix_transacao_id = $1', [String(dataId)]);
  if (!pagamento) {
    console.warn('[pix] webhook para transação desconhecida:', dataId);
    return res.json({ ok: true, ignorado: 'pagamento_nao_encontrado' });
  }

  try {
    const gateway = await consultarPagamento(String(dataId));
    if (String(gateway?.external_reference || '') !== String(pagamento.id)) {
      console.warn('[pix] external_reference divergente:', gateway?.external_reference, pagamento.id);
      return res.status(400).json({ ok: false, erro: 'referencia_invalida' });
    }
    const atualizado = await sincronizarComGateway(pagamento, gateway);
    console.log(`[pix] pagamento ${pagamento.id} atualizado para ${atualizado.status}`);
    return res.json({ ok: true, status: atualizado.status });
  } catch (erro) {
    console.error('[pix] erro ao processar webhook:', erro.message);
    return res.status(500).json({ ok: false, erro: 'falha_processamento' });
  }
});
