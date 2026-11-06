/**
 * Avatar do cliente no estilo Avataaars (getavataaars.com).
 *
 * Flat, sem gradientes, olhos mínimos e silhueta limpa — o mesmo vocabulário
 * visual do gerador de referência, reduzido ao que uma barbearia precisa:
 * corte, barba, sobrancelha, cor de cabelo, tom de pele, óculos e boca.
 *
 * viewBox 264x280 para manter as mesmas proporções do original.
 */

const CORTES = {
  degrade: 'Degradê',
  social: 'Social',
  moicano: 'Moicano',
  topete: 'Topete',
  raspado: 'Raspado',
  franja: 'Franja',
  coque: 'Coque',
  dreads: 'Dreads',
  longo: 'Longo',
  cacheado: 'Cacheado',
  careca: 'Careca',
};

const BARBAS = {
  nenhuma: 'Sem barba',
  bigode: 'Bigode',
  cavanhaque: 'Cavanhaque',
  cheia: 'Barba cheia',
  barba: 'Barba longa',
};

const SOBRANCELHAS = {
  normal: 'Normal',
  grossa: 'Grossa',
  fina: 'Fina',
  arqueada: 'Arqueada',
  triste: 'Triste',
  levantada: 'Levantada',
  reta: 'Reta',
};

const BOCAS = { sorriso: 'Sorriso', serio: 'Sério', surpreso: 'Surpreso', sorriso_aberto: 'Sorrindo' };

const ACESSORIOS = { nenhum: 'Nenhum', oculos: 'Óculos', redondo: 'Redondo', escuro: 'Óculos escuros' };

const ROUPAS = {
  escura: { rotulo: 'Escura', base: '#262E33', detalhe: '#3A4C5A' },
  clara: { rotulo: 'Clara', base: '#E6E6E6', detalhe: '#CFCFCF' },
  vinho: { rotulo: 'Vinho', base: '#7A1F1F', detalhe: '#9B2C2C' },
  azul: { rotulo: 'Azul', base: '#2F4351', detalhe: '#3F5A6B' },
};

const FUNDOS = { circulo: 'Círculo', vazio: 'Transparente' };

/* paleta do Avataaars */
const PELES = {
  clara: { base: '#FFDBB4', sombra: '#F0C49B' },
  media: { base: '#EDB98A', sombra: '#DDA57A' },
  morena: { base: '#D08B5B', sombra: '#BB7A4E' },
  negra: { base: '#AE5D29', sombra: '#985025' },
  escura: { base: '#614335', sombra: '#51382C' },
};

const CABELOS = {
  preto: { base: '#2C1B18', sombra: '#1D1311' },
  castanho: { base: '#724133', sombra: '#5C3428' },
  castanho_escuro: { base: '#4A312C', sombra: '#382420' },
  loiro: { base: '#B58143', sombra: '#9A6C37' },
  loiro_dourado: { base: '#D6B370', sombra: '#BF9C5C' },
  ruivo: { base: '#C93305', sombra: '#A82904' },
  grisalho: { base: '#E8E1E1', sombra: '#CFC7C7' },
  platinado: { base: '#ECDCBF', sombra: '#D6C3A3' },
  azul: { base: '#4A6E8C', sombra: '#3C5A73' },
};

const PADRAO = {
  corte: 'degrade',
  barba: 'nenhuma',
  sobrancelha: 'normal',
  boca: 'sorriso',
  acessorio: 'nenhum',
  roupa: 'escura',
  fundo: 'circulo',
  pele: 'media',
  cabelo: 'castanho_escuro',
};

const NOMES_PELE = {
  clara: 'Clara',
  media: 'Média',
  morena: 'Morena',
  negra: 'Negra',
  escura: 'Escura',
};

const NOMES_CABELO = {
  preto: 'Preto',
  castanho: 'Castanho',
  castanho_escuro: 'Castanho escuro',
  loiro: 'Loiro',
  loiro_dourado: 'Loiro dourado',
  ruivo: 'Ruivo',
  grisalho: 'Grisalho',
  platinado: 'Platinado',
  azul: 'Azul',
};

const FUNDO_CIRCULO = '#65C9FF';

let seq = 0;

export function avatarPadrao() {
  return { ...PADRAO };
}

export function normalizarAvatar(entrada) {
  const cfg = entrada && typeof entrada === 'object' ? entrada : {};
  return {
    corte: CORTES[cfg.corte] ? cfg.corte : PADRAO.corte,
    barba: BARBAS[cfg.barba] ? cfg.barba : PADRAO.barba,
    sobrancelha: SOBRANCELHAS[cfg.sobrancelha] ? cfg.sobrancelha : PADRAO.sobrancelha,
    boca: BOCAS[cfg.boca] ? cfg.boca : PADRAO.boca,
    acessorio: ACESSORIOS[cfg.acessorio] ? cfg.acessorio : PADRAO.acessorio,
    roupa: ROUPAS[cfg.roupa] ? cfg.roupa : PADRAO.roupa,
    fundo: FUNDOS[cfg.fundo] ? cfg.fundo : PADRAO.fundo,
    pele: PELES[cfg.pele] ? cfg.pele : PADRAO.pele,
    cabelo: CABELOS[cfg.cabelo] ? cfg.cabelo : PADRAO.cabelo,
  };
}

export function rotuloAvatar(entrada) {
  const cfg = normalizarAvatar(entrada);
  const partes = [CORTES[cfg.corte]];
  if (cfg.barba !== 'nenhuma') partes.push(BARBAS[cfg.barba]);
  if (cfg.acessorio !== 'nenhum') partes.push(ACESSORIOS[cfg.acessorio]);
  return partes.join(' + ');
}

export const OPCOES_AVATAR = {
  corte: Object.entries(CORTES).map(([valor, rotulo]) => ({ valor, rotulo })),
  barba: Object.entries(BARBAS).map(([valor, rotulo]) => ({ valor, rotulo })),
  sobrancelha: Object.entries(SOBRANCELHAS).map(([valor, rotulo]) => ({ valor, rotulo })),
  boca: Object.entries(BOCAS).map(([valor, rotulo]) => ({ valor, rotulo })),
  acessorio: Object.entries(ACESSORIOS).map(([valor, rotulo]) => ({ valor, rotulo })),
  roupa: Object.entries(ROUPAS).map(([valor, dados]) => ({ valor, rotulo: dados.rotulo, cor: dados.base })),
  fundo: Object.entries(FUNDOS).map(([valor, rotulo]) => ({ valor, rotulo })),
  pele: Object.keys(PELES).map((valor) => ({ valor, rotulo: NOMES_PELE[valor], cor: PELES[valor].base })),
  cabelo: Object.keys(CABELOS).map((valor) => ({ valor, rotulo: NOMES_CABELO[valor], cor: CABELOS[valor].base })),
};

/* ---------------------------------------------------------------- cabelo */

/* Cabelo em duas camadas: o de trás fica atrás da cabeça (nunca cobre o rosto)
   e o da frente é a "tampa" que acompanha o topo do crânio. */

function cabeloTras(corte, cor) {
  switch (corte) {
    case 'longo':
      return `<path d="M60 120 C60 74 92 46 132 46 C172 46 204 74 204 120 C204 162 200 202 194 236 L70 236 C64 202 60 162 60 120 Z" fill="${cor.base}"/>`;

    case 'franja':
      return `<path d="M62 120 C62 76 94 48 132 48 C170 48 202 76 202 120 C202 152 198 178 194 198 L70 198 C66 178 62 152 62 120 Z" fill="${cor.base}"/>`;

    case 'coque':
      return `<circle cx="132" cy="46" r="20" fill="${cor.base}"/><circle cx="126" cy="42" r="7" fill="${cor.sombra}" opacity=".45"/>`;

    default:
      return '';
  }
}

function cabeloFrente(corte, cor) {
  const { base, sombra } = cor;

  switch (corte) {
    case 'careca':
      return '';

    case 'social':
      return `
        <path d="M70 126 C70 84 96 58 132 58 C168 58 194 84 194 126 C190 104 178 92 160 88 C150 84 136 84 124 88 C108 94 92 108 70 126 Z" fill="${base}"/>
        <path d="M124 88 C108 94 92 108 74 122 C86 104 102 94 118 90 Z" fill="${sombra}" opacity=".5"/>`;

    case 'moicano':
      return `
        <path d="M124 44 C142 44 152 58 154 78 C156 94 146 104 132 104 C118 104 108 94 110 78 C112 58 118 44 124 44 Z" fill="${base}"/>
        <path d="M132 92 C122 92 114 84 112 72 C118 82 126 88 134 88 Z" fill="${sombra}"/>`;

    case 'topete':
      return `
        <path d="M70 126 C70 92 88 68 112 60 C122 50 142 50 154 60 C178 72 192 96 194 126 C188 108 172 96 152 92 C140 90 124 90 112 92 C92 96 76 108 70 126 Z" fill="${base}"/>
        <path d="M120 58 C130 52 144 52 154 60 C144 57 132 56 122 58 Z" fill="${sombra}" opacity=".5"/>`;

    case 'raspado':
      return `
        <path d="M72 126 C72 88 98 62 132 62 C166 62 192 88 192 126 C188 110 174 98 156 94 C144 92 120 92 108 94 C90 98 76 110 72 126 Z" fill="${base}" opacity=".92"/>
        <path d="M98 76 C110 68 124 66 136 68" stroke="${sombra}" stroke-width="3" fill="none" opacity=".3" stroke-linecap="round"/>`;

    case 'franja':
      return `
        <path d="M70 126 C70 84 96 58 132 58 C168 58 194 84 194 126 C190 106 178 96 162 92 L102 92 C88 96 76 108 70 126 Z" fill="${base}"/>
        <path d="M102 92 Q117 102 132 92 Q147 102 162 92" stroke="${sombra}" stroke-width="4" fill="none" opacity=".45" stroke-linecap="round"/>`;

    case 'coque':
      return `
        <path d="M70 126 C70 84 96 58 132 58 C168 58 194 84 194 126 C189 104 176 92 158 88 C146 86 118 86 106 88 C88 92 75 104 70 126 Z" fill="${base}"/>
        <path d="M112 64 C120 60 132 58 142 62" stroke="${sombra}" stroke-width="3" fill="none" opacity=".4" stroke-linecap="round"/>`;

    case 'dreads':
      return `
        <path d="M70 126 C70 84 96 58 132 58 C168 58 194 84 194 126 C189 104 176 92 158 88 C146 86 118 86 106 88 C88 92 75 104 70 126 Z" fill="${base}"/>
        <g stroke="${sombra}" stroke-width="6" stroke-linecap="round" opacity=".8">
          <path d="M92 100 L94 82"/><path d="M110 92 L112 74"/><path d="M130 88 L130 70"/>
          <path d="M150 90 L152 72"/><path d="M168 98 L170 80"/>
        </g>`;

    case 'longo':
      return `
        <path d="M70 126 C70 84 96 58 132 58 C168 58 194 84 194 126 C189 104 176 92 158 88 C146 86 118 86 106 88 C88 92 75 104 70 126 Z" fill="${base}"/>
        <path d="M106 88 C90 94 78 108 72 124 C82 106 94 96 108 92 Z" fill="${sombra}" opacity=".45"/>`;

    case 'cacheado':
      return `
        <g fill="${base}">
          <circle cx="102" cy="92" r="17"/><circle cx="118" cy="72" r="19"/><circle cx="140" cy="66" r="20"/>
          <circle cx="162" cy="74" r="18"/><circle cx="178" cy="94" r="16"/>
        </g>
        <g fill="${sombra}" opacity=".4">
          <circle cx="110" cy="98" r="8"/><circle cx="146" cy="80" r="8"/><circle cx="168" cy="96" r="7"/>
        </g>`;

    default: // degrade
      return `
        <path d="M70 126 C70 84 96 58 132 58 C168 58 194 84 194 126 C189 104 176 92 158 88 C146 86 118 86 106 88 C88 92 75 104 70 126 Z" fill="${base}"/>
        <path d="M78 120 C84 104 94 94 108 90 C96 98 86 108 80 122 Z" fill="${sombra}" opacity=".5"/>`;
  }
}

/* ----------------------------------------------------------------- barba */

function barba(tipo, cor, pele) {
  const { base, sombra } = cor;

  switch (tipo) {
    case 'bigode':
      return `<path d="M112 166 C120 160 127 160 132 163 C137 160 144 160 152 166 C145 172 137 172 132 169 C127 172 119 172 112 166 Z" fill="${base}"/>`;

    case 'cavanhaque':
      return `
        <path d="M112 166 C120 160 127 160 132 163 C137 160 144 160 152 166 C145 172 137 172 132 169 C127 172 119 172 112 166 Z" fill="${base}"/>
        <path d="M120 182 C124 194 128 202 132 208 C136 202 140 194 144 182 C136 188 128 188 120 182 Z" fill="${base}"/>`;

    case 'cheia':
      return `
        <path d="M72 130 C72 170 98 200 132 200 C166 200 192 170 192 130 C188 158 172 172 154 178 C146 166 140 162 132 162 C124 162 118 166 110 178 C92 172 76 158 72 130 Z" fill="${base}"/>
        <path d="M72 130 C72 170 98 200 132 200 C166 200 192 170 192 130" stroke="${sombra}" stroke-width="2" fill="none" opacity=".5"/>`;

    case 'barba':
      return `
        <path d="M72 128 C70 174 98 212 132 218 C166 212 194 174 192 128 C188 160 172 180 152 186 C144 172 138 168 132 168 C126 168 120 172 112 186 C92 180 76 160 72 128 Z" fill="${base}"/>
        <path d="M132 168 C126 182 124 198 128 212 C122 196 122 182 126 168 Z" fill="${sombra}" opacity=".4"/>`;

    default:
      return `<path d="M118 186 Q132 192 146 186" stroke="${pele.sombra}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
}

/* ------------------------------------------------------- olhos e boca */

function olhos() {
  // olhos mínimos: uma elipse escura e um brilho pequeno
  return `
    <g>
      <ellipse cx="108" cy="128" rx="4.6" ry="5.6" fill="#2C1B18"/>
      <circle cx="106.4" cy="126" r="1.2" fill="#FFFFFF" opacity=".9"/>
      <ellipse cx="156" cy="128" rx="4.6" ry="5.6" fill="#2C1B18"/>
      <circle cx="154.4" cy="126" r="1.2" fill="#FFFFFF" opacity=".9"/>
    </g>`;
}

function sobrancelhas(tipo, cor) {
  const esp = tipo === 'grossa' ? 4.4 : tipo === 'fina' ? 2.2 : 3.2;
  const formas = {
    normal: ['M98 110 Q108 105 118 110', 'M146 110 Q156 105 166 110'],
    grossa: ['M98 110 Q108 105 118 110', 'M146 110 Q156 105 166 110'],
    fina: ['M98 110 Q108 105 118 110', 'M146 110 Q156 105 166 110'],
    arqueada: ['M98 110 Q108 103 118 108', 'M146 108 Q156 103 166 110'],
    triste: ['M98 107 Q108 113 118 117', 'M146 117 Q156 113 166 107'],
    levantada: ['M98 113 Q108 104 118 105', 'M146 105 Q156 104 166 113'],
    reta: ['M98 110 L118 110', 'M146 110 L166 110'],
  };
  const [esq, dir] = formas[tipo] || formas.normal;
  return `
    <path d="${esq}" stroke="${cor.base}" stroke-width="${esp}" fill="none" stroke-linecap="round"/>
    <path d="${dir}" stroke="${cor.base}" stroke-width="${esp}" fill="none" stroke-linecap="round"/>`;
}

function acessorio(tipo) {
  if (tipo === 'nenhum') return '';
  const cor = tipo === 'escuro' ? '#262E33' : '#3A4C5A';
  const lente = tipo === 'escuro' ? '#262E33' : 'trasparente';
  if (tipo === 'escuro') {
    return `
      <g fill="#262E33">
        <rect x="94" y="118" width="26" height="20" rx="6"/>
        <rect x="144" y="118" width="26" height="20" rx="6"/>
        <path d="M120 126 H144" stroke="#262E33" stroke-width="3"/>
      </g>`;
  }
  if (tipo === 'redondo') {
    return `
      <g fill="none" stroke="${cor}" stroke-width="3">
        <circle cx="107" cy="128" r="13"/>
        <circle cx="157" cy="128" r="13"/>
        <path d="M120 126 Q132 121 144 126"/>
      </g>`;
  }
  return `
    <g fill="none" stroke="${cor}" stroke-width="3">
      <rect x="93" y="119" width="28" height="18" rx="5"/>
      <rect x="143" y="119" width="28" height="18" rx="5"/>
      <path d="M121 127 H143"/>
    </g>`;
}

function boca(tipo) {
  switch (tipo) {
    case 'serio':
      return `<path d="M120 172 H144" stroke="#8D4A3F" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'surpreso':
      return `<ellipse cx="132" cy="174" rx="7" ry="9" fill="#8D4A3F"/>`;
    case 'sorriso_aberto':
      return `<path d="M116 168 Q132 186 148 168 Q132 174 116 168 Z" fill="#8D4A3F"/>`;
    default:
      return `<path d="M118 168 Q132 180 146 168" stroke="#8D4A3F" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
}

/* ------------------------------------------------------------- avatar */

export function avatarSVG3D(entrada, { tamanho = 160, rotulo = '', fundo = true } = {}) {
  const cfg = normalizarAvatar(entrada);
  const pele = PELES[cfg.pele];
  const cor = CABELOS[cfg.cabelo];
  const roupa = ROUPAS[cfg.roupa];
  const id = `av${++seq}`;
  const largura = Math.max(40, Number(tamanho) || 160);
  const altura = Math.round((largura * 280) / 264);
  const temBarba = cfg.barba !== 'nenhuma';
  const mostrarFundo = fundo && cfg.fundo !== 'vazio';

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 264 280" width="${largura}" height="${altura}"
       role="img" aria-label="${rotulo || rotuloAvatar(cfg)}" class="avatar-3d">
    <title>${rotulo || rotuloAvatar(cfg)}</title>
    <defs>
      <clipPath id="recorte-${id}"><circle cx="132" cy="140" r="132"/></clipPath>
    </defs>
    <g clip-path="url(#recorte-${id})">
      ${mostrarFundo ? `<circle cx="132" cy="140" r="132" fill="${FUNDO_CIRCULO}"/>` : ''}

      <!-- cabelo de trás: fica atrás da cabeça e dos ombros -->
      ${cabeloTras(cfg.corte, cor)}

      <!-- ombros / camisa -->
      <path d="M8 280 C14 246 44 226 78 218 L186 218 C220 226 250 246 256 280 Z" fill="${roupa.base}"/>
      <path d="M118 220 L132 244 L146 220 Z" fill="#E6E6E6"/>
      <path d="M78 218 C96 226 108 236 116 250 L104 280 L60 280 C52 252 62 230 78 218 Z" fill="${roupa.detalhe}"/>
      <path d="M186 218 C168 226 156 236 148 250 L160 280 L204 280 C212 252 202 230 186 218 Z" fill="${roupa.detalhe}"/>

      <!-- pescoço -->
      <path d="M114 186 H150 V216 Q132 224 114 216 Z" fill="${pele.sombra}"/>

      <!-- orelhas -->
      <ellipse cx="66" cy="134" rx="9" ry="12" fill="${pele.base}"/>
      <ellipse cx="198" cy="134" rx="9" ry="12" fill="${pele.base}"/>

      <!-- rosto -->
      <path d="M132 54 C176 54 196 84 196 126 C196 168 170 196 132 196 C94 196 68 168 68 126 C68 84 88 54 132 54 Z" fill="${pele.base}"/>
      <path d="M68 126 C68 168 94 196 132 196 C108 186 92 164 88 138 C84 110 94 84 116 68 C86 76 68 96 68 126 Z" fill="${pele.sombra}" opacity=".32"/>

      ${cabeloFrente(cfg.corte, cor)}
      ${barba(cfg.barba, cor, pele)}
      ${sobrancelhas(cfg.sobrancelha, cor)}
      ${olhos()}
      ${acessorio(cfg.acessorio)}

      <!-- nariz -->
      <path d="M132 140 Q129 150 134 153" stroke="${pele.sombra}" stroke-width="2.4" fill="none" stroke-linecap="round"/>

      ${boca(cfg.boca)}
    </g>
  </svg>`;
}

export function avatarMini3D(entrada, { tamanho = 32, rotulo = '' } = {}) {
  const cfg = normalizarAvatar(entrada);
  return `<span class="avatar-mini-3d" title="${rotulo || rotuloAvatar(cfg)}">${avatarSVG3D(
    { ...cfg, fundo: 'circulo' },
    { tamanho, rotulo, fundo: true },
  )}</span>`;
}
