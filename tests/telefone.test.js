import test from 'node:test';
import assert from 'node:assert/strict';
import { formatarTelefone, normalizarTelefone, telefoneParcial, telefoneValido } from '../server/utils/telefone.js';

test('normaliza telefones brasileiros variados', () => {
  assert.equal(normalizarTelefone('(11) 99999-9999'), '5511999999999');
  assert.equal(normalizarTelefone('11 98888 7777'), '5511988887777');
  assert.equal(normalizarTelefone('55 11 97777-6666'), '5511977776666');
  assert.equal(normalizarTelefone('11999999999'), '5511999999999');
  assert.equal(normalizarTelefone('+55 (11) 91504-0871'), '5511915040871');
});

test('valida telefone com DDD', () => {
  assert.equal(telefoneValido('11 99999-0000'), true);
  assert.equal(telefoneValido('123'), false);
  assert.equal(telefoneValido(''), false);
});

test('formata telefone para exibição', () => {
  assert.equal(formatarTelefone('5511999999999'), '(11) 99999-9999');
  assert.equal(formatarTelefone('551133334444'), '(11) 3333-4444');
});

test('mascara telefone para consulta pública', () => {
  assert.equal(telefoneParcial('5511999999999'), '****9999');
});
