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
 * Desenha o avatar. `tamanho` controla a largura em px.
 */
export function avatarSVG(traitsEntrada = {}, { tamanho = 200, rotulo = '' } = {}) {
  const traits = { ...vazio(), ...traitsEntrada };
  const careca = carecaDe(traits);
  const id = proximoId();
  const rotuloFinal = rotulo || rotuloTraits(traits);
  const largura = Math.max(48, Number(tamanho) || 200);
  const altura = Math.round(largura * 1.1);

  const cabelo = careca
    ? `<ellipse cx="86" cy="52" rx="16" ry="7" fill="#ffffff" opacity=".25" transform="rotate(-18 86 52)"/>`
    : `
      <path d="M56 78 Q58 34 100 32 Q142 34 144 78 Q132 54 100 52 Q68 54 56 78 Z" fill="#2b2522"/>
      <path d="M62 54 L70 40 L78 54 L86 38 L94 54 L102 38 L110 54 L118 41 L126 54 L134 45 L138 58 Z" fill="#2b2522"/>
      ${traits.luzes ? `
        <path d="M78 40 Q82 62 80 88" stroke="#d4af37" stroke-width="7" fill="none" opacity=".95" stroke-linecap="round"/>
        <path d="M98 36 Q101 60 99 86" stroke="#b91c1c" stroke-width="6" fill="none" opacity=".9" stroke-linecap="round"/>
        <path d="M118 40 Q116 62 120 90" stroke="#3b82f6" stroke-width="6" fill="none" opacity=".9" stroke-linecap="round"/>
      ` : ''}`;

  const barba = traits.barba
    ? `
      <path d="M58 94 Q60 142 100 148 Q140 142 142 94 Q133 126 100 131 Q67 126 58 94 Z" fill="#2b2522"/>
      <path d="M80 114 Q100 126 120 114 Q117 128 100 132 Q83 128 80 114 Z" fill="#241f1c"/>
    `
    : '';

  const tratamento = traits.tratamento
    ? `
      <g fill="#d4af37">
        <path d="M34 62 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/>
        <path d="M164 84 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z"/>
        <path d="M156 132 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/>
      </g>`
    : '';

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" width="${largura}" height="${altura}"
       role="img" aria-label="${escapar(rotuloFinal)}" class="avatar-svg">
    <title>${escapar(rotuloFinal)}</title>
    <defs>
      <clipPath id="cabeca-${id}"><ellipse cx="100" cy="86" rx="43" ry="51"/></clipPath>
      <linearGradient id="fundo-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset="1" stop-color="#eef1f4"/>
      </linearGradient>
    </defs>

    <rect width="200" height="220" rx="26" fill="url(#fundo-${id})"/>
    <circle cx="100" cy="92" r="76" fill="#f3f5f7"/>

    <g opacity=".18">
      <rect x="158" y="26" width="10" height="76" rx="5" fill="#b91c1c"/>
      <rect x="170" y="26" width="10" height="76" rx="5" fill="#3b82f6"/>
    </g>

    <rect x="38" y="168" width="124" height="40" rx="16" fill="#dfe4e8"/>
    <rect x="58" y="176" width="84" height="30" rx="12" fill="#c9d0d6"/>
    <rect x="94" y="150" width="12" height="26" rx="6" fill="#b8c0c6"/>

    <path d="M50 220 L60 178 Q100 158 140 178 L150 220 Z" fill="#b91c1c"/>
    <path d="M50 220 L60 178 Q72 172 82 171 L86 220 Z" fill="#991b1b"/>
    <path d="M60 178 Q100 194 140 178" fill="none" stroke="#d4af37" stroke-width="3"/>

    <rect x="86" y="124" width="28" height="38" rx="13" fill="#98a0a7"/>
    <ellipse cx="57" cy="92" rx="8" ry="13" fill="#9aa2a9"/>
    <ellipse cx="143" cy="92" rx="8" ry="13" fill="#9aa2a9"/>
    <ellipse cx="100" cy="86" rx="43" ry="51" fill="#a7afb6"/>

    <g clip-path="url(#cabeca-${id})">
      ${cabelo}
      ${barba}
    </g>

    <path d="M76 74 Q84 69 92 74" stroke="#4a4038" stroke-width="${traits.sobrancelha ? 4.2 : 2.6}" fill="none" stroke-linecap="round"/>
    <path d="M108 74 Q116 69 124 74" stroke="#4a4038" stroke-width="${traits.sobrancelha ? 4.2 : 2.6}" fill="none" stroke-linecap="round"/>

    <ellipse cx="82" cy="87" rx="4" ry="5" fill="#2b2522"/>
    <ellipse cx="118" cy="87" rx="4" ry="5" fill="#2b2522"/>
    <circle cx="83.5" cy="85.5" r="1.3" fill="#ffffff"/>
    <circle cx="119.5" cy="85.5" r="1.3" fill="#ffffff"/>

    <path d="M100 88 Q96 100 101 102" stroke="#8f979e" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${traits.barba
      ? `<path d="M90 117 Q100 123 110 117" stroke="#7d6a5b" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      : `<path d="M90 112 Q100 119 110 112" stroke="#6b5c50" stroke-width="2.6" fill="none" stroke-linecap="round"/>`}

    ${tratamento}
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
