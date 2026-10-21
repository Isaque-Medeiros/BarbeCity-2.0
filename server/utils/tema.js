/**
 * Sanitizador do tema gerado por IA.
 *
 * É a barreira que garante que o tema é apenas uma "máscara": não executa
 * scripts, não usa imagens/URLs externas, não posiciona elementos sobre o site
 * e não altera componentes existentes (todo CSS é escopado em #bcity-tema-ativo).
 *
 * Funções puras (sem DOM e sem banco) para serem testadas em `tests/`.
 */

export const TAGS_PERMITIDAS = new Set([
  'div',
  'section',
  'span',
  'p',
  'strong',
  'em',
  'h2',
  'h3',
  'ul',
  'li',
  'br',
]);

const TAGS_DESCARTAVEIS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'template',
  'noscript',
  'link',
  'meta',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'img',
  'video',
  'audio',
  'canvas',
  'picture',
  'source',
  'base',
]);

const TAGS_VAZIAS = new Set(['img', 'input', 'meta', 'link', 'source', 'embed']);

const CLASSES_RESERVADAS = new Set(['bcity-tema-fechar', 'bcity-tema-ativo', 'bcity-tema-wrap']);

const PROPRIEDADES_PERMITIDAS = new Set([
  'color',
  'background',
  'background-color',
  'background-image',
  'border',
  'border-color',
  'border-width',
  'border-style',
  'border-radius',
  'box-shadow',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'font-size',
  'font-weight',
  'font-style',
  'font-family',
  'letter-spacing',
  'line-height',
  'text-align',
  'text-transform',
  'text-shadow',
  'display',
  'align-items',
  'justify-content',
  'flex-wrap',
  'flex-direction',
  'gap',
  'row-gap',
  'column-gap',
  'width',
  'max-width',
  'height',
  'max-height',
  'opacity',
]);

const DISPLAY_PERMITIDOS = new Set(['block', 'flex', 'inline-flex', 'inline-block', 'grid', 'none']);
const TEXTO_ALINHAMENTO = new Set(['left', 'center', 'right']);
const TRANSFORMACOES = new Set(['none', 'uppercase', 'lowercase', 'capitalize']);
const ALINHAMENTOS = new Set(['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'stretch']);
const DIRECOES = new Set(['row', 'column', 'row-reverse', 'column-reverse']);
const FAMILIAS_FONTE = /^(inter|system-ui|sans-serif|serif|georgia|arial|helvetica|playfair display|inherit)$/;
const PSEUDO_PERMITIDO = /:(?:first-child|last-child|nth-child\(\s*\d+\s*\)|hover)/;

export const LIMITES = {
  html: 8192,
  css: 8192,
  regras: 60,
  declaracoes: 80,
  classes: 20,
  texto: 4000,
};

function escaparTexto(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function classesValidas(token) {
  const atributo = token.match(/\sclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if (!atributo) return [];
  const bruto = atributo[1] ?? atributo[2] ?? atributo[3] ?? '';
  const classes = bruto
    .split(/\s+/)
    .filter((classe) => /^bcity-tema-[a-z0-9-]{1,40}$/.test(classe) && !CLASSES_RESERVADAS.has(classe));
  return [...new Set(classes)].slice(0, LIMITES.classes);
}

/**
 * Remove tudo que não faz parte do contrato e devolve HTML seguro.
 */
export function sanitizarHtml(html) {
  const avisos = [];
  if (typeof html !== 'string' || !html.trim()) return { html: '', avisos: ['html_vazio'] };

  let entrada = html.slice(0, LIMITES.html * 2);
  entrada = entrada
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<!doctype[^>]*>/gi, '');

  const tokens = entrada.match(/<(?=[a-zA-Z/!])[^>]*>|[^<]+|</g) || [];
  const pilha = [];
  const saida = [];
  let descartando = 0;
  let tagDescartada = null;

  for (const token of tokens) {
    if (token.startsWith('<')) {
      const fechamento = /^<\s*\//.test(token);
      const nome = (token.match(/^<\s*\/?\s*([a-zA-Z0-9-]+)/) || [])[1]?.toLowerCase();
      if (!nome) {
        if (descartando === 0) {
          const texto = escaparTexto(token.replace(/\s+/g, ' '));
          if (texto) saida.push(texto);
        }
        continue;
      }

      if (descartando > 0) {
        if (nome === tagDescartada) descartando += fechamento ? -1 : 1;
        continue;
      }

      if (TAGS_DESCARTAVEIS.has(nome)) {
        if (!fechamento && !TAGS_VAZIAS.has(nome) && !/\/\s*>$/.test(token)) {
          tagDescartada = nome;
          descartando = 1;
        }
        avisos.push(`tag_removida:${nome}`);
        continue;
      }

      if (!TAGS_PERMITIDAS.has(nome)) {
        avisos.push(`tag_ignorada:${nome}`);
        continue;
      }

      if (fechamento) {
        const posicao = pilha.lastIndexOf(nome);
        if (posicao === -1) continue;
        while (pilha.length > posicao) saida.push(`</${pilha.pop()}>`);
        continue;
      }

      const classes = classesValidas(token);
      if (nome === 'br') {
        saida.push('<br>');
        continue;
      }
      saida.push(`<${nome}${classes.length ? ` class="${classes.join(' ')}"` : ''}>`);
      pilha.push(nome);
      continue;
    }

    if (descartando > 0) continue;
    const texto = escaparTexto(token.replace(/\s+/g, ' '));
    if (texto) saida.push(texto);
  }

  while (pilha.length > 0) saida.push(`</${pilha.pop()}>`);

  let resultado = saida.join('').trim();
  if (resultado.length > LIMITES.html) {
    resultado = resultado.slice(0, LIMITES.html);
    resultado = resultado.replace(/<[^>]*$/, '');
    avisos.push('html_truncado');
  }

  return { html: resultado, avisos };
}

function seletorValido(seletor) {
  const partes = seletor
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean);
  const validos = [];

  for (const parte of partes) {
    if (parte.length > 160) continue;
    if (!/^[.a-zA-Z0-9\s>+~:()-]+$/.test(parte)) continue;
    const compostos = parte.split(/([\s>+~]+)/).filter(Boolean);
    let ok = true;

    for (const composto of compostos) {
      if (/^[\s>+~]+$/.test(composto)) continue;
      if (!composto.startsWith('.bcity-tema-')) {
        ok = false;
        break;
      }
      const classes = composto.match(/\.bcity-tema-[a-z0-9-]+/g) || [];
      if (classes.some((classe) => CLASSES_RESERVADAS.has(classe.slice(1)))) {
        ok = false;
        break;
      }
      const semPseudo = composto.replace(PSEUDO_PERMITIDO, '');
      if (!/^\.bcity-tema-[a-z0-9-]+$/.test(semPseudo)) {
        ok = false;
        break;
      }
    }

    if (ok) validos.push(parte);
  }

  return validos;
}

function numeroSeguro(valor, { min = 0, max = 1200 } = {}) {
  const achado = String(valor).match(/-?\d+(?:\.\d+)?/);
  if (!achado) return false;
  const numero = Number(achado[0]);
  return Number.isFinite(numero) && numero >= min && numero <= max;
}

function valorValido(propriedade, valorOriginal) {
  const valor = String(valorOriginal ?? '').trim();
  if (!valor || valor.length > 200) return false;
  if (!/^[a-zA-Z0-9#%.,()\s\-\/]+$/.test(valor)) return false;
  if (/url\s*\(|expression|javascript:|behavior|-moz-binding|@import|!important/i.test(valor)) return false;

  switch (propriedade) {
    case 'display':
      return DISPLAY_PERMITIDOS.has(valor.toLowerCase());
    case 'text-align':
      return TEXTO_ALINHAMENTO.has(valor.toLowerCase());
    case 'text-transform':
      return TRANSFORMACOES.has(valor.toLowerCase());
    case 'align-items':
    case 'justify-content':
      return ALINHAMENTOS.has(valor.toLowerCase()) || /^flex-(start|end)$/.test(valor);
    case 'flex-direction':
      return DIRECOES.has(valor.toLowerCase());
    case 'flex-wrap':
      return ['wrap', 'nowrap', 'wrap-reverse'].includes(valor.toLowerCase());
    case 'font-family':
      return FAMILIAS_FONTE.test(valor.toLowerCase().replace(/['"]/g, '').split(',')[0].trim());
    case 'font-size':
      return numeroSeguro(valor, { min: 8, max: 48 });
    case 'width':
    case 'max-width':
    case 'height':
    case 'max-height':
      return valor.endsWith('%')
        ? numeroSeguro(valor, { min: 0, max: 100 })
        : numeroSeguro(valor, { min: 0, max: 1200 });
    case 'gap':
    case 'row-gap':
    case 'column-gap':
      return numeroSeguro(valor, { min: 0, max: 48 });
    case 'border-radius':
      return numeroSeguro(valor, { min: 0, max: 200 });
    case 'opacity': {
      const numero = Number(valor);
      return Number.isFinite(numero) && numero >= 0 && numero <= 1;
    }
    case 'letter-spacing':
      return numeroSeguro(valor, { min: -2, max: 10 });
    case 'line-height':
      return numeroSeguro(valor, { min: 0.8, max: 3 });
    case 'font-weight':
      return /^(normal|bold|[1-9]00)$/.test(valor.toLowerCase());
    case 'padding':
    case 'padding-top':
    case 'padding-right':
    case 'padding-bottom':
    case 'padding-left':
    case 'margin':
    case 'margin-top':
    case 'margin-right':
    case 'margin-bottom':
    case 'margin-left':
      return numeroSeguro(valor, { min: -20, max: 120 });
    case 'background-image':
      return /^linear-gradient\(/i.test(valor) && !/url/i.test(valor);
    default:
      return true;
  }
}

/**
 * Sanitiza o CSS e escopa tudo em #bcity-tema-ativo.
 */
export function sanitizarCss(css) {
  const avisos = [];
  if (typeof css !== 'string' || !css.trim()) return { css: '', avisos: ['css_vazio'] };

  let entrada = css.slice(0, LIMITES.css * 2);
  entrada = entrada.replace(/\/\*[\s\S]*?\*\//g, '');
  entrada = entrada.replace(/@[^;{}]*;/g, ' ').replace(/@[^{}]*\{[^{}]*\}/g, ' ');

  const regras = [];
  const regex = /([^{}]+)\{([^{}]*)\}/g;
  let encontrado;
  let totalRegras = 0;

  while ((encontrado = regex.exec(entrada)) !== null) {
    if (totalRegras >= LIMITES.regras) {
      avisos.push('limite_de_regras');
      break;
    }
    const seletores = seletorValido(encontrado[1]);
    if (seletores.length === 0) {
      avisos.push('seletor_ignorado');
      continue;
    }

    const declaracoes = [];
    for (const bruta of encontrado[2].split(';')) {
      if (declaracoes.length >= LIMITES.declaracoes) {
        avisos.push('limite_declaracoes');
        break;
      }
      const separador = bruta.indexOf(':');
      if (separador === -1) continue;
      const propriedade = bruta.slice(0, separador).trim().toLowerCase();
      const valor = bruta.slice(separador + 1).trim();
      if (!PROPRIEDADES_PERMITIDAS.has(propriedade)) {
        avisos.push(`propriedade_ignorada:${propriedade}`);
        continue;
      }
      if (!valorValido(propriedade, valor)) {
        avisos.push(`valor_ignorado:${propriedade}`);
        continue;
      }
      declaracoes.push(`${propriedade}: ${valor}`);
    }

    if (declaracoes.length === 0) continue;
    totalRegras += 1;
    const escopados = seletores.map((seletor) => `#bcity-tema-ativo ${seletor}`).join(',\n');
    regras.push(`${escopados} {\n  ${declaracoes.join(';\n  ')};\n}`);
  }

  let resultado = regras.join('\n');
  if (resultado.length > LIMITES.css) {
    resultado = '';
    avisos.push('css_truncado');
  }

  return { css: resultado, avisos };
}

const CORES_NOMEADAS = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  red: [255, 0, 0],
  gold: [255, 215, 0],
  yellow: [255, 255, 0],
  orange: [255, 165, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  purple: [128, 0, 128],
  pink: [255, 192, 203],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  silver: [192, 192, 192],
  transparent: null,
};

function corParaRgb(valor) {
  const texto = String(valor ?? '').trim().toLowerCase();
  const hex = texto.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/);
  if (hex) {
    let codigo = hex[1];
    if (codigo.length === 3) codigo = codigo.split('').map((parte) => parte + parte).join('');
    return [
      parseInt(codigo.slice(0, 2), 16),
      parseInt(codigo.slice(2, 4), 16),
      parseInt(codigo.slice(4, 6), 16),
    ];
  }
  const rgb = texto.match(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const nome = texto.match(/\b([a-z]+)\b/);
  if (nome && Object.prototype.hasOwnProperty.call(CORES_NOMEADAS, nome[1])) {
    return CORES_NOMEADAS[nome[1]];
  }
  return null;
}

function luminancia([r, g, b]) {
  const canais = [r, g, b].map((canal) => {
    const proporcao = canal / 255;
    return proporcao <= 0.03928 ? proporcao / 12.92 : ((proporcao + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

export function contraste(corA, corB) {
  const a = luminancia(corA);
  const b = luminancia(corB);
  const maior = Math.max(a, b);
  const menor = Math.min(a, b);
  return (maior + 0.05) / (menor + 0.05);
}

/**
 * Confere se existe pelo menos uma combinação texto/fundo legível.
 * Quando a IA não define fundo, consideramos o fundo escuro e o branco do site.
 */
export function verificarContraste(css, { minimo = 4.5 } = {}) {
  if (typeof css !== 'string' || !css.trim()) return { ok: true, motivo: 'sem_css' };

  const textos = [];
  const fundos = [];
  const regex = /(^|[{;\s])(color|background-color|background)\s*:\s*([^;}]+)/gi;
  let achado;

  while ((achado = regex.exec(css)) !== null) {
    const propriedade = achado[2].toLowerCase();
    const cor = corParaRgb(achado[3]);
    if (!cor) continue;
    if (propriedade === 'color') textos.push(cor);
    else fundos.push(cor);
  }

  if (textos.length === 0) return { ok: true, motivo: 'sem_cores_de_texto' };

  const candidatos = fundos.length > 0 ? fundos : [[11, 11, 12], [255, 255, 255]];
  const melhor = Math.max(
    ...textos.map((texto) => Math.max(...candidatos.map((fundo) => contraste(texto, fundo)))),
  );

  return melhor >= minimo
    ? { ok: true, contraste: Number(melhor.toFixed(2)) }
    : { ok: false, motivo: 'contraste_insuficiente', contraste: Number(melhor.toFixed(2)) };
}

/**
 * Pipeline completo: HTML seguro + CSS escopado + checagem de contraste.
 * Não lança exceção; o chamador decide como responder ao admin.
 */
export function sanitizarTema({ html, css } = {}) {
  const limpoHtml = sanitizarHtml(html);
  const limpoCss = sanitizarCss(css);
  const avisos = [...limpoHtml.avisos, ...limpoCss.avisos];

  if (!limpoHtml.html) {
    return { ok: false, motivo: 'html_ausente', html: '', css: limpoCss.css, avisos };
  }
  if (!limpoCss.css) {
    return { ok: false, motivo: 'css_ausente', html: limpoHtml.html, css: '', avisos };
  }

  const resultadoContraste = verificarContraste(limpoCss.css);
  if (!resultadoContraste.ok) {
    return {
      ok: false,
      motivo: resultadoContraste.motivo,
      html: limpoHtml.html,
      css: limpoCss.css,
      avisos: [...avisos, 'contraste_insuficiente'],
      contraste: resultadoContraste.contraste,
    };
  }

  return {
    ok: true,
    html: limpoHtml.html,
    css: limpoCss.css,
    avisos,
    contraste: resultadoContraste.contraste,
  };
}
