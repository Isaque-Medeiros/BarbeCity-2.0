export function paraNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (valor === null || valor === undefined) return 0;
  const texto = String(valor).trim().replace(/\s/g, '').replace('R$', '');
  if (!texto) return 0;
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

export function arredondar(valor) {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

export function formatarBRL(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
}

export function calcularTroco(nota, total) {
  const n = paraNumero(nota);
  const t = paraNumero(total);
  if (!n || n <= 0) return null;
  return arredondar(Math.max(0, n - t));
}

export function somar(valores) {
  return arredondar(valores.reduce((total, valor) => total + paraNumero(valor), 0));
}
