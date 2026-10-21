import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITES,
  contraste,
  sanitizarCss,
  sanitizarHtml,
  sanitizarTema,
  verificarContraste,
} from '../server/utils/tema.js';

test('remove scripts, eventos e tags perigosas', () => {
  const resultado = sanitizarHtml(
    '<div class="bcity-tema-faixa" onclick="alert(1)"><script>alert(1)</script><strong>Olá</strong><iframe src="x"></iframe></div>',
  );
  assert.equal(resultado.html.includes('<script'), false);
  assert.equal(resultado.html.includes('onclick'), false);
  assert.equal(resultado.html.includes('<iframe'), false);
  assert.equal(resultado.html.includes('alert(1)'), false);
  assert.equal(resultado.html.includes('<strong>Olá</strong>'), true);
  assert.equal(resultado.html.includes('class="bcity-tema-faixa"'), true);
});

test('remove classes fora do prefixo e imagens externas', () => {
  const resultado = sanitizarHtml('<img src="https://x/y.png"><div class="evil bcity-tema-bloco">Texto</div>');
  assert.equal(resultado.html.includes('<img'), false);
  assert.equal(resultado.html.includes('evil'), false);
  assert.equal(resultado.html.includes('bcity-tema-bloco'), true);
});

test('escapa texto e fecha tags abertas', () => {
  const resultado = sanitizarHtml('<div class="bcity-tema-x"><strong>1 < 2</strong>');
  assert.equal(resultado.html.includes('1 &lt; 2'), true);
  assert.equal(resultado.html.endsWith('</div>'), true);
});

test('escopa o CSS em #bcity-tema-ativo', () => {
  const resultado = sanitizarCss(
    '.bcity-tema-faixa{display:flex;color:#ffffff;background-color:#b91c1c;border-radius:16px}',
  );
  assert.equal(resultado.css.includes('#bcity-tema-ativo .bcity-tema-faixa'), true);
  assert.equal(resultado.css.includes('#b91c1c'), true);
});

test('bloqueia position, url(), @import, !important e seletores globais', () => {
  const resultado = sanitizarCss(`
    @import url('https://evil');
    body { color: #000000; }
    .bcity-tema-x { position: fixed; top: 0; z-index: 999; background-image: url(https://evil); color: #ffffff !important; }
    .bcity-tema-y { color: #ffffff; background-color: #000000; }
  `);
  assert.equal(resultado.css.includes('position'), false);
  assert.equal(resultado.css.includes('z-index'), false);
  assert.equal(resultado.css.includes('url('), false);
  assert.equal(resultado.css.includes('!important'), false);
  assert.equal(resultado.css.includes('body'), false);
  assert.equal(resultado.css.includes('#bcity-tema-ativo .bcity-tema-y'), true);
});

test('CSS com url em linear-gradient é rejeitado sem derrubar o resto', () => {
  const resultado = sanitizarCss('.bcity-tema-x{background-image:url(x);color:#ffffff}');
  assert.equal(resultado.css.includes('url'), false);
  assert.equal(resultado.css.includes('color: #ffffff'), true);
});

test('contraste mínimo é verificado', () => {
  assert.equal(contraste([255, 255, 255], [0, 0, 0]) > 4.5, true);
  assert.equal(verificarContraste('#bcity-tema-ativo .x{color:#111111;background-color:#000000}').ok, false);
  assert.equal(verificarContraste('#bcity-tema-ativo .x{color:#ffffff;background-color:#000000}').ok, true);
});

test('classes reservadas do contêiner não podem ser usadas', () => {
  const html = sanitizarHtml('<div class="bcity-tema-fechar bcity-tema-faixa">Texto</div>');
  assert.equal(html.html.includes('bcity-tema-fechar'), false);
  assert.equal(html.html.includes('bcity-tema-faixa'), true);

  const css = sanitizarCss('.bcity-tema-fechar{display:none}.bcity-tema-ativo{color:#ffffff}');
  assert.equal(css.css.includes('.bcity-tema-fechar'), false);
  assert.equal(css.css.includes('.bcity-tema-ativo'), false);
});

test('sanitizarTema aceita um tema válido e rejeita contraste ruim', () => {
  const bom = sanitizarTema({
    html: '<div class="bcity-tema-faixa"><strong>Feliz Dia das Crianças</strong></div>',
    css: '.bcity-tema-faixa{display:flex;padding:18px;color:#ffffff;background-color:#b91c1c;border-radius:16px}',
  });
  assert.equal(bom.ok, true);
  assert.equal(bom.html.includes('Feliz Dia das Crianças'), true);

  const ruim = sanitizarTema({
    html: '<div class="bcity-tema-faixa">Texto</div>',
    css: '.bcity-tema-faixa{color:#222222;background-color:#000000}',
  });
  assert.equal(ruim.ok, false);
  assert.equal(ruim.motivo, 'contraste_insuficiente');
});

test('limites de tamanho são aplicados', () => {
  const htmlGrande = `<div class="bcity-tema-x">${'a'.repeat(LIMITES.html + 500)}</div>`;
  const resultado = sanitizarHtml(htmlGrande);
  assert.equal(resultado.html.length <= LIMITES.html, true);
  assert.equal(resultado.avisos.includes('html_truncado'), true);
});
