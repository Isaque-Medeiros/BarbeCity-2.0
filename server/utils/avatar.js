/**
 * Traços do avatar de barbearia.
 *
 * O avatar é 100% determinístico (SVG/CSS), sem IA: o servidor decide os traços
 * a partir do serviço e o front apenas desenha. Isso mantém o histórico estável
 * e permite que o dono ajuste manualmente pelo painel (`servicos.avatar_traits`).
 */

export const TRAITS = ['cabelo', 'barba', 'sobrancelha', 'luzes', 'tratamento'];

const ROTULOS = {
  cabelo: 'Cabelo',
  barba: 'Barba',
  sobrancelha: 'Sobrancelha',
  luzes: 'Luzes',
  tratamento: 'Tratamento',
};

function normalizar(valor) {
  return String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function traitsVazios() {
  return Object.fromEntries(TRAITS.map((traco) => [traco, false]));
}

function normalizarTraits(valor) {
  if (!valor) return null;

  if (Array.isArray(valor)) {
    const lista = valor.map((item) => normalizar(item));
    return Object.fromEntries(TRAITS.map((traco) => [traco, lista.includes(traco)]));
  }

  if (typeof valor === 'object') {
    return Object.fromEntries(TRAITS.map((traco) => [traco, Boolean(valor[traco])]));
  }

  return null;
}

/**
 * Detecta os traços de um serviço.
 * Prioridade: override do admin → palavras-chave do nome/slug → ícone → categoria.
 */
export function detectarTraits(servico = {}) {
  const override = normalizarTraits(servico?.avatar_traits ?? servico?.avatarTraits);
  if (override) {
    if (override.luzes || override.tratamento) override.cabelo = true;
    return override;
  }

  const traits = traitsVazios();
  const texto = normalizar(`${servico?.slug ?? ''} ${servico?.nome ?? ''}`);
  const icone = normalizar(servico?.icone);

  if (/corte|cabelo|maquina|tesoura|pente/.test(texto) || icone === 'scissors') traits.cabelo = true;
  if (/barba|bigode|navalha/.test(texto) || icone === 'razor') traits.barba = true;
  if (/sobrancelha|design de sobrancelha/.test(texto) || icone === 'eyebrow') traits.sobrancelha = true;
  if (/luzes|mechas|platinum|descolor/.test(texto) || icone === 'highlights') {
    traits.cabelo = true;
    traits.luzes = true;
  }
  if (/hidratacao|hidratante|botox|tratamento|reconstrucao/.test(texto) || ['droplet', 'flask'].includes(icone)) {
    traits.cabelo = true;
    traits.tratamento = true;
  }

  const algumTraco = TRAITS.some((traco) => traits[traco]);
  if (!algumTraco) {
    if (servico?.categoria === 'combo' || icone === 'combo' || icone === 'crown') {
      traits.cabelo = true;
      traits.barba = true;
    } else {
      traits.cabelo = true;
    }
  }

  return traits;
}

/**
 * Une os traços de vários serviços (principal + adicionais).
 */
export function mesclarTraits(lista) {
  const traits = traitsVazios();
  for (const item of Array.isArray(lista) ? lista : []) {
    const detectados = detectarTraits(item);
    for (const traco of TRAITS) {
      if (detectados[traco]) traits[traco] = true;
    }
  }
  if (traits.luzes || traits.tratamento) traits.cabelo = true;
  return traits;
}

/**
 * `careca` é derivado: sem cabelo, mas com barba ou sobrancelha.
 */
export function precisaCareca(traits) {
  return !traits?.cabelo && Boolean(traits?.barba || traits?.sobrancelha);
}

export function descreverTraits(traits) {
  const ativos = TRAITS.filter((traco) => traits?.[traco]).map((traco) => ROTULOS[traco]);
  if (ativos.length === 0) return 'Visual clássico';
  const prefixo = precisaCareca(traits) ? 'Careca · ' : '';
  return `${prefixo}${ativos.join(' + ')}`;
}

/**
 * Avatar pronto de um serviço.
 */
export function avatarDoServico(servico = {}) {
  const traits = detectarTraits(servico);
  return { traits, careca: precisaCareca(traits), rotulo: descreverTraits(traits) };
}

/**
 * Avatar de um conjunto de serviços (usado no preview e no snapshot do agendamento).
 */
export function avatarDeServicos(servicos = []) {
  const traits = mesclarTraits(servicos);
  return { traits, careca: precisaCareca(traits), rotulo: descreverTraits(traits) };
}

export function traitsPermitidos(valor) {
  const normalizado = normalizarTraits(valor);
  if (!normalizado) return null;
  if (normalizado.luzes || normalizado.tratamento) normalizado.cabelo = true;
  return normalizado;
}
