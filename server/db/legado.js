import { normalizarTelefone } from '../utils/telefone.js';
import { localParaUtc } from '../utils/datas.js';

export const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export function mapearCategoria(tipoLegado) {
  const tipo = String(tipoLegado ?? '').toLowerCase();
  if (tipo === 'combo') return 'combo';
  if (tipo === 'adicional' || tipo === 'outros') return 'outros';
  return 'individual';
}

export function slugificar(valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function iconePorTipo(nome, categoria) {
  const texto = slugificar(nome);
  if (texto.includes('hidrat')) return 'droplet';
  if (texto.includes('botox')) return 'flask';
  if (texto.includes('luz')) return 'highlights';
  if (texto.includes('sobrancelha')) return 'eyebrow';
  if (texto.includes('barba')) return texto.includes('corte') ? 'combo' : 'razor';
  if (categoria === 'combo') return 'combo';
  return 'scissors';
}

/**
 * Regra aprovada para o histórico:
 * - "agendado" no passado  -> concluido
 * - "agendado" no futuro   -> confirmado
 * - demais status são preservados; o valor original fica em `legado_status`.
 */
export function mapearStatusLegado(statusLegado, dataHoraFim, agora = new Date()) {
  const status = String(statusLegado ?? '').toLowerCase().trim();
  if (status === 'cancelado') return 'cancelado';
  if (status === 'ausente') return 'ausente';
  if (status === 'concluido' || status === 'concluído') return 'concluido';
  if (status === 'agendado' || status === 'confirmado') {
    return new Date(dataHoraFim).getTime() < agora.getTime() ? 'concluido' : 'confirmado';
  }
  if (status === 'pendente') return 'pendente';
  return new Date(dataHoraFim).getTime() < agora.getTime() ? 'concluido' : 'confirmado';
}

/** Legado: 0 = segunda ... 6 = domingo. PostgreSQL/JS: 0 = domingo ... 6 = sábado. */
export function mapearDiaSemanaLegado(diaLegado) {
  const dia = Number(diaLegado);
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) return null;
  return (dia + 1) % 7;
}

export function normalizarServicoLegado(servico) {
  const categoria = mapearCategoria(servico.tipo);
  return {
    legadoId: Number(servico.id),
    slug: slugificar(servico.nome),
    nome: String(servico.nome ?? '').trim(),
    descricao: String(servico.descricao ?? '').trim() || null,
    preco: Number(servico.valor) || 0,
    duracaoMin: Number(servico.duracao_minutos) || 30,
    categoria,
    icone: iconePorTipo(servico.nome, categoria),
    destaque: categoria === 'combo',
    ativo: Boolean(servico.ativo),
    ordem: Number(servico.id) || 0,
  };
}

export function normalizarAgendamentoLegado(item, { agora = new Date(), dataInicio, dataFim } = {}) {
  const inicio = dataInicio ?? null;
  const fim = dataFim ?? null;
  const duracao = inicio && fim ? Math.round((fim.getTime() - inicio.getTime()) / 60_000) : 0;
  const telefone = normalizarTelefone(item.telefone_contato);
  return {
    id: item.id,
    codigoPublico: String(item.hash_id ?? '').trim(),
    servicoLegadoId: Number(item.servico_id),
    nomeCliente: String(item.cliente_nome ?? '').trim(),
    telefoneCliente: telefone,
    telefoneValido: /^55\d{10,11}$/.test(telefone),
    inicio,
    fim,
    duracaoMin: duracao > 0 ? duracao : 30,
    valorOriginal: Number(item.valor_original) || 0,
    valorPago: Number(item.valor_pago) || 0,
    status: mapearStatusLegado(item.status, fim, agora),
    legadoStatus: String(item.status ?? '').trim() || null,
    observacao: String(item.nota_opcional ?? '').trim() || null,
    adicionaisLegado: String(item.servicos_adicionais ?? '').trim(),
    criadoEm: item.created_at ? localParaUtc(String(item.created_at).replace(/(\.\d+)?$/, '')) : null,
    atualizadoEm: item.updated_at ? localParaUtc(String(item.updated_at).replace(/(\.\d+)?$/, '')) : null,
    dadosOrigem: item,
  };
}
