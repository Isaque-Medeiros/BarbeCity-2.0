/**
 * Normaliza telefones brasileiros para o formato E.164 sem "+".
 * Aceita "(11) 99999-9999", "11 96287 1086", "55 11 91450-3034", "11999999999".
 */
export function normalizarTelefone(valor) {
  let digitos = String(valor ?? '').replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.startsWith('0055')) digitos = digitos.slice(2);
  if (digitos.length === 11 && digitos.startsWith('0')) digitos = digitos.slice(1);
  if (digitos.length === 10 || digitos.length === 11) {
    const ddd = Number(digitos.slice(0, 2));
    if (ddd >= 11 && ddd <= 99) return `55${digitos}`;
  }
  return digitos;
}

export function telefoneValido(valor) {
  return /^55\d{10,11}$/.test(normalizarTelefone(valor));
}

export function formatarTelefone(valor) {
  const digitos = normalizarTelefone(valor);
  if (!digitos) return '';
  const semPais = digitos.startsWith('55') ? digitos.slice(2) : digitos;
  if (semPais.length === 11) {
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 7)}-${semPais.slice(7)}`;
  }
  if (semPais.length === 10) {
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 6)}-${semPais.slice(6)}`;
  }
  return valor ? String(valor) : '';
}

export function telefoneParaWa(valor) {
  return normalizarTelefone(valor).replace(/\D/g, '');
}

export function telefoneParcial(valor) {
  const digitos = normalizarTelefone(valor);
  if (digitos.length < 4) return '****';
  return `****${digitos.slice(-4)}`;
}
