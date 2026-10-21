import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  mapearStatusLegado,
  normalizarAgendamentoLegado,
  normalizarServicoLegado,
} from '../server/db/legado.js';
import { localParaUtc } from '../server/utils/datas.js';

const raiz = path.resolve(import.meta.dirname, '..');
const ler = (nome) => JSON.parse(fs.readFileSync(path.join(raiz, 'legacy', nome), 'utf8'));

const servicos = ler('servicos.json');
const horarios = ler('configuracao_horarios.json');

// Dados reais de clientes não são versionados (LGPD). Os testes que dependem
// do histórico são pulados em um clone sem `legacy/agendamentos.json`.
const caminhoAgendamentos = path.join(raiz, 'legacy', 'agendamentos.json');
const temAgendamentos = fs.existsSync(caminhoAgendamentos);
const agendamentos = temAgendamentos ? ler('agendamentos.json') : [];

test('preserva os 135 agendamentos e 9 serviços legados', { skip: !temAgendamentos }, () => {
  assert.equal(agendamentos.length, 135);
  assert.equal(servicos.length, 9);
});

test('todos os agendamentos apontam para um serviço existente', { skip: !temAgendamentos }, () => {
  const ids = new Set(servicos.map((servico) => Number(servico.id)));
  for (const agendamento of agendamentos) {
    assert.ok(ids.has(Number(agendamento.servico_id)), `serviço ${agendamento.servico_id} ausente`);
  }
});

test('não há sobreposição de horários no histórico', { skip: !temAgendamentos }, () => {
  const intervalos = agendamentos
    .map((item) => ({
      inicio: localParaUtc(item.data_hora_inicio).getTime(),
      fim: localParaUtc(item.data_hora_fim).getTime(),
    }))
    .sort((a, b) => a.inicio - b.inicio);
  for (let i = 1; i < intervalos.length; i += 1) {
    assert.ok(intervalos[i].inicio >= intervalos[i - 1].fim, `sobreposição no índice ${i}`);
  }
});

test('a regra de status produz apenas status válidos', { skip: !temAgendamentos }, () => {
  const agora = new Date('2026-10-20T18:00:00Z');
  const permitidos = new Set(['pendente', 'confirmado', 'concluido', 'cancelado', 'ausente']);
  for (const item of agendamentos) {
    const fim = localParaUtc(item.data_hora_fim);
    const status = mapearStatusLegado(item.status, fim, agora);
    assert.ok(permitidos.has(status), `status inválido: ${status}`);
  }
});

test('normalização preserva id, telefone e valores', { skip: !temAgendamentos }, () => {
  for (const bruto of agendamentos.slice(0, 10)) {
    const inicio = localParaUtc(bruto.data_hora_inicio);
    const fim = localParaUtc(bruto.data_hora_fim);
    const item = normalizarAgendamentoLegado(bruto, { dataInicio: inicio, dataFim: fim });
    assert.equal(item.id, bruto.id);
    assert.equal(item.codigoPublico, bruto.hash_id);
    assert.equal(item.valorOriginal, Number(bruto.valor_original));
    assert.equal(item.valorPago, Number(bruto.valor_pago));
    assert.ok(item.telefoneCliente.startsWith('55'));
  }
});

test('horários legados são convertidos para o padrão JS', () => {
  const ativos = horarios.filter((horario) => horario.ativo);
  assert.equal(ativos.length, 6);
  assert.equal(horarios.find((horario) => horario.dia_semana === 0).ativo, 0);
});

test('serviços legados cobrem as categorias esperadas', () => {
  const categorias = new Set(servicos.map((servico) => normalizarServicoLegado(servico).categoria));
  assert.deepEqual([...categorias].sort(), ['combo', 'individual', 'outros']);
});
