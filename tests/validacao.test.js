import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emailValido,
  normalizarEmail,
  uuidValido,
  validarDataISO,
  validarHora,
  validarMes,
  validarSenha,
} from '../server/utils/validacao.js';

test('valida e normaliza e-mail', () => {
  assert.equal(normalizarEmail('  Joao@Email.COM '), 'joao@email.com');
  assert.equal(emailValido('joao@email.com'), true);
  assert.equal(emailValido('joao@email'), false);
  assert.equal(emailValido('sem-arroba'), false);
});

test('valida UUID v4', () => {
  assert.equal(uuidValido('a8bd37b8-666c-495a-8118-9df518b2c1f2'), true);
  assert.equal(uuidValido('123'), false);
  assert.equal(uuidValido('../../etc/passwd'), false);
});

test('valida datas e horários', () => {
  assert.equal(validarDataISO('2026-10-20'), '2026-10-20');
  assert.throws(() => validarDataISO('2026-02-30'));
  assert.equal(validarHora('14:30'), '14:30');
  assert.throws(() => validarHora('24:00'));
  assert.equal(validarMes('2026-10'), '2026-10');
  assert.throws(() => validarMes('2026-13'));
});

test('valida senha com letra e número', () => {
  assert.equal(validarSenha('BarbeCity2026'), 'BarbeCity2026');
  assert.throws(() => validarSenha('12345678'));
  assert.throws(() => validarSenha('curta1'));
});
