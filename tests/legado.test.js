import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapearCategoria,
  mapearDiaSemanaLegado,
  mapearStatusLegado,
  normalizarAgendamentoLegado,
  normalizarServicoLegado,
} from '../server/db/legado.js';
import { localParaUtc } from '../server/utils/datas.js';

const agora = new Date('2026-10-20T18:00:00.000Z');

test('mapeia categoria legada', () => {
  assert.equal(mapearCategoria('principal'), 'individual');
  assert.equal(mapearCategoria('adicional'), 'outros');
  assert.equal(mapearCategoria('combo'), 'combo');
  assert.equal(mapearCategoria(undefined), 'individual');
});

test('converte dia da semana legado (0=segunda) para JS (0=domingo)', () => {
  assert.equal(mapearDiaSemanaLegado(0), 1);
  assert.equal(mapearDiaSemanaLegado(1), 2);
  assert.equal(mapearDiaSemanaLegado(5), 6);
  assert.equal(mapearDiaSemanaLegado(6), 0);
  assert.equal(mapearDiaSemanaLegado(9), null);
});

test('aplica a regra aprovada de status do histórico', () => {
  const passado = new Date('2026-10-01T12:00:00Z');
  const futuro = new Date('2026-11-01T12:00:00Z');
  assert.equal(mapearStatusLegado('agendado', passado, agora), 'concluido');
  assert.equal(mapearStatusLegado('agendado', futuro, agora), 'confirmado');
  assert.equal(mapearStatusLegado('concluido', passado, agora), 'concluido');
  assert.equal(mapearStatusLegado('cancelado', passado, agora), 'cancelado');
  assert.equal(mapearStatusLegado('ausente', passado, agora), 'ausente');
});

test('normaliza serviço legado', () => {
  const servico = normalizarServicoLegado({
    id: 14,
    nome: 'Barba + Corte',
    descricao: 'Barba completa com corte social',
    duracao_minutos: 50,
    valor: 50,
    ativo: 1,
    tipo: 'combo',
  });
  assert.equal(servico.legadoId, 14);
  assert.equal(servico.categoria, 'combo');
  assert.equal(servico.preco, 50);
  assert.equal(servico.duracaoMin, 50);
  assert.equal(servico.ativo, true);
});

test('normaliza agendamento legado preservando dados de origem', () => {
  const inicio = localParaUtc('2026-10-20T15:45:00');
  const fim = localParaUtc('2026-10-20T16:30:00');
  const item = normalizarAgendamentoLegado(
    {
      id: '8fc52b0a-6041-4447-a5ca-ba42c2302d6e',
      hash_id: 'db293c8dd1',
      cliente_nome: 'Cliente Exemplo',
      servico_id: 6,
      valor_original: 30,
      valor_pago: 0,
      data_hora_inicio: '2026-10-20T15:45:00',
      data_hora_fim: '2026-10-20T16:30:00',
      status: 'agendado',
      telefone_contato: '11999999999',
      nota_opcional: '',
      created_at: '2026-10-20T16:07:08.848911',
      updated_at: '2026-10-20T16:07:08.848911',
    },
    { agora, dataInicio: inicio, dataFim: fim },
  );
  assert.equal(item.codigoPublico, 'db293c8dd1');
  assert.equal(item.status, 'confirmado');
  assert.equal(item.telefoneCliente, '5511999999999');
  assert.equal(item.duracaoMin, 45);
  assert.equal(item.dadosOrigem.servico_id, 6);
});
