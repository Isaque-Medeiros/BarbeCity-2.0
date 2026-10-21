import test from 'node:test';
import assert from 'node:assert/strict';
import { RotacaoChaves } from '../server/utils/rotacao-chaves.js';

test('roda em round-robin entre as chaves válidas', () => {
  const rotacao = new RotacaoChaves({ chaves: ['a', 'b', 'c'], agora: () => 0 });
  assert.equal(rotacao.proxima(), 'a');
  assert.equal(rotacao.proxima(), 'b');
  assert.equal(rotacao.proxima(), 'c');
  assert.equal(rotacao.proxima(), 'a');
});

test('chave em 429 sai da rotação e volta após o cooldown', () => {
  let agora = 0;
  const rotacao = new RotacaoChaves({ chaves: ['a', 'b'], cooldownMs: 1000, agora: () => agora });
  assert.equal(rotacao.proxima(), 'a');
  rotacao.marcarCooldown('a');
  assert.equal(rotacao.emCooldown('a'), true);
  assert.equal(rotacao.proxima(), 'b');
  assert.equal(rotacao.proxima(), 'b');
  agora = 1001;
  assert.equal(rotacao.emCooldown('a'), false);
  const proximas = [rotacao.proxima(), rotacao.proxima()];
  assert.equal(proximas.includes('a'), true);
});

test('chave inválida (401/403) não volta', () => {
  const rotacao = new RotacaoChaves({ chaves: ['a', 'b'], agora: () => 0 });
  rotacao.invalidar('a');
  assert.equal(rotacao.proxima(), 'b');
  assert.equal(rotacao.proxima(), 'b');
  assert.equal(rotacao.disponiveis().includes('a'), false);
});

test('todas em cooldown devolvem null', () => {
  const rotacao = new RotacaoChaves({ chaves: ['a', 'b'], agora: () => 0 });
  rotacao.marcarCooldown('a');
  rotacao.marcarCooldown('b');
  assert.equal(rotacao.proxima(), null);
});

test('não expõe a chave, apenas a posição', () => {
  const rotacao = new RotacaoChaves({ chaves: ['segredo-a', 'segredo-b'], agora: () => 0 });
  assert.equal(rotacao.indiceDe('segredo-a'), 1);
  assert.equal(rotacao.indiceDe('segredo-b'), 2);
  assert.equal(rotacao.indiceDe('inexistente'), 0);
});

test('chaves vazias são ignoradas e deduplicadas', () => {
  const rotacao = new RotacaoChaves({ chaves: ['a', ' a ', '', null, 'b'], agora: () => 0 });
  assert.equal(rotacao.total, 2);
});
