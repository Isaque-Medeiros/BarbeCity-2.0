import { escapar, formatarDataHora } from './core.js';

/**
 * Avatar de barbearia em SVG puro.
 *
 * Não usa imagem externa, não usa IA e respeita o CSP do site. O servidor envia
 * os traços em `servico.avatar`; quando não há (histórico antigo), detectamos
 * pelo nome/slug/ícone como fallback.
 */

const TRAITS = ['cabelo', 'barba', 'sobrancelha', 'luzes', 'tratamento'];

function normalizar(valor) {
  return String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function vazio() {
  return Object.fromEntries(TRAITS.map((traco) => [traco, false]));
}

export function detectarTraits(servico = {}) {
  if (servico?.avatar?.traits) return { ...vazio(), ...servico.avatar.traits };
  if (servico?.avatarTraits && typeof servico.avatarTraits === 'object') {
    return { ...vazio(), ...servico.avatarTraits };
  }

  const traits = vazio();
  const texto = normalizar(`${servico?.slug ?? ''} ${servico?.nome ?? ''}`);
  const icone = normalizar(servico?.icone);

  if (/corte|cabelo|maquina|tesoura|pente/.test(texto) || icone === 'scissors') traits.cabelo = true;
  if (/barba|bigode|navalha/.test(texto) || icone === 'razor') traits.barba = true;
  if (/sobrancelha/.test(texto) || icone === 'eyebrow') traits.sobrancelha = true;
  if (/luzes|mechas|descolor/.test(texto) || icone === 'highlights') {
    traits.cabelo = true;
    traits.luzes = true;
  }
  if (/hidratacao|botox|tratamento|reconstrucao/.test(texto) || ['droplet', 'flask'].includes(icone)) {
    traits.cabelo = true;
    traits.tratamento = true;
  }

  if (!TRAITS.some((traco) => traits[traco])) {
    if (servico?.categoria === 'combo' || icone === 'combo' || icone === 'crown') {
      traits.cabelo = true;
      traits.barba = true;
    } else {
      traits.cabelo = true;
    }
  }
  return traits;
}

export function mesclarAvatares(servicos = []) {
  const traits = vazio();
  for (const servico of Array.isArray(servicos) ? servicos : []) {
    const detectados = detectarTraits(servico);
    for (const traco of TRAITS) {
      if (detectados[traco]) traits[traco] = true;
    }
  }
  if (traits.luzes || traits.tratamento) traits.cabelo = true;
  return traits;
}

export function carecaDe(traits) {
  return !traits?.cabelo && Boolean(traits?.barba || traits?.sobrancelha);
}

export function rotuloTraits(traits) {
  const nomes = { cabelo: 'Cabelo', barba: 'Barba', sobrancelha: 'Sobrancelha', luzes: 'Luzes', tratamento: 'Tratamento' };
  const ativos = TRAITS.filter((traco) => traits?.[traco]).map((traco) => nomes[traco]);
  if (ativos.length === 0) return 'Visual clássico';
  return `${carecaDe(traits) ? 'Careca · ' : ''}${ativos.join(' + ')}`;
}

let sequencia = 0;

function proximoId() {
  sequencia += 1;
  return `bcity-avatar-${sequencia}`;
}

/**
 * Desenha o bonequinho em SVG.
 *
 * Arte minimalista (traço limpo, olhos grandes e capa de barbeiro) que se adapta
 * ao tema claro/escuro porque todas as cores vêm de custom properties --avatar-*.
 */
export function avatarSVG(traitsEntrada = {}, { tamanho = 200, rotulo = '' } = {}) {
  const traits = { ...vazio(), ...traitsEntrada };
  const careca = carecaDe(traits);
  const id = proximoId();
  const rotuloFinal = rotulo || rotuloTraits(traits);
  const largura = Math.max(48, Number(tamanho) || 200);
  const altura = Math.round(largura * 1.1);

  const brilhoCabelo = `
    <path d="M88 64 C104 52 132 52 148 64" stroke="var(--avatar-shine)" stroke-width="4" stroke-linecap="round" fill="none" opacity=".32" class="avatar-shine"/>
    <path d="M98 76 C110 70 126 70 138 76" stroke="var(--avatar-shine)" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".2"/>`;

  const cabeloFundo = careca
    ? ''
    : `<path d="M120 24 C172 24 198 58 196 112 C194 134 186 148 176 150 L64 150 C54 148 46 134 44 112 C42 58 68 24 120 24 Z" fill="url(#cabelo-${id})"/>`;

  const cabelo = careca
    ? `<path d="M78 82 C92 62 120 56 144 68" stroke="var(--avatar-shine)" stroke-width="5" stroke-linecap="round" fill="none" opacity=".4" class="avatar-shine"/>
       <path d="M66 112 q-3 6 0 12" stroke="var(--avatar-hair-line)" stroke-width="1.4" fill="none" opacity=".35" stroke-linecap="round"/>
       <path d="M174 112 q3 6 0 12" stroke="var(--avatar-hair-line)" stroke-width="1.4" fill="none" opacity=".35" stroke-linecap="round"/>`
    : `<path d="M66 90 C72 58 94 40 124 40 C154 40 174 58 180 86 C166 64 144 56 120 60 C96 64 78 74 66 90 Z" fill="url(#cabelo-${id})"/>
       <path d="M70 86 C74 72 82 62 94 56" stroke="var(--avatar-hair-line)" stroke-width="1.6" fill="none" opacity=".4" stroke-linecap="round"/>
       <path d="M64 102 q-5 10 -2 20" stroke="var(--avatar-hair-line)" stroke-width="1.5" fill="none" opacity=".45" stroke-linecap="round"/>
       <path d="M176 102 q5 10 2 20" stroke="var(--avatar-hair-line)" stroke-width="1.5" fill="none" opacity=".45" stroke-linecap="round"/>
       ${brilhoCabelo}`;

  const luzes = traits.luzes && !careca
    ? `<g clip-path="url(#cabelo-clip-${id})" stroke="var(--avatar-luz)" stroke-linecap="round" fill="none">
        <path d="M98 46 q-12 22 -18 54" stroke-width="7" opacity=".85" class="avatar-shine"/>
        <path d="M120 42 q-8 24 -10 54" stroke-width="5" opacity=".6"/>
        <path d="M142 46 q-2 22 2 48" stroke-width="4" opacity=".45"/>
      </g>`
    : '';

  const barba = traits.barba
    ? `<path d="M62 110 C62 150 88 181 120 181 C152 181 178 150 178 110 C172 137 158 151 142 156 C136 145 129 141 120 141 C111 141 104 145 98 156 C82 151 68 137 62 110 Z" fill="url(#cabelo-${id})"/>
       <path d="M62 110 C62 150 88 181 120 181 C152 181 178 150 178 110" stroke="var(--avatar-hair-line)" stroke-width="1.6" fill="none" opacity=".45"/>
       <path d="M98 137 Q110 129 120 136 Q130 129 142 137 Q132 142 120 140 Q108 142 98 137 Z" fill="var(--avatar-hair-2)"/>`
    : `<path d="M104 170 C112 176 128 176 136 170" stroke="var(--avatar-skin-line)" stroke-width="2" fill="none" opacity=".35" stroke-linecap="round"/>`;

  const tratamento = traits.tratamento
    ? `<g fill="var(--avatar-sparkle)">
        <path class="avatar-spark" d="M44 56 l2.6 6.4 6.4 2.6 -6.4 2.6 -2.6 6.4 -2.6 -6.4 -6.4 -2.6 6.4 -2.6z"/>
        <path class="avatar-spark" d="M198 82 l2.2 5.4 5.4 2.2 -5.4 2.2 -2.2 5.4 -2.2 -5.4 -5.4 -2.2 5.4 -2.2z"/>
        <path class="avatar-spark" d="M188 170 l1.8 4.4 4.4 1.8 -4.4 1.8 -1.8 4.4 -1.8 -4.4 -4.4 -1.8 4.4 -1.8z"/>
      </g>
      <path d="M166 56 q10 -6 20 0" stroke="var(--avatar-sparkle)" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/>`
    : '';

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 264" width="${largura}" height="${altura}"
       role="img" aria-label="${escapar(rotuloFinal)}" class="avatar-svg">
    <title>${escapar(rotuloFinal)}</title>
    <defs>
      <linearGradient id="fundo-${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="var(--avatar-bg-1)"/>
        <stop offset="1" stop-color="var(--avatar-bg-2)"/>
      </linearGradient>
      <radialGradient id="aura-${id}" cx="50%" cy="34%" r="62%">
        <stop offset="0" stop-color="var(--avatar-glow)"/>
        <stop offset="1" stop-color="transparent"/>
      </radialGradient>
      <linearGradient id="pele-${id}" x1="0" y1="0" x2="0.55" y2="1">
        <stop offset="0" stop-color="var(--avatar-skin)"/>
        <stop offset="1" stop-color="var(--avatar-skin-2)"/>
      </linearGradient>
      <linearGradient id="cabelo-${id}" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="var(--avatar-hair)"/>
        <stop offset="1" stop-color="var(--avatar-hair-2)"/>
      </linearGradient>
      <linearGradient id="capa-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--avatar-cape)"/>
        <stop offset="1" stop-color="var(--avatar-cape-2)"/>
      </linearGradient>
      <linearGradient id="iris-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--avatar-iris)"/>
        <stop offset="1" stop-color="var(--avatar-iris-2)"/>
      </linearGradient>
      <clipPath id="cartao-${id}"><rect width="240" height="264" rx="26"/></clipPath>
      <clipPath id="cabelo-clip-${id}">
        <path d="M56 104 C50 62 80 32 120 32 C160 32 190 62 184 104 C176 78 154 62 120 62 C86 62 64 78 56 104 Z"/>
      </clipPath>
    </defs>

    <g clip-path="url(#cartao-${id})">
      <rect width="240" height="264" fill="url(#fundo-${id})"/>
      <ellipse cx="120" cy="92" rx="134" ry="116" fill="url(#aura-${id})"/>
      <g fill="none" stroke="var(--avatar-ring)" opacity=".55">
        <circle cx="120" cy="104" r="84" stroke-width="1" stroke-dasharray="2 8"/>
        <circle cx="120" cy="104" r="103" stroke-width="1" stroke-dasharray="1 14" opacity=".6"/>
      </g>
      <g opacity=".18" stroke-linecap="butt">
        <path d="M-64 246 L26 156" stroke="var(--avatar-accent)" stroke-width="11"/>
        <path d="M-60 266 L36 164" stroke="var(--avatar-collar)" stroke-width="11"/>
        <path d="M-20 282 L64 196" stroke="var(--avatar-accent)" stroke-width="11" opacity=".45"/>
      </g>
      <circle cx="206" cy="44" r="3" fill="var(--avatar-accent)" opacity=".65"/>
      <circle cx="30" cy="122" r="2" fill="var(--avatar-accent)" opacity=".45"/>

      <!-- capa / ombros -->
      <path d="M14 264 C20 224 58 206 92 200 L148 200 C182 206 220 224 226 264 Z" fill="url(#capa-${id})"/>
      <path d="M92 202 Q120 220 148 202 L147 210 Q120 228 93 210 Z" fill="var(--avatar-collar)"/>
      <path d="M94 204 Q120 220 146 204" stroke="var(--avatar-accent)" stroke-width="1.6" fill="none" opacity=".65"/>
      <g stroke="var(--avatar-stitch)" stroke-width="1.2" fill="none">
        <path d="M30 264 C40 236 64 220 88 214"/>
        <path d="M210 264 C200 236 176 220 152 214"/>
        <path d="M120 228 V264"/>
      </g>
      <path d="M42 260 C48 236 66 220 90 212" stroke="var(--avatar-shine)" stroke-width="2.2" fill="none" opacity=".14" stroke-linecap="round"/>
      <path d="M198 260 C192 236 174 220 150 212" stroke="var(--avatar-shine)" stroke-width="2.2" fill="none" opacity=".1" stroke-linecap="round"/>
      <g transform="translate(120 246)" stroke="var(--avatar-accent)" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8">
        <circle cx="-7" cy="-4" r="2.4"/><circle cx="-7" cy="6" r="2.4"/>
        <path d="M-5 -2 L8 8 M-5 4 L8 -6"/>
      </g>

      <!-- pescoço / orelhas -->
      <path d="M104 174 H136 V198 Q120 208 104 198 Z" fill="var(--avatar-skin-2)"/>
      <path d="M104 174 H136 V184 Q120 192 104 184 Z" fill="var(--avatar-skin-line)" opacity=".3"/>
      ${cabeloFundo}
      <ellipse cx="64" cy="112" rx="11" ry="14" fill="url(#pele-${id})"/>
      <ellipse cx="176" cy="112" rx="11" ry="14" fill="url(#pele-${id})"/>
      <path d="M62 108 q4 6 0 12" stroke="var(--avatar-skin-line)" stroke-width="1.6" fill="none" opacity=".65" stroke-linecap="round"/>
      <path d="M178 108 q-4 6 0 12" stroke="var(--avatar-skin-line)" stroke-width="1.6" fill="none" opacity=".65" stroke-linecap="round"/>

      <!-- rosto -->
      <path d="M120 44 C160 44 184 68 184 106 C184 148 156 176 120 176 C84 176 56 148 56 106 C56 68 80 44 120 44 Z" fill="url(#pele-${id})"/>
      <path d="M56 106 C56 148 84 176 120 176 C102 166 90 148 86 126 C82 102 90 78 106 62 C80 68 56 82 56 106 Z" fill="var(--avatar-skin-2)" opacity=".5"/>
      <path d="M74 92 C68 118 76 146 94 160" stroke="var(--avatar-shine)" stroke-width="3" fill="none" opacity=".16" stroke-linecap="round"/>
      <ellipse cx="120" cy="184" rx="26" ry="8" fill="#000" opacity=".12"/>

      ${cabelo}
      ${luzes}
      ${barba}

      <!-- sobrancelhas -->
      <path d="M84 94 Q96 87 108 93" stroke="var(--avatar-brow)" stroke-width="${traits.sobrancelha ? 4.8 : 3.4}" fill="none" stroke-linecap="round"/>
      <path d="M132 93 Q144 87 156 94" stroke="var(--avatar-brow)" stroke-width="${traits.sobrancelha ? 4.8 : 3.4}" fill="none" stroke-linecap="round"/>

      <!-- olhos -->
      <g class="avatar-blink" style="transform-box:fill-box;transform-origin:center">
        <ellipse cx="96" cy="112" rx="13.5" ry="11.5" fill="#fffaf3"/>
        <ellipse cx="97" cy="113" rx="8.6" ry="9.4" fill="url(#iris-${id})"/>
        <circle cx="97" cy="113" r="4.1" fill="var(--avatar-eye)"/>
        <circle cx="93.6" cy="108.8" r="2.7" fill="#ffffff"/>
        <circle cx="100.6" cy="116.8" r="1.4" fill="#ffffff" opacity=".85"/>
        <path d="M82.5 108 Q96 98.5 109.5 108" stroke="var(--avatar-eye)" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M82.5 108 l-4 -3.2" stroke="var(--avatar-eye)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M85 119 Q96 124.5 107 119" stroke="var(--avatar-skin-line)" stroke-width="1.3" fill="none" opacity=".45" stroke-linecap="round"/>
      </g>
      <g class="avatar-blink" style="transform-box:fill-box;transform-origin:center">
        <ellipse cx="144" cy="112" rx="13.5" ry="11.5" fill="#fffaf3"/>
        <ellipse cx="143" cy="113" rx="8.6" ry="9.4" fill="url(#iris-${id})"/>
        <circle cx="143" cy="113" r="4.1" fill="var(--avatar-eye)"/>
        <circle cx="139.6" cy="108.8" r="2.7" fill="#ffffff"/>
        <circle cx="146.6" cy="116.8" r="1.4" fill="#ffffff" opacity=".85"/>
        <path d="M130.5 108 Q144 98.5 157.5 108" stroke="var(--avatar-eye)" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M157.5 108 l4 -3.2" stroke="var(--avatar-eye)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M133 119 Q144 124.5 155 119" stroke="var(--avatar-skin-line)" stroke-width="1.3" fill="none" opacity=".45" stroke-linecap="round"/>
      </g>

      <ellipse cx="82" cy="128" rx="9" ry="4.2" fill="var(--avatar-blush)" opacity=".7"/>
      <ellipse cx="158" cy="128" rx="9" ry="4.2" fill="var(--avatar-blush)" opacity=".7"/>

      <!-- nariz -->
      <path d="M119 120 q-2 6 1 8.6 q2 1.6 4 .4" stroke="var(--avatar-skin-line)" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>

      <!-- boca -->
      ${traits.barba
        ? `<path d="M110 145 Q120 150 130 145" stroke="var(--avatar-skin)" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9"/>`
        : `<path d="M110 143 Q120 151 130 143" stroke="var(--avatar-skin-line)" stroke-width="2.6" fill="none" stroke-linecap="round"/>`}

      ${tratamento}
    </g>

    <rect x="1" y="1" width="238" height="262" rx="25" fill="none" stroke="var(--avatar-ring)" stroke-width="1.6" opacity=".75"/>
  </svg>`;
}

function servicosDoAgendamento(agendamento) {
  const lista = [];
  if (agendamento?.servico) {
    lista.push({
      nome: agendamento.servico.nome,
      slug: agendamento.servico.slug,
      icone: agendamento.servico.icone,
    });
  }
  for (const adicional of agendamento?.adicionais || []) {
    lista.push({ nome: adicional.nome });
  }
  return lista;
}

export function avatarDoAgendamento(agendamento) {
  if (agendamento?.avatar?.traits) {
    const traits = { ...vazio(), ...agendamento.avatar.traits };
    return { traits, rotulo: agendamento.avatar.rotulo || rotuloTraits(traits) };
  }
  const traits = mesclarAvatares(servicosDoAgendamento(agendamento));
  return { traits, rotulo: rotuloTraits(traits) };
}

/**
 * Avatar curto para a tabela do painel (linhas vindas direto do banco).
 */
export function avatarDaLinha(item = {}) {
  if (item?.avatar?.traits) {
    const traits = { ...vazio(), ...item.avatar.traits };
    return { traits, rotulo: item.avatar.rotulo || rotuloTraits(traits) };
  }
  const servicos = [];
  if (item.servico_nome) {
    servicos.push({ nome: item.servico_nome, slug: item.servico_slug, icone: item.servico_icone });
  }
  for (const adicional of item.adicionais || []) servicos.push({ nome: adicional.nome });
  const traits = mesclarAvatares(servicos);
  return { traits, rotulo: rotuloTraits(traits) };
}

export function avatarMini(item = {}, { tamanho = 34 } = {}) {
  const avatar = avatarDaLinha(item);
  return `<span class="avatar-mini" title="${escapar(avatar.rotulo)}">${avatarSVG(avatar.traits, {
    tamanho,
    rotulo: avatar.rotulo,
  })}</span>`;
}

/**
 * Cartão estilo adesivo usado no histórico, no sucesso e no painel do dono.
 */
export function stickerCard(agendamento, { compacto = false, titulo = 'Sticker do atendimento' } = {}) {
  const avatar = avatarDoAgendamento(agendamento);
  const nomes = servicosDoAgendamento(agendamento)
    .map((item) => item.nome)
    .filter(Boolean);
  const data = agendamento?.inicio ? formatarDataHora(agendamento.inicio) : '';

  return `
    <div class="sticker-card ${compacto ? 'is-compacto' : ''}">
      <div class="sticker-avatar">
        ${avatarSVG(avatar.traits, { tamanho: compacto ? 76 : 132, rotulo: avatar.rotulo })}
      </div>
      <div class="sticker-info">
        <span class="sticker-eyebrow">${escapar(titulo)}</span>
        <strong>${escapar(nomes.join(' + ') || 'Atendimento')}</strong>
        <span>${escapar(avatar.rotulo)}</span>
        ${data ? `<span>${escapar(data)}</span>` : ''}
      </div>
    </div>`;
}
