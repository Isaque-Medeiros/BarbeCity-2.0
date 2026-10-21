import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aplicarDesconto,
  calcularPrecos,
  escolherPromocao,
  promocaoVigente,
  statusPromocao,
} from '../server/utils/promocoes.js';

const AGORA = new Date('2026-10-20T12:00:00Z');

function promocao(extra = {}) {
  return {
    id: 'p1',
    rotulo: 'Promoção',
    percentual: 20,
    servico_id: null,
    ativo: true,
    inicio: '2026-10-01T00:00:00Z',
    fim: null,
    ...extra,
  };
}

test('aplica desconto com arredondamento de 2 casas', () => {
  assert.equal(aplicarDesconto(30, 20), 24);
  assert.equal(aplicarDesconto(45, 33.333), 30);
  assert.equal(aplicarDesconto(0, 50), 0);
  assert.equal(aplicarDesconto(30, 0), 30);
  assert.equal(aplicarDesconto(30, 100), 0);
  assert.equal(aplicarDesconto('50,00', 10), 45);
});

test('promoção vigente respeita ativo, início e fim', () => {
  assert.equal(promocaoVigente(promocao(), AGORA), true);
  assert.equal(promocaoVigente(promocao({ ativo: false }), AGORA), false);
  assert.equal(promocaoVigente(promocao({ inicio: '2026-11-01T00:00:00Z' }), AGORA), false);
  assert.equal(promocaoVigente(promocao({ fim: '2026-10-19T00:00:00Z' }), AGORA), false);
});

test('promoção do serviço vence a global; maior percentual desempata', () => {
  const lista = [
    promocao({ id: 'global', percentual: 40 }),
    promocao({ id: 'servico', percentual: 20, servico_id: 's1' }),
  ];
  assert.equal(escolherPromocao(lista, 's1', AGORA).id, 'servico');
  assert.equal(escolherPromocao(lista, 's2', AGORA).id, 'global');

  const duasGlobais = [
    promocao({ id: 'menor', percentual: 10 }),
    promocao({ id: 'maior', percentual: 30 }),
  ];
  assert.equal(escolherPromocao(duasGlobais, 's1', AGORA).id, 'maior');
});

test('calcula preços, desconto total e detalhes para o histórico', () => {
  const itens = [
    { id: 's1', nome: 'Corte', preco: 30 },
    { id: 's2', nome: 'Barba', preco: 20 },
  ];
  const promocoes = [
    promocao({ id: 'corte', rotulo: 'Corte em promoção', percentual: 50, servico_id: 's1' }),
  ];
  const resultado = calcularPrecos(itens, promocoes, AGORA);
  assert.equal(resultado.valorOriginal, 50);
  assert.equal(resultado.valorTotal, 35);
  assert.equal(resultado.valorDesconto, 15);
  assert.equal(resultado.itens[0].preco, 15);
  assert.equal(resultado.itens[1].preco, 20);
  assert.equal(resultado.promocaoRotulo, 'Corte em promoção');
  assert.equal(resultado.promocaoDetalhes.itens.length, 1);
  assert.equal(resultado.promocaoDetalhes.itens[0].valorDesconto, 15);
});

test('sem promoção, o total é o preço cheio', () => {
  const resultado = calcularPrecos([{ id: 's1', nome: 'Corte', preco: 30 }], [], AGORA);
  assert.equal(resultado.valorTotal, 30);
  assert.equal(resultado.valorDesconto, 0);
  assert.equal(resultado.promocaoDetalhes, null);
});

test('status exibido no painel', () => {
  assert.equal(statusPromocao(promocao(), AGORA), 'ativa');
  assert.equal(statusPromocao(promocao({ ativo: false }), AGORA), 'encerrada');
  assert.equal(statusPromocao(promocao({ inicio: '2026-11-01T00:00:00Z' }), AGORA), 'agendada');
  assert.equal(statusPromocao(promocao({ fim: '2026-10-01T00:00:00Z' }), AGORA), 'expirada');
});
