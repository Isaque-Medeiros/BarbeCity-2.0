import { config } from '../config/env.js';

const TZ_PADRAO = config.timezone;

function partes(data, timeZone = TZ_PADRAO) {
  const formatador = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const mapa = {};
  for (const parte of formatador.formatToParts(data)) {
    if (parte.type !== 'literal') mapa[parte.type] = Number(parte.value);
  }
  return mapa;
}

function offsetMs(data, timeZone = TZ_PADRAO) {
  const p = partes(data, timeZone);
  const comoUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return comoUtc - Math.floor(data.getTime() / 1000) * 1000;
}

/**
 * Converte "2026-10-25" ou "2026-10-25T14:00[:00]" (hora local da barbearia)
 * para um Date em UTC. Robusto inclusive com mudanças de fuso.
 */
export function localParaUtc(dataHoraLocal, timeZone = TZ_PADRAO) {
  const texto = String(dataHoraLocal ?? '').trim();
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) throw new Error(`Data/hora inválida: ${texto}`);
  const [, ano, mes, dia, hora = '00', minuto = '00', segundo = '00'] = match;
  const alvo = Date.UTC(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo));
  let timestamp = alvo;
  for (let i = 0; i < 3; i += 1) {
    timestamp = alvo - offsetMs(new Date(timestamp), timeZone);
  }
  return new Date(timestamp);
}

export function hojeISO(timeZone = TZ_PADRAO) {
  const p = partes(new Date(), timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function agoraMinutos(timeZone = TZ_PADRAO) {
  const p = partes(new Date(), timeZone);
  return p.hour * 60 + p.minute;
}

export function diaSemana(dataISO) {
  const data = new Date(`${String(dataISO).slice(0, 10)}T12:00:00Z`);
  return data.getUTCDay();
}

export function adicionarDias(dataISO, dias) {
  const data = new Date(`${String(dataISO).slice(0, 10)}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + Number(dias || 0));
  return data.toISOString().slice(0, 10);
}

export function diferencaDias(dataISO, referencia = hojeISO()) {
  const a = new Date(`${String(dataISO).slice(0, 10)}T12:00:00Z`).getTime();
  const b = new Date(`${String(referencia).slice(0, 10)}T12:00:00Z`).getTime();
  return Math.round((a - b) / 86_400_000);
}

export function combinarDataHora(dataISO, horaHHMM, timeZone = TZ_PADRAO) {
  return localParaUtc(`${String(dataISO).slice(0, 10)}T${horaHHMM}`, timeZone);
}

export function horaParaMinutos(hora) {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutosParaHora(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatarDataHora(valor, timeZone = TZ_PADRAO) {
  const data = valor instanceof Date ? valor : new Date(valor);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(data);
}

export function formatarData(valor, timeZone = TZ_PADRAO) {
  const data = valor instanceof Date ? valor : new Date(valor);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data);
}

export function formatarHora(valor, timeZone = TZ_PADRAO) {
  const data = valor instanceof Date ? valor : new Date(valor);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(data);
}

export function formatarDataLonga(valor, timeZone = TZ_PADRAO) {
  const data = valor instanceof Date ? valor : new Date(valor);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(data);
}

export function formatarDataISO(valor, timeZone = TZ_PADRAO) {
  const p = partes(valor instanceof Date ? valor : new Date(valor), timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function formatarHoraISO(valor, timeZone = TZ_PADRAO) {
  const p = partes(valor instanceof Date ? valor : new Date(valor), timeZone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

export function infoMes(anoMes) {
  const match = String(anoMes ?? '').match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new Error('Mês inválido. Use o formato AAAA-MM.');
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  if (mes < 1 || mes > 12) throw new Error('Mês inválido.');
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1, 12));
  const ultimo = new Date(Date.UTC(ano, mes, 0, 12));
  return {
    ano,
    mes,
    primeiroDiaSemana: primeiro.getUTCDay(),
    totalDias: ultimo.getUTCDate(),
    primeiroISO: `${ano}-${String(mes).padStart(2, '0')}-01`,
    ultimoISO: `${ano}-${String(mes).padStart(2, '0')}-${String(ultimo.getUTCDate()).padStart(2, '0')}`,
  };
}

export function intervaloValido(inicio, fim) {
  return inicio instanceof Date && fim instanceof Date && fim.getTime() > inicio.getTime();
}

export { TZ_PADRAO };
