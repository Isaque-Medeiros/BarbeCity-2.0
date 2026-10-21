import { api } from './api.js';

export const state = {
  config: null,
  horarios: [],
  usuario: null,
  carregado: false,
};

const CHAVE_CACHE = 'bcity_config_cache';
const VALIDADE_CACHE = 5 * 60 * 1000;

export async function carregarConfig(force = false) {
  if (!force) {
    const cache = sessionStorage.getItem(CHAVE_CACHE);
    if (cache) {
      try {
        const dados = JSON.parse(cache);
        if (Date.now() - dados.ts < VALIDADE_CACHE) {
          state.config = dados.configuracao;
          state.horarios = dados.horarios;
          return state;
        }
      } catch {
        /* cache inválido */
      }
    }
  }
  const dados = await api.get('/config/publica');
  state.config = dados.configuracao;
  state.horarios = dados.horarios;
  sessionStorage.setItem(CHAVE_CACHE, JSON.stringify({ ts: Date.now(), ...dados }));
  return state;
}

export async function carregarSessao() {
  try {
    const dados = await api.get('/auth/me');
    state.usuario = dados?.usuario || null;
  } catch {
    state.usuario = null;
  }
  return state.usuario;
}

export function definirUsuario(usuario) {
  state.usuario = usuario || null;
  window.dispatchEvent(new CustomEvent('bcity:usuario', { detail: state.usuario }));
}

export function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function brl(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
}

export function formatarData(valor, opcoes = {}) {
  const data = valor instanceof Date ? valor : new Date(valor);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...opcoes,
  }).format(data);
}

export function formatarDataHora(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(data);
}

export function formatarHora(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(data);
}

export function dataSP(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(data);
  const pegar = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
  return `${pegar('year')}-${pegar('month')}-${pegar('day')}`;
}

export function horaSP(valor) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(valor instanceof Date ? valor : new Date(valor));
}

export function formatarDataLonga(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(data);
}

export function formatarTelefone(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  const semPais = digitos.startsWith('55') ? digitos.slice(2) : digitos;
  if (semPais.length === 11) return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 7)}-${semPais.slice(7)}`;
  if (semPais.length === 10) return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 6)}-${semPais.slice(6)}`;
  return valor || '';
}

export function hojeISO() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

export function adicionarDias(dataISO, dias) {
  const data = new Date(`${String(dataISO).slice(0, 10)}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + Number(dias || 0));
  return data.toISOString().slice(0, 10);
}

export function primeiroNome(nome) {
  return String(nome || '').trim().split(/\s+/)[0] || '';
}

export function iniciais(nome) {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

export const STATUS = {
  pendente: { rotulo: 'Pendente', classe: 'badge-warning' },
  confirmado: { rotulo: 'Confirmado', classe: 'badge-gold' },
  concluido: { rotulo: 'Concluído', classe: 'badge-success' },
  cancelado: { rotulo: 'Cancelado', classe: 'badge-danger' },
  ausente: { rotulo: 'Ausente', classe: 'badge-muted' },
  pago: { rotulo: 'Pago', classe: 'badge-success' },
  na_hora: { rotulo: 'Pagar no local', classe: 'badge-warning' },
  falhou: { rotulo: 'Falhou', classe: 'badge-danger' },
  estornado: { rotulo: 'Estornado', classe: 'badge-muted' },
  link_gerado: { rotulo: 'Link gerado', classe: 'badge-muted' },
  enviado: { rotulo: 'Enviado', classe: 'badge-success' },
};

export function statusInfo(status) {
  return STATUS[status] || { rotulo: status || '—', classe: 'badge-muted' };
}

export function badgeStatus(status) {
  const info = statusInfo(status);
  return `<span class="badge ${info.classe}">${escapar(info.rotulo)}</span>`;
}

export function icone(nome, classe = '') {
  return `<svg class="icon ${classe}" aria-hidden="true" focusable="false"><use href="#i-${escapar(nome)}"></use></svg>`;
}

export function rotuloMetodo(metodo) {
  return { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'Pix', legado: 'Legado' }[metodo] || metodo || 'A definir';
}

export function urlWa(numero, texto) {
  const destino = String(numero || state.config?.whatsapp || '').replace(/\D/g, '');
  return `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
}

export function copiarTexto(texto) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(texto);
  const area = document.createElement('textarea');
  area.value = texto;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  return Promise.resolve();
}
