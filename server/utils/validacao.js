import { invalido } from './http.js';
import { normalizarTelefone, telefoneValido } from './telefone.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizarEmail(valor) {
  return String(valor ?? '').trim().toLowerCase();
}

export function emailValido(valor) {
  const email = normalizarEmail(valor);
  return email.length <= 254 && EMAIL_REGEX.test(email);
}

export function validarEmail(valor, campo = 'e-mail') {
  const email = normalizarEmail(valor);
  if (!email) throw invalido(`Informe o ${campo}.`, { campo });
  if (!emailValido(email)) throw invalido(`Informe um ${campo} válido.`, { campo });
  return email;
}

export function textoObrigatorio(valor, campo, { min = 2, max = 200 } = {}) {
  const texto = String(valor ?? '').trim().replace(/\s+/g, ' ');
  if (texto.length < min) throw invalido(`Informe ${campo} (mínimo ${min} caracteres).`, { campo });
  if (texto.length > max) throw invalido(`${campo} deve ter no máximo ${max} caracteres.`, { campo });
  return texto;
}

export function textoOpcional(valor, campo, { max = 500 } = {}) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  if (texto.length > max) throw invalido(`${campo} deve ter no máximo ${max} caracteres.`, { campo });
  return texto;
}

export function validarSenha(senha, { obrigatoria = true } = {}) {
  const texto = String(senha ?? '');
  if (!texto && !obrigatoria) return null;
  if (texto.length < 8) throw invalido('A senha precisa ter no mínimo 8 caracteres.', { campo: 'senha' });
  if (texto.length > 72) throw invalido('A senha pode ter no máximo 72 caracteres.', { campo: 'senha' });
  if (!/[A-Za-z]/.test(texto) || !/\d/.test(texto)) {
    throw invalido('A senha precisa ter pelo menos uma letra e um número.', { campo: 'senha' });
  }
  return texto;
}

export function validarTelefone(valor, campo = 'telefone') {
  if (!telefoneValido(valor)) {
    throw invalido('Informe um telefone válido com DDD. Ex.: (11) 99999-9999.', { campo });
  }
  return normalizarTelefone(valor);
}

export function validarUUID(valor, campo = 'id') {
  if (!UUID_REGEX.test(String(valor ?? ''))) throw invalido(`Identificador inválido (${campo}).`, { campo });
  return String(valor);
}

export function uuidValido(valor) {
  return UUID_REGEX.test(String(valor ?? ''));
}

export function validarBooleano(valor, campo) {
  if (typeof valor === 'boolean') return valor;
  if (valor === 'true' || valor === '1' || valor === 1) return true;
  if (valor === 'false' || valor === '0' || valor === 0) return false;
  throw invalido(`Valor inválido para ${campo}.`, { campo });
}

export function validarInteiro(valor, campo, { min = -Infinity, max = Infinity, padrao } = {}) {
  if ((valor === undefined || valor === null || valor === '') && padrao !== undefined) return padrao;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < min || numero > max) {
    throw invalido(`Valor inválido para ${campo}.`, { campo });
  }
  return numero;
}

export function validarNumero(valor, campo, { min = 0, max = 1_000_000 } = {}) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < min || numero > max) {
    throw invalido(`Valor inválido para ${campo}.`, { campo });
  }
  return numero;
}

export function validarDataISO(valor, campo = 'data') {
  const texto = String(valor ?? '').trim();
  if (!DATA_REGEX.test(texto)) throw invalido('Data inválida. Use o formato AAAA-MM-DD.', { campo });
  const data = new Date(`${texto}T12:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== texto) {
    throw invalido('Data inválida.', { campo });
  }
  return texto;
}

export function validarHora(valor, campo = 'hora') {
  const texto = String(valor ?? '').trim();
  if (!HORA_REGEX.test(texto)) throw invalido('Horário inválido. Use HH:MM.', { campo });
  return texto;
}

export function validarMes(valor, campo = 'mes') {
  const texto = String(valor ?? '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(texto)) {
    throw invalido('Mês inválido. Use o formato AAAA-MM.', { campo });
  }
  return texto;
}

export function umDe(valor, permitidos, campo) {
  const texto = String(valor ?? '').trim();
  if (!permitidos.includes(texto)) {
    throw invalido(`Valor inválido para ${campo}.`, { campo, permitidos });
  }
  return texto;
}

export function listaUUIDs(valor, campo = 'itens', { max = 5 } = {}) {
  if (valor === null || valor === undefined || valor === '') return [];
  const lista = Array.isArray(valor) ? valor : String(valor).split(',');
  const unicos = [...new Set(lista.map((item) => String(item).trim()).filter(Boolean))];
  if (unicos.length > max) throw invalido(`Selecione no máximo ${max} itens.`, { campo });
  for (const item of unicos) validarUUID(item, campo);
  return unicos;
}

export function validarSlug(valor, campo = 'slug') {
  const texto = String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  if (!texto) throw invalido(`Informe um ${campo} válido.`, { campo });
  return texto;
}

export function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
