import { comTransacao } from '../config/db.js';
import { asyncHandler, invalido, naoEncontrado } from '../utils/http.js';
import { registrarLog } from '../utils/serializadores.js';
import {
  listaUUIDs,
  textoObrigatorio,
  textoOpcional,
  umDe,
  validarDataISO,
  validarEmail,
  validarHora,
  validarTelefone,
  validarUUID,
} from '../utils/validacao.js';
import { resolverServicos, validarSlot } from '../services/agenda.service.js';
import {
  atualizarStatus,
  buscarPorId,
  criarAgendamento,
  listarAdmin,
  reagendarAgendamento,
} from '../services/agendamentos.service.js';

const STATUS = ['pendente', 'confirmado', 'concluido', 'cancelado', 'ausente'];

export const listar = asyncHandler(async (req, res) => {
  const status = req.query.status ? umDe(req.query.status, STATUS, 'status') : null;
  const de = req.query.de ? new Date(`${validarDataISO(req.query.de, 'de')}T00:00:00-03:00`) : null;
  const ate = req.query.ate ? new Date(`${validarDataISO(req.query.ate, 'ate')}T23:59:59-03:00`) : null;
  const resultado = await listarAdmin({
    status,
    de,
    ate,
    busca: req.query.busca,
    pagina: req.query.pagina,
    limite: req.query.limite,
    apenasAtivos: req.query.ativos === '1',
  });
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const agendamento = await buscarPorId(id);
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');
  res.json({ agendamento });
});

export const alterarStatus = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const status = umDe(req.body?.status, STATUS, 'status');
  const agendamento = await buscarPorId(id);
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');
  const atualizado = await atualizarStatus({ agendamento, status, usuarioId: req.usuario.id });
  res.json({ agendamento: atualizado, mensagem: 'Status atualizado.' });
});

export const reagendar = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const data = validarDataISO(req.body?.data, 'data');
  const hora = validarHora(req.body?.hora, 'hora');
  const agendamento = await buscarPorId(id);
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');

  const adicionaisIds = (agendamento.adicionais || []).map((item) => item.id);
  const validacao = await validarSlot({
    data,
    hora,
    servicoId: agendamento.servico_id,
    adicionaisIds,
  });
  const atualizado = await reagendarAgendamento({
    agendamento,
    inicio: new Date(validacao.slot.inicio),
    fim: new Date(validacao.slot.fim),
    duracaoMin: validacao.duracaoTotal,
    atualizadoPor: req.usuario.id,
  });
  res.json({ agendamento: atualizado, mensagem: 'Horário reagendado.' });
});

export const criarManual = asyncHandler(async (req, res) => {
  const servicoId = validarUUID(req.body?.servico_id, 'servico_id');
  const adicionaisIds = listaUUIDs(req.body?.adicionais, 'adicionais');
  const data = validarDataISO(req.body?.data, 'data');
  const hora = validarHora(req.body?.hora, 'hora');
  const nomeCliente = textoObrigatorio(req.body?.nome, 'nome do cliente', { min: 2, max: 120 });
  const telefoneCliente = validarTelefone(req.body?.telefone);
  const emailCliente = req.body?.email ? validarEmail(req.body.email, 'e-mail') : null;
  const observacao = textoOpcional(req.body?.observacao, 'observação', { max: 400 });
  const metodo = umDe(req.body?.metodo ?? 'dinheiro', ['dinheiro', 'cartao', 'pix'], 'metodo');
  const status = umDe(req.body?.status ?? 'confirmado', ['pendente', 'confirmado'], 'status');
  const pagarAgora = metodo === 'pix' && Boolean(req.body?.pagarAgora);

  const validacao = await validarSlot({ data, hora, servicoId, adicionaisIds });
  const servicos = await resolverServicos(servicoId, adicionaisIds);
  const criado = await criarAgendamento({
    servicos,
    inicio: new Date(validacao.slot.inicio),
    fim: new Date(validacao.slot.fim),
    nomeCliente,
    emailCliente,
    telefoneCliente,
    observacao,
    usuarioId: null,
    formaPagamento: {
      metodo,
      notaDinheiro: req.body?.notaDinheiro ? Number(req.body.notaDinheiro) : null,
      trocoPix: Boolean(req.body?.trocoPix),
      pagarAgora,
    },
    origem: 'admin',
    status,
  });
  await registrarLog({
    adminId: req.usuario.id,
    acao: 'criar_agendamento_manual',
    entidade: 'agendamento',
    entidadeId: criado.agendamento.id,
    detalhes: { cliente: nomeCliente, data, hora, servico: servicos.principal.nome },
    ip: req.ip,
  });
  res.status(201).json({ agendamento: criado.agendamento, mensagem: 'Agendamento criado.' });
});

export const confirmarPagamento = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const agendamento = await buscarPorId(id);
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');
  const metodo = umDe(req.body?.metodo ?? 'dinheiro', ['dinheiro', 'cartao', 'pix', 'legado'], 'metodo');
  const valor = req.body?.valor === undefined
    ? Math.max(0, Number(agendamento.valor_original) - Number(agendamento.valor_desconto || 0))
    : Number(req.body.valor);
  if (!Number.isFinite(valor) || valor < 0) throw invalido('Valor inválido.', { campo: 'valor' });

  const resultado = await comTransacao(async (cliente) => {
    const existente = await cliente.query(
      'SELECT * FROM pagamentos WHERE agendamento_id = $1 ORDER BY criado_em DESC LIMIT 1',
      [id],
    );
    let pagamento;
    if (existente.rows[0]) {
      const atualizado = await cliente.query(
        `UPDATE pagamentos SET metodo = $1, status = 'pago', valor = $2, pago_em = now()
         WHERE id = $3 RETURNING *`,
        [metodo, valor, existente.rows[0].id],
      );
      pagamento = atualizado.rows[0];
    } else {
      const criado = await cliente.query(
        `INSERT INTO pagamentos (agendamento_id, metodo, status, valor, pago_em)
         VALUES ($1, $2, 'pago', $3, now()) RETURNING *`,
        [id, metodo, valor],
      );
      pagamento = criado.rows[0];
    }
    await cliente.query(
      `UPDATE agendamentos SET valor_pago = (
         SELECT COALESCE(sum(valor), 0) FROM pagamentos WHERE agendamento_id = $1 AND status = 'pago'
       ) WHERE id = $1`,
      [id],
    );
    return pagamento;
  });

  await registrarLog({
    adminId: req.usuario.id,
    acao: 'confirmar_pagamento',
    entidade: 'agendamento',
    entidadeId: id,
    detalhes: { metodo, valor },
    ip: req.ip,
  });

  res.json({
    pagamento: {
      id: resultado.id,
      metodo: resultado.metodo,
      status: resultado.status,
      valor: Number(resultado.valor),
      pagoEm: resultado.pago_em,
    },
    mensagem: 'Pagamento confirmado.',
  });
});

