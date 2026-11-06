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

function cabelo(corte, cor) {
  const { base, sombra } = cor;

  switch (corte) {
    case 'careca':
      return '';

    case 'social':
      return `
        <path d="M70 128 C70 84 96 58 132 58 C168 58 194 84 194 128 C190 108 178 94 164 88 C172 76 168 64 156 60 C140 54 118 58 104 68 C88 80 76 100 72 118 Z" fill="${base}"/>
        <path d="M104 68 C90 80 78 100 74 118 C72 104 78 88 88 78 Z" fill="${sombra}" opacity=".5"/>`;

    case 'moicano':
      return `
        <path d="M126 40 C144 40 154 56 156 76 C158 94 148 104 132 104 C116 104 106 94 108 76 C110 56 120 40 126 40 Z" fill="${base}"/>
        <path d="M132 88 C120 88 112 80 110 68 C116 78 124 84 134 84 Z" fill="${sombra}"/>`;

    case 'topete':
      return `
        <path d="M70 128 C70 92 88 68 112 60 C122 50 142 50 154 60 C178 72 192 96 194 128 C188 108 172 94 152 90 C140 88 124 88 112 90 C92 94 76 108 70 128 Z" fill="${base}"/>
        <path d="M112 60 C122 50 142 50 154 60 C146 56 134 54 124 56 Z" fill="${sombra}" opacity=".5"/>`;

    case 'raspado':
      return `
        <path d="M72 126 C72 88 98 62 132 62 C166 62 192 88 192 126 C188 110 174 98 156 94 C144 92 120 92 108 94 C90 98 76 110 72 126 Z" fill="${base}" opacity=".9"/>
        <path d="M96 74 C108 66 122 64 134 66" stroke="${sombra}" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>`;

    case 'franja':
      return `
        <path d="M68 130 C68 84 96 56 132 56 C168 56 196 84 196 130 C194 150 192 172 188 190 C182 172 178 152 176 132 L176 104 L88 104 L88 132 C86 152 82 172 76 190 C72 172 70 150 68 130 Z" fill="${base}"/>
        <path d="M88 104 L176 104 C172 96 160 90 146 92 C136 84 118 84 108 92 C96 94 90 98 88 104 Z" fill="${sombra}" opacity=".45"/>`;

    case 'coque':
      return `
        <circle cx="132" cy="44" r="19" fill="${base}"/>
        <circle cx="126" cy="40" r="7" fill="${sombra}" opacity=".45"/>
        <path d="M70 128 C70 84 96 58 132 58 C168 58 194 84 194 128 C188 106 172 92 152 88 C140 86 124 86 112 88 C92 92 76 106 70 128 Z" fill="${base}"/>
        <path d="M110 62 C118 56 130 54 140 58" stroke="${sombra}" stroke-width="3" fill="none" opacity=".4" stroke-linecap="round"/>`;

    case 'dreads':
      return `
        <path d="M70 128 C70 84 96 58 132 58 C168 58 194 84 194 128 C188 106 172 92 152 88 C140 86 124 86 112 88 C92 92 76 106 70 128 Z" fill="${base}"/>
        <g stroke="${sombra}" stroke-width="7" stroke-linecap="round" opacity=".85">
          <path d="M86 96 L82 118"/><path d="M104 82 L100 106"/><path d="M122 76 L120 100"/>
          <path d="M142 76 L144 100"/><path d="M160 82 L164 106"/><path d="M178 96 L182 118"/>
        </g>`;

    case 'longo':
      return `
        <path d="M70 128 C70 84 96 58 132 58 C168 58 194 84 194 128 C194 160 192 196 186 226 C178 208 174 184 174 160 C172 128 158 112 132 112 C106 112 92 128 90 160 C90 184 86 208 78 226 C72 196 70 160 70 128 Z" fill="${base}"/>
        <path d="M88 120 C84 156 84 192 90 218 C86 190 84 154 88 120 Z" fill="${sombra}" opacity=".55"/>
        <path d="M176 120 C180 156 180 192 174 218 C178 190 180 154 176 120 Z" fill="${sombra}" opacity=".55"/>`;

    case 'cacheado':
      return `
        <g fill="${base}">
          <circle cx="96" cy="104" r="20"/><circle cx="114" cy="80" r="22"/><circle cx="138" cy="72" r="22"/>
          <circle cx="164" cy="82" r="21"/><circle cx="182" cy="106" r="19"/><circle cx="80" cy="126" r="15"/>
          <circle cx="190" cy="128" r="15"/>
        </g>
        <g fill="${sombra}" opacity=".45">
          <circle cx="104" cy="112" r="10"/><circle cx="150" cy="92" r="9"/><circle cx="176" cy="114" r="8"/>
        </g>`;

    default: // degrade
      return `
        <path d="M70 128 C70 84 96 58 132 58 C168 58 194 84 194 128 C188 106 172 92 152 88 C140 86 124 86 112 88 C92 92 76 106 70 128 Z" fill="${base}"/>
        <path d="M76 122 C82 106 92 96 106 92 C94 100 84 110 78 124 Z" fill="${sombra}" opacity=".55"/>`;
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

      ${cabelo(cfg.corte, cor)}
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
