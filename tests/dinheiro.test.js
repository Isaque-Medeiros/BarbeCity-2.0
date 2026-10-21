import test from 'node:test';
import assert from 'node:assert/strict';
import { arredondar, calcularTroco, paraNumero, somar } from '../server/utils/dinheiro.js';

test('converte valores em formato brasileiro', () => {
  assert.equal(paraNumero('R$ 1.234,56'), 1234.56);
  assert.equal(paraNumero('30,5'), 30.5);
  assert.equal(paraNumero(''), 0);
  assert.equal(paraNumero(null), 0);
});

test('arredonda para duas casas', () => {
  assert.equal(arredondar(0.1 + 0.2), 0.3);
});

test('calcula troco', () => {
  assert.equal(calcularTroco(100, 60), 40);
  assert.equal(calcularTroco(50, 60), 0);
  assert.equal(calcularTroco(0, 60), null);
});

test('soma valores monetários', () => {
  assert.equal(somar([30, '20', 10.5]), 60.5);
});
