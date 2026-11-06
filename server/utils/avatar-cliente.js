/**
 * Validação do avatar do cliente (espelha public/js/avatar3d.js).
 * Só entram valores conhecidos; qualquer coisa estranha volta ao padrão,
 * então o JSON gravado nunca carrega HTML ou string arbitrária.
 */

export const CORTES = ['degrade', 'social', 'moicano', 'longo', 'cacheado', 'careca'];
export const BARBAS = ['nenhuma', 'bigode', 'cavanhaque', 'cheia', 'barba'];
export const SOBRANCELHAS = ['normal', 'grossa', 'fina', 'arqueada'];
export const PELES = ['clara', 'media', 'morena', 'negra'];
export const CABELOS = ['preto', 'castanho', 'loiro', 'ruivo', 'grisalho'];

export const AVATAR_PADRAO = {
  corte: 'degrade',
  barba: 'nenhuma',
  sobrancelha: 'normal',
  pele: 'media',
  cabelo: 'preto',
};

function escolher(valor, permitidos, padrao) {
  const texto = String(valor ?? '').trim();
  return permitidos.includes(texto) ? texto : padrao;
}

export function normalizarAvatarCliente(entrada) {
  const cfg = entrada && typeof entrada === 'object' ? entrada : {};
  return {
    corte: escolher(cfg.corte, CORTES, AVATAR_PADRAO.corte),
    barba: escolher(cfg.barba, BARBAS, AVATAR_PADRAO.barba),
    sobrancelha: escolher(cfg.sobrancelha, SOBRANCELHAS, AVATAR_PADRAO.sobrancelha),
    pele: escolher(cfg.pele, PELES, AVATAR_PADRAO.pele),
    cabelo: escolher(cfg.cabelo, CABELOS, AVATAR_PADRAO.cabelo),
  };
}

export function avatarClientePublico(valor) {
  if (!valor || typeof valor !== 'object') return null;
  return normalizarAvatarCliente(valor);
}
