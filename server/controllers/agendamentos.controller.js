import { asyncHandler, conflito, invalido, naoEncontrado, proibido } from '../utils/http.js';
import { recursos } from '../config/env.js';
import { normalizarTelefone } from '../utils/telefone.js';
import { agendamentoPublico } from '../utils/serializadores.js';
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
import {
  disponibilidade,
  disponibilidadeMes,
  resolverServicos,
  validarSlot,
} from '../services/agenda.service.js';
import {
  buscarPorCodigo,
  buscarPorId,
  cancelarAgendamento,
  criarAgendamento,
  listarDoUsuario,
} from '../services/agendamentos.service.js';
import { notificarCancelamentoCompleto, notificarNovoAgendamentoCompleto } from '../services/notificacoes.service.js';

function dadosDoPagamento(agendamento) {
  if (!agendamento?.pagamento_id) return null;
  return {
    id: agendamento.pagamento_id,
    metodo: agendamento.pagamento_metodo,
    status: agendamento.pagamento_status,
    valor: Number(agendamento.pagamento_valor),
  };
}

export const consultarDisponibilidade = asyncHandler(async (req, res) => {
  const servicoId = validarUUID(req.query.servico_id, 'servico_id');
  const data = validarDataISO(req.query.data, 'data');
  const adicionaisIds = listaUUIDs(req.query.adicionais, 'adicionais');
  const resultado = await disponibilidade({ data, servicoId, adicionaisIds });
  res.json(resultado);
});

export const consultarDisponibilidadeMes = asyncHandler(async (req, res) => {
  const servicoId = validarUUID(req.query.servico_id, 'servico_id');
  const mes = String(req.query.mes || '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw invalido('Mês inválido. Use AAAA-MM.', { campo: 'mes' });
  const adicionaisIds = listaUUIDs(req.query.adicionais, 'adicionais');
  const resultado = await disponibilidadeMes({ mes, servicoId, adicionaisIds });
  res.json(resultado);
});

export const criar = asyncHandler(async (req, res) => {
  const servicoId = validarUUID(req.body?.servico_id, 'servico_id');
  const adicionaisIds = listaUUIDs(req.body?.adicionais, 'adicionais');
  const data = validarDataISO(req.body?.data, 'data');
  const hora = validarHora(req.body?.hora, 'hora');
  const nomeCliente = textoObrigatorio(
    req.body?.nome || req.usuario?.nome,
    'seu nome',
    { min: 2, max: 120 },
  );
  const telefoneCliente = validarTelefone(req.body?.telefone || req.usuario?.telefone);
  const emailCliente = req.body?.email
    ? validarEmail(req.body.email, 'e-mail')
    : req.usuario?.email || null;
  const observacao = textoOpcional(req.body?.observacao, 'observação', { max: 400 });

  if (req.body?.aceitePrivacidade !== true) {
    throw invalido('É necessário aceitar a política de privacidade.', { campo: 'aceitePrivacidade' });
  }

  const metodo = umDe(req.body?.pagamento?.metodo, ['dinheiro', 'cartao', 'pix'], 'pagamento.metodo');
  const pagarAgora = metodo === 'pix' && Boolean(req.body?.pagamento?.pagarAgora);
  if (pagarAgora && !recursos.pixAtivo) {
    throw invalido('O Pix online ainda não está disponível. Escolha pagar no local.', {
      campo: 'pagamento.pagarAgora',
    });
  }
  const notaDinheiro =
    metodo === 'dinheiro' && req.body?.pagamento?.notaDinheiro
      ? Number(req.body.pagamento.notaDinheiro)
      : null;
  if (metodo === 'dinheiro' && notaDinheiro !== null && (!Number.isFinite(notaDinheiro) || notaDinheiro <= 0)) {
    throw invalido('Informe o valor da nota em dinheiro.', { campo: 'pagamento.notaDinheiro' });
  }

  const validacao = await validarSlot({ data, hora, servicoId, adicionaisIds });
  const servicos = await resolverServicos(servicoId, adicionaisIds);
  const inicio = new Date(validacao.slot.inicio);
  const fim = new Date(validacao.slot.fim);

  const criado = await criarAgendamento({
    servicos,
    inicio,
    fim,
    nomeCliente,
    emailCliente,
    telefoneCliente,
    observacao,
    usuarioId: req.usuario?.id || null,
    formaPagamento: {
      metodo,
      notaDinheiro,
      trocoPix: Boolean(req.body?.pagamento?.trocoPix),
      pagarAgora,
    },
    origem: 'site',
    status: 'confirmado',
  });

  const pagamento = dadosDoPagamento(criado.agendamento);
  const notificacao = await notificarNovoAgendamentoCompleto({
    agendamento: criado.agendamento,
    servicos,
    pagamento,
  });

  return res.status(201).json({
    mensagem: 'Agendamento confirmado!',
    agendamento: agendamentoPublico(criado.agendamento),
    pagamento,
    notificacao,
    pix: criado.pix,
    ...(criado.pixErro
      ? {
          aviso:
            'Seu horário está confirmado, mas não foi possível gerar o Pix agora. Você pode pagar no local ou tentar novamente.',
          pixErro: criado.pixErro,
        }
      : {}),
  });
});

export const consultar = asyncHandler(async (req, res) => {
  const codigo = textoObrigatorio(req.query.codigo, 'código', { min: 6, max: 20 });
  const telefone = validarTelefone(req.query.telefone, 'telefone');
  const agendamento = await buscarPorCodigo(codigo);
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado. Confira o código e o telefone.');
  if (normalizarTelefone(agendamento.telefone_cliente) !== normalizarTelefone(telefone)) {
    throw naoEncontrado('Agendamento não encontrado. Confira o código e o telefone.');
  }
  return res.json({ agendamento: agendamentoPublico(agendamento) });
});

export const cancelarPublico = asyncHandler(async (req, res) => {
  const codigo = textoObrigatorio(req.body?.codigo, 'código', { min: 6, max: 20 });
  const telefone = validarTelefone(req.body?.telefone, 'telefone');
  const motivo = textoOpcional(req.body?.motivo, 'motivo', { max: 300 });
  const agendamento = await buscarPorCodigo(codigo);
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');
  if (normalizarTelefone(agendamento.telefone_cliente) !== normalizarTelefone(telefone)) {
    throw proibido('Não foi possível validar este agendamento.');
  }
  const cancelado = await cancelarAgendamento({ agendamento, motivo, permitirConvidado: true });
  const notificacao = await notificarCancelamentoCompleto({
    agendamento: cancelado,
    servico: { nome: agendamento.servico_nome },
    motivo,
  });
  return res.json({
    mensagem: 'Agendamento cancelado.',
    agendamento: agendamentoPublico(await buscarPorId(agendamento.id)),
    notificacao,
  });
});

export const meus = asyncHandler(async (req, res) => {
  const linhas = await listarDoUsuario(req.usuario.id);
  return res.json({ agendamentos: linhas.map((linha) => agendamentoPublico(linha)) });
});

export const detalhar = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const agendamento = await buscarPorId(id);
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');
  if (req.usuario.role !== 'admin' && String(agendamento.usuario_id) !== String(req.usuario.id)) {
    throw proibido('Você não tem acesso a este agendamento.');
  }
  return res.json({ agendamento: agendamentoPublico(agendamento) });
});

export const cancelar = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const agendamento = await buscarPorId(id);
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');
  const motivo = textoOpcional(req.body?.motivo, 'motivo', { max: 300 });
  if (['cancelado', 'concluido', 'ausente'].includes(agendamento.status)) {
    throw conflito('Este agendamento não pode mais ser cancelado.', 'status_invalido');
  }
  const cancelado = await cancelarAgendamento({ agendamento, usuario: req.usuario, motivo });
  const notificacao = await notificarCancelamentoCompleto({
    agendamento: cancelado,
    servico: { nome: agendamento.servico_nome },
    motivo,
  });
  return res.json({
    mensagem: 'Agendamento cancelado.',
    agendamento: agendamentoPublico(await buscarPorId(id)),
    notificacao,
  });
});

