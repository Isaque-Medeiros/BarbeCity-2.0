/**
 * Avatar do cliente em SVG com acabamento 3D estilizado.
 *
 * Taxonomia inspirada no gerador Avataaars (getavataaars.com): corte, barba,
 * sobrancelha, tom de pele e cor de cabelo. A profundidade vem de gradientes,
 * luz de recorte e sombras suaves — sem imagem externa, sem WebGL e compatível
 * com o CSP do site.
 */

const CORTES = {
  degrade: 'Degradê',
  social: 'Social',
  moicano: 'Moicano',
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

const SOBRANCELHAS = { normal: 'Normal', grossa: 'Grossa', fina: 'Fina', arqueada: 'Arqueada' };

const PELES = {
  clara: { base: '#f7d4b6', sombra: '#e2ad86', linha: '#c98a63', luz: '#ffe7d4' },
  media: { base: '#e4b58d', sombra: '#c89067', linha: '#a9704c', luz: '#f7d4b6' },
  morena: { base: '#be8259', sombra: '#9d6543', linha: '#804d31', luz: '#daa178' },
  negra: { base: '#8e5b3d', sombra: '#6e432a', linha: '#55311d', luz: '#a97553' },
};

const CABELOS = {
  preto: { base: '#241e1c', sombra: '#100d0c', luz: '#4b3b35' },
  castanho: { base: '#5b3b25', sombra: '#3b2517', luz: '#8b603e' },
  loiro: { base: '#caa35d', sombra: '#a17c39', luz: '#e9ce94' },
  ruivo: { base: '#a54820', sombra: '#722d12', luz: '#d5743a' },
  grisalho: { base: '#bab7b3', sombra: '#8f8b87', luz: '#e7e5e2' },
};

const PADRAO = { corte: 'degrade', barba: 'nenhuma', sobrancelha: 'normal', pele: 'media', cabelo: 'preto' };

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
    pele: PELES[cfg.pele] ? cfg.pele : PADRAO.pele,
    cabelo: CABELOS[cfg.cabelo] ? cfg.cabelo : PADRAO.cabelo,
  };
}

export function rotuloAvatar(entrada) {
  const cfg = normalizarAvatar(entrada);
  const partes = [CORTES[cfg.corte]];
  if (cfg.barba !== 'nenhuma') partes.push(BARBAS[cfg.barba]);
  return partes.join(' + ');
}

export const OPCOES_AVATAR = {
  corte: Object.entries(CORTES).map(([valor, rotulo]) => ({ valor, rotulo })),
  barba: Object.entries(BARBAS).map(([valor, rotulo]) => ({ valor, rotulo })),
  sobrancelha: Object.entries(SOBRANCELHAS).map(([valor, rotulo]) => ({ valor, rotulo })),
  pele: [
    { valor: 'clara', rotulo: 'Clara', cor: PELES.clara.base },
    { valor: 'media', rotulo: 'Média', cor: PELES.media.base },
    { valor: 'morena', rotulo: 'Morena', cor: PELES.morena.base },
    { valor: 'negra', rotulo: 'Negra', cor: PELES.negra.base },
  ],
  cabelo: [
    { valor: 'preto', rotulo: 'Preto', cor: CABELOS.preto.base },
    { valor: 'castanho', rotulo: 'Castanho', cor: CABELOS.castanho.base },
    { valor: 'loiro', rotulo: 'Loiro', cor: CABELOS.loiro.base },
    { valor: 'ruivo', rotulo: 'Ruivo', cor: CABELOS.ruivo.base },
    { valor: 'grisalho', rotulo: 'Grisalho', cor: CABELOS.grisalho.base },
  ],
};

function cabelo(corte, id, cor) {
  switch (corte) {
    case 'careca':
      return `
        <path d="M120 44 C160 44 184 68 184 106 C184 94 170 82 120 82 C70 82 56 94 56 106 C56 68 80 44 120 44 Z" fill="${cor.sombra}" opacity=".16"/>
        <path d="M96 62 C108 54 122 52 136 56" stroke="${cor.luz}" stroke-width="6" fill="none" opacity=".28" stroke-linecap="round"/>`;

    case 'social':
      return `
        <path d="M54 108 C54 64 80 40 120 40 C160 40 186 64 186 108 C182 94 172 86 158 82 C150 74 140 68 128 68 C112 68 100 76 90 86 C78 94 64 100 54 108 Z" fill="url(#cabelo-${id})"/>
        <path d="M136 56 C158 62 172 76 178 96" stroke="${cor.luz}" stroke-width="5" fill="none" opacity=".32" stroke-linecap="round"/>
        <path d="M74 98 C80 84 90 74 104 68" stroke="${cor.sombra}" stroke-width="6" fill="none" opacity=".3" stroke-linecap="round"/>`;

    case 'moicano':
      return `
        <path d="M120 16 C138 16 147 30 149 49 C151 66 144 78 120 80 C96 78 89 66 91 49 C93 30 102 16 120 16 Z" fill="url(#cabelo-${id})"/>
        <path d="M111 22 C120 19 130 22 136 30" stroke="${cor.luz}" stroke-width="5" fill="none" opacity=".42" stroke-linecap="round"/>
        <path d="M91 74 C104 70 136 70 149 74 C145 82 133 86 120 86 C107 86 95 82 91 74 Z" fill="${cor.sombra}" opacity=".45"/>`;

    case 'longo':
      return `
        <path d="M54 108 C54 64 80 40 120 40 C160 40 186 64 186 108 C186 130 182 160 174 188 C168 170 164 150 164 130 C162 100 148 86 120 86 C92 86 78 100 76 130 C76 150 72 170 66 188 C58 160 54 130 54 108 Z" fill="url(#cabelo-${id})"/>
        <path d="M78 100 C74 128 74 160 78 184" stroke="${cor.sombra}" stroke-width="6" fill="none" opacity=".26" stroke-linecap="round"/>
        <path d="M162 100 C166 128 166 160 162 184" stroke="${cor.sombra}" stroke-width="6" fill="none" opacity=".26" stroke-linecap="round"/>
        <path d="M96 48 C112 41 132 43 146 51" stroke="${cor.luz}" stroke-width="6" fill="none" opacity=".3" stroke-linecap="round"/>`;

    case 'cacheado':
      return `
        <g fill="url(#cabelo-${id})">
          <circle cx="80" cy="84" r="19"/><circle cx="101" cy="58" r="21"/><circle cx="126" cy="50" r="22"/>
          <circle cx="151" cy="60" r="20"/><circle cx="170" cy="84" r="18"/><circle cx="62" cy="102" r="14"/>
          <circle cx="178" cy="104" r="14"/>
        </g>
        <g fill="none" stroke="${cor.luz}" stroke-width="3.5" opacity=".34" stroke-linecap="round">
          <path d="M92 46 q9 -7 19 -4"/><path d="M140 44 q10 0 16 6"/><path d="M66 92 q4 -9 13 -11"/>
        </g>`;

    default: // degrade
      return `
        <path d="M54 108 C54 66 78 42 120 42 C162 42 186 66 186 108 C180 94 168 84 152 80 C142 78 132 78 120 78 C108 78 98 78 88 80 C72 84 60 94 54 108 Z" fill="url(#cabelo-${id})"/>
        <path d="M68 98 C72 84 80 72 92 64" stroke="${cor.luz}" stroke-width="6" fill="none" opacity=".3" stroke-linecap="round"/>
        <path d="M56 104 C57 94 60 86 65 80 C62 90 61 97 61 106 Z" fill="${cor.sombra}" opacity=".45"/>`;
  }
}

function barba(tipo, id, cor, linhaPele) {
  switch (tipo) {
    case 'bigode':
      return `
        <path d="M99 158 C107 151 116 151 120 155 C124 151 133 151 141 158 C133 165 124 165 120 162 C116 165 107 165 99 158 Z" fill="url(#cabelo-${id})"/>
        <path d="M101 159 C108 154 115 154 119 157" stroke="${cor.luz}" stroke-width="2" fill="none" opacity=".38"/>`;

    case 'cavanhaque':
      return `
        <path d="M99 157 C107 150 116 150 120 154 C124 150 133 150 141 157 C133 164 124 164 120 161 C116 164 107 164 99 157 Z" fill="url(#cabelo-${id})"/>
        <path d="M104 172 C108 184 113 193 120 199 C127 193 132 184 136 172 C128 178 112 178 104 172 Z" fill="url(#cabelo-${id})"/>
        <path d="M108 175 C113 185 116 191 120 195" stroke="${cor.luz}" stroke-width="2" fill="none" opacity=".28"/>`;

    case 'cheia':
      return `
        <path d="M62 118 C62 164 90 198 120 198 C150 198 178 164 178 118 C174 150 160 166 142 172 C136 162 128 158 120 158 C112 158 104 162 98 172 C80 166 66 150 62 118 Z" fill="url(#cabelo-${id})"/>
        <path d="M62 118 C62 164 90 198 120 198 C150 198 178 164 178 118" stroke="${cor.sombra}" stroke-width="2" fill="none" opacity=".4"/>
        <path d="M84 142 C90 158 100 168 112 174" stroke="${cor.luz}" stroke-width="3" fill="none" opacity=".18" stroke-linecap="round"/>`;

    case 'barba':
      return `
        <path d="M60 116 C58 170 88 212 120 218 C152 212 182 170 180 116 C176 150 162 172 142 180 C136 168 129 162 120 162 C111 162 104 168 98 180 C78 172 64 150 60 116 Z" fill="url(#cabelo-${id})"/>
        <path d="M60 116 C58 170 88 212 120 218 C152 212 182 170 180 116" stroke="${cor.sombra}" stroke-width="2.2" fill="none" opacity=".45"/>
        <path d="M120 162 C114 178 112 196 116 212" stroke="${cor.sombra}" stroke-width="2" fill="none" opacity=".3"/>
        <path d="M86 144 C92 164 102 176 114 184" stroke="${cor.luz}" stroke-width="3.4" fill="none" opacity=".18" stroke-linecap="round"/>`;

    default:
      return `<path d="M106 179 Q120 185 134 179" stroke="${linhaPele}" stroke-width="2" fill="none" opacity=".26" stroke-linecap="round"/>`;
  }
}

function sobrancelhas(tipo, cor) {
  const espessura = tipo === 'grossa' ? 6 : tipo === 'fina' ? 2.6 : 4.2;
  const esquerda = tipo === 'arqueada' ? 'M84 95 Q96 85 108 91' : 'M84 95 Q96 89 108 95';
  const direita = tipo === 'arqueada' ? 'M132 95 Q144 85 156 91' : 'M132 95 Q144 89 156 95';
  return `
    <path d="${esquerda}" stroke="${cor.sombra}" stroke-width="${espessura}" fill="none" stroke-linecap="round"/>
    <path d="${direita}" stroke="${cor.sombra}" stroke-width="${espessura}" fill="none" stroke-linecap="round"/>`;
}

export function avatarSVG3D(entrada, { tamanho = 160, rotulo = '', fundo = true } = {}) {
  const cfg = normalizarAvatar(entrada);
  const pele = PELES[cfg.pele];
  const cor = CABELOS[cfg.cabelo];
  const id = `av${++seq}`;
  const largura = Math.max(40, Number(tamanho) || 160);
  const altura = Math.round(largura * 1.16);
  const temBarba = cfg.barba !== 'nenhuma';

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" width="${largura}" height="${altura}"
       role="img" aria-label="${rotulo || rotuloAvatar(cfg)}" class="avatar-3d">
    <defs>
      <linearGradient id="pele-${id}" x1="0.2" y1="0" x2="0.85" y2="1">
        <stop offset="0" stop-color="${pele.luz}"/><stop offset="0.45" stop-color="${pele.base}"/><stop offset="1" stop-color="${pele.sombra}"/>
      </linearGradient>
      <radialGradient id="luz-${id}" cx="34%" cy="24%" r="62%">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.4"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="cabelo-${id}" x1="0.15" y1="0" x2="0.8" y2="1">
        <stop offset="0" stop-color="${cor.luz}"/><stop offset="0.42" stop-color="${cor.base}"/><stop offset="1" stop-color="${cor.sombra}"/>
      </linearGradient>
      <linearGradient id="capa-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2b2b31"/><stop offset="1" stop-color="#101013"/>
      </linearGradient>
      <radialGradient id="fundo-${id}" cx="50%" cy="34%" r="70%">
        <stop offset="0" stop-color="#27272d"/><stop offset="1" stop-color="#0d0d10"/>
      </radialGradient>
      <clipPath id="recorte-${id}"><rect width="240" height="280" rx="30"/></clipPath>
    </defs>

    <g clip-path="url(#recorte-${id})">
      ${fundo ? `<rect width="240" height="280" fill="url(#fundo-${id})"/><circle cx="120" cy="112" r="92" fill="#ffffff" opacity="0.03"/>` : ''}

      <path d="M18 280 C24 236 62 214 96 206 L144 206 C178 214 216 236 222 280 Z" fill="url(#capa-${id})"/>
      <path d="M96 208 Q120 226 144 208 L143 218 Q120 236 97 218 Z" fill="#b91c1c"/>
      <path d="M98 210 Q120 226 142 210" stroke="#e8cc74" stroke-width="1.6" fill="none" opacity=".7"/>
      <path d="M40 280 C48 244 70 228 92 218" stroke="#ffffff" stroke-width="3" fill="none" opacity=".07" stroke-linecap="round"/>
      <path d="M200 280 C192 244 170 228 148 218" stroke="#000000" stroke-width="4" fill="none" opacity=".2" stroke-linecap="round"/>

      <path d="M104 176 H136 V204 Q120 214 104 204 Z" fill="${pele.sombra}"/>
      <ellipse cx="120" cy="196" rx="17" ry="11" fill="${pele.linha}" opacity=".32"/>

      <ellipse cx="58" cy="118" rx="10" ry="14" fill="${pele.base}"/>
      <ellipse cx="58" cy="118" rx="5" ry="8" fill="${pele.linha}" opacity=".32"/>
      <ellipse cx="182" cy="118" rx="10" ry="14" fill="${pele.sombra}"/>
      <ellipse cx="182" cy="118" rx="5" ry="8" fill="${pele.linha}" opacity=".26"/>

      <path d="M120 44 C162 44 186 70 186 110 C186 156 158 186 120 186 C82 186 54 156 54 110 C54 70 78 44 120 44 Z" fill="url(#pele-${id})"/>
      <path d="M54 110 C54 156 82 186 120 186 C98 176 82 152 78 124 C74 96 84 70 106 56 C76 62 54 80 54 110 Z" fill="${pele.sombra}" opacity=".42"/>
      <ellipse cx="120" cy="86" rx="52" ry="38" fill="url(#luz-${id})"/>
      <path d="M78 98 C72 124 80 150 96 166" stroke="#ffffff" stroke-width="7" fill="none" opacity=".09" stroke-linecap="round"/>
      <ellipse cx="120" cy="190" rx="26" ry="7" fill="#000000" opacity=".13"/>

      ${cabelo(cfg.corte, id, cor)}
      ${barba(cfg.barba, id, cor, pele.linha)}
      ${sobrancelhas(cfg.sobrancelha, cor)}

      <g>
        <ellipse cx="95" cy="116" rx="13" ry="12" fill="#fffaf4"/>
        <ellipse cx="96" cy="117" rx="7.4" ry="8.6" fill="${cor.base}"/>
        <circle cx="96" cy="117" r="3.6" fill="#15100e"/>
        <circle cx="93.4" cy="113.4" r="2.6" fill="#ffffff"/>
        <circle cx="99" cy="120.4" r="1.3" fill="#ffffff" opacity=".9"/>
        <path d="M82 111 Q95 102 108 111" stroke="#2a1f1a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      </g>
      <g>
        <ellipse cx="145" cy="116" rx="13" ry="12" fill="#fffaf4"/>
        <ellipse cx="144" cy="117" rx="7.4" ry="8.6" fill="${cor.base}"/>
        <circle cx="144" cy="117" r="3.6" fill="#15100e"/>
        <circle cx="141.4" cy="113.4" r="2.6" fill="#ffffff"/>
        <circle cx="147" cy="120.4" r="1.3" fill="#ffffff" opacity=".9"/>
        <path d="M132 111 Q145 102 158 111" stroke="#2a1f1a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      </g>

      <ellipse cx="80" cy="134" rx="9" ry="4" fill="#d6605c" opacity=".2"/>
      <ellipse cx="160" cy="134" rx="9" ry="4" fill="#d6605c" opacity=".16"/>

      <path d="M119 124 q-2 7 1 10 q2 1.6 4 .4" stroke="${pele.linha}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/>

      ${temBarba
        ? `<path d="M110 150 Q120 157 130 150" stroke="#c07a68" stroke-width="2.4" fill="none" stroke-linecap="round"/>
           <path d="M113 154 Q120 158 127 154" stroke="#8d4a3f" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".55"/>`
        : `<path d="M108 150 Q120 160 132 150" stroke="#b06a5a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
           <path d="M112 154 Q120 158 128 154" stroke="#8d4a3f" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".45"/>`}
    </g>
    <rect x="1" y="1" width="238" height="278" rx="29" fill="none" stroke="#ffffff" stroke-width="1" opacity=".08"/>
  </svg>`;
}

export function avatarMini3D(entrada, { tamanho = 32, rotulo = '' } = {}) {
  const cfg = normalizarAvatar(entrada);
  return `<span class="avatar-mini-3d" title="${rotulo || rotuloAvatar(cfg)}">${avatarSVG3D(cfg, {
    tamanho,
    rotulo,
    fundo: false,
  })}</span>`;
}
