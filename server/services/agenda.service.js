import { varios } from '../config/db.js';
import { config } from '../config/env.js';
import {
  adicionarDias,
  combinarDataHora,
  diferencaDias,
  horaParaMinutos,
  hojeISO,
  infoMes,
  localParaUtc,
  minutosParaHora,
} from '../utils/datas.js';
import { conflito, invalido } from '../utils/http.js';
import { calcularPrecos } from '../utils/promocoes.js';
import { avatarDeServicos } from '../utils/avatar.js';
import { carregarPromocoesAtivas } from './promocoes.service.js';

const STATUS_ATIVOS = ['pendente', 'confirmado'];
const ANTECEDENCIA_MIN = 10;

export async function resolverServicos(servicoId, adicionaisIds = []) {
  const ids = [...new Set([servicoId, ...adicionaisIds].filter(Boolean))];
  const resultado = await varios(
    `SELECT id, nome, slug, descricao, preco, duracao_min, categoria, icone, ativo, ordem, avatar_traits
     FROM servicos WHERE id = ANY($1::uuid[]) AND ativo = TRUE`,
    [ids],
  );
  const mapa = new Map(resultado.map((linha) => [linha.id, linha]));
  const principal = mapa.get(servicoId);
  if (!principal) throw invalido('Serviço não encontrado ou indisponível.', { campo: 'servico_id' });
  const adicionais = ids
    .filter((id) => id !== servicoId)
    .map((id) => mapa.get(id))
    .filter(Boolean);

  const promocoes = await carregarPromocoesAtivas();
  const precos = calcularPrecos([principal, ...adicionais], promocoes);
  const itens = precos.itens;

  return {
    principal: itens[0],
    adicionais: itens.slice(1),
    servicos: itens,
    valorOriginal: precos.valorOriginal,
    valorTotal: precos.valorTotal,
    valorDesconto: precos.valorDesconto,
    promocaoRotulo: precos.promocaoRotulo,
    promocaoDetalhes: precos.promocaoDetalhes,
    avatar: avatarDeServicos(itens),
    duracaoTotal:
      Number(principal.duracao_min) +
      adicionais.reduce((total, item) => total + Number(item.duracao_min), 0),
  };
}

export async function carregarHorarios() {
  const linhas = await varios(
    `SELECT dia_semana, abertura, fechamento, intervalo_min, ativo
     FROM horarios_funcionamento ORDER BY dia_semana`,
  );
  return new Map(linhas.map((linha) => [Number(linha.dia_semana), linha]));
}

export async function carregarIntervalos(inicio, fim) {
  const agendados = await varios(
    `SELECT data_hora_inicio AS inicio, data_hora_fim AS fim
     FROM agendamentos
     WHERE status = ANY($3::text[]) AND data_hora_inicio < $2 AND data_hora_fim > $1`,
    [inicio, fim, STATUS_ATIVOS],
  );
  const bloqueados = await varios(
    `SELECT inicio, fim FROM bloqueios WHERE inicio < $2 AND fim > $1`,
    [inicio, fim],
  );
  return {
    ocupados: agendados.map((linha) => ({ inicio: new Date(linha.inicio), fim: new Date(linha.fim) })),
    bloqueados: bloqueados.map((linha) => ({ inicio: new Date(linha.inicio), fim: new Date(linha.fim) })),
  };
}

function sobrepoe(inicio, fim, intervalos) {
  return intervalos.some((item) => item.inicio < fim && item.fim > inicio);
}

function montarSlots({ data, horario, duracaoMin, ocupados, bloqueados, agora }) {
  const fechado = { aberto: false, motivo: 'fechado', slots: [], totalSlots: 0, disponiveis: 0 };
  if (!horario || !horario.ativo) return fechado;

  const abertura = horaParaMinutos(horario.abertura);
  const fechamento = horaParaMinutos(horario.fechamento);
  const passo = Math.max(5, Number(horario.intervalo_min) || config.slotMinutos);
  if (fechamento - abertura < duracaoMin) {
    return { ...fechado, aberto: true, motivo: 'sem_duracao' };
  }

  const diff = diferencaDias(data, hojeISO());
  const slots = [];
  for (let minuto = abertura; minuto + duracaoMin <= fechamento; minuto += passo) {
    const hora = minutosParaHora(minuto);
    const inicio = combinarDataHora(data, hora);
    const fim = new Date(inicio.getTime() + duracaoMin * 60_000);
    let disponivel = true;
    let motivo = null;

    if (diff < 0) {
      disponivel = false;
      motivo = 'passado';
    } else if (diff > config.agendamentoMaxDias) {
      disponivel = false;
      motivo = 'fora_janela';
    } else if (inicio.getTime() < agora.getTime() + ANTECEDENCIA_MIN * 60_000) {
      disponivel = false;
      motivo = 'passado';
    } else if (sobrepoe(inicio, fim, bloqueados)) {
      disponivel = false;
      motivo = 'bloqueado';
    } else if (sobrepoe(inicio, fim, ocupados)) {
      disponivel = false;
      motivo = 'ocupado';
    }

    slots.push({
      hora,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      disponivel,
      motivo,
    });
  }
  return {
    aberto: true,
    motivo: null,
    slots,
    totalSlots: slots.length,
    disponiveis: slots.filter((slot) => slot.disponivel).length,
  };
}

export async function disponibilidade({ data, servicoId, adicionaisIds = [] }) {
  const hoje = hojeISO();
  if (diferencaDias(data, hoje) < 0) throw invalido('Escolha uma data a partir de hoje.', { campo: 'data' });
  if (diferencaDias(data, hoje) > config.agendamentoMaxDias) {
    throw invalido(`Agendamentos permitidos apenas para os próximos ${config.agendamentoMaxDias} dias.`, {
      campo: 'data',
    });
  }

  const servicos = await resolverServicos(servicoId, adicionaisIds);
  const horarios = await carregarHorarios();
  const diaSemana = new Date(`${data}T12:00:00Z`).getUTCDay();
  const horario = horarios.get(diaSemana);
  const inicioDia = localParaUtc(`${data}T00:00`);
  const fimDia = localParaUtc(`${adicionarDias(data, 1)}T00:00`);
  const { ocupados, bloqueados } = await carregarIntervalos(inicioDia, fimDia);
  const dia = montarSlots({
    data,
    horario,
    duracaoMin: servicos.duracaoTotal,
    ocupados,
    bloqueados,
    agora: new Date(),
  });

  return {
    data,
    diaSemana,
    aberto: dia.aberto,
    motivo: dia.motivo,
    slots: dia.slots,
    totalSlots: dia.totalSlots,
    disponiveis: dia.disponiveis,
    servicos: servicos.servicos,
    valorOriginal: servicos.valorOriginal,
    valorTotal: servicos.valorTotal,
    valorDesconto: servicos.valorDesconto,
    promocaoRotulo: servicos.promocaoRotulo,
    avatar: servicos.avatar,
    duracaoTotal: servicos.duracaoTotal,
  };
}



export async function disponibilidadeMes({ mes, servicoId, adicionaisIds = [] }) {
  const info = infoMes(mes);
  const servicos = await resolverServicos(servicoId, adicionaisIds);
  const horarios = await carregarHorarios();
  const inicioMes = localParaUtc(`${info.primeiroISO}T00:00`);
  const fimMes = localParaUtc(`${adicionarDias(info.ultimoISO, 1)}T00:00`);
  const { ocupados, bloqueados } = await carregarIntervalos(inicioMes, fimMes);
  const agora = new Date();

  const dias = [];
  for (let dia = 1; dia <= info.totalDias; dia += 1) {
    const data = `${info.ano}-${String(info.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const diaSemana = new Date(`${data}T12:00:00Z`).getUTCDay();
    const inicioDia = localParaUtc(`${data}T00:00`);
    const fimDia = localParaUtc(`${adicionarDias(data, 1)}T00:00`);
    const resumo = montarSlots({
      data,
      horario: horarios.get(diaSemana),
      duracaoMin: servicos.duracaoTotal,
      ocupados: ocupados.filter((item) => item.inicio < fimDia && item.fim > inicioDia),
      bloqueados: bloqueados.filter((item) => item.inicio < fimDia && item.fim > inicioDia),
      agora,
    });
    dias.push({
      data,
      diaSemana,
      aberto: resumo.aberto,
      motivo: resumo.motivo,
      totalSlots: resumo.totalSlots,
      disponiveis: resumo.disponiveis,
    });
  }

  return {
    mes,
    servicos: servicos.servicos,
    valorOriginal: servicos.valorOriginal,
    valorTotal: servicos.valorTotal,
    valorDesconto: servicos.valorDesconto,
    promocaoRotulo: servicos.promocaoRotulo,
    duracaoTotal: servicos.duracaoTotal,
    dias,
  };
}

export async function validarSlot({ data, hora, servicoId, adicionaisIds = [] }) {
  const resultado = await disponibilidade({ data, servicoId, adicionaisIds });
  if (!resultado.aberto) throw conflito('A barbearia está fechada nesse dia.', 'fechado');
  const slot = resultado.slots.find((item) => item.hora === hora);
  if (!slot) throw invalido('Horário inválido para este serviço. Escolha outro.', { campo: 'hora' });
  if (!slot.disponivel) {
    const mensagens = {
      passado: 'Esse horário já passou. Escolha outro.',
      ocupado: 'Esse horário acabou de ser reservado. Escolha outro.',
      bloqueado: 'Esse horário está bloqueado na agenda.',
      fora_janela: 'Esse horário está fora da janela de agendamento.',
    };
    throw conflito(mensagens[slot.motivo] || 'Horário indisponível.', 'horario_indisponivel');
  }
  return { ...resultado, slot };
}
