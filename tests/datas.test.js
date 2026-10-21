import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adicionarDias,
  combinarDataHora,
  diaSemana,
  diferencaDias,
  horaParaMinutos,
  infoMes,
  localParaUtc,
  minutosParaHora,
} from '../server/utils/datas.js';

test('converte horário de São Paulo para UTC', () => {
  assert.equal(localParaUtc('2026-10-20T15:45').toISOString(), '2026-10-20T18:45:00.000Z');
  assert.equal(localParaUtc('2026-01-15T13:00').toISOString(), '2026-01-15T16:00:00.000Z');
  assert.equal(localParaUtc('2026-06-01').toISOString(), '2026-06-01T03:00:00.000Z');
});

test('combina data e hora locais', () => {
  assert.equal(combinarDataHora('2026-12-24', '09:30').toISOString(), '2026-12-24T12:30:00.000Z');
});

test('calcula dia da semana com 0 = domingo', () => {
  assert.equal(diaSemana('2026-10-20'), 2);
  assert.equal(diaSemana('2026-10-18'), 0);
  assert.equal(diaSemana('2026-10-17'), 6);
});

test('aritmética de datas ISO', () => {
  assert.equal(adicionarDias('2026-10-31', 1), '2026-11-01');
  assert.equal(adicionarDias('2026-03-01', -1), '2026-02-28');
  assert.equal(diferencaDias('2026-11-01', '2026-10-20'), 12);
});

test('converte minutos e horas', () => {
  assert.equal(horaParaMinutos('13:15'), 795);
  assert.equal(minutosParaHora(795), '13:15');
  assert.equal(minutosParaHora(0), '00:00');
});

test('informações do mês', () => {
  const fevereiro = infoMes('2026-02');
  assert.equal(fevereiro.totalDias, 28);
  assert.equal(fevereiro.primeiroISO, '2026-02-01');
  const bissexto = infoMes('2024-02');
  assert.equal(bissexto.totalDias, 29);
});
