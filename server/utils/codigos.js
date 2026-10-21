import crypto from 'node:crypto';

export function tokenAleatorio(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function hashSha256(texto) {
  return crypto.createHash('sha256').update(String(texto)).digest('hex');
}

export function codigoNumerico(digitos = 6) {
  const max = 10 ** digitos;
  return String(crypto.randomInt(0, max)).padStart(digitos, '0');
}

export function codigoPublico() {
  return crypto.randomBytes(5).toString('hex');
}

export function compararSeguro(a, b) {
  const bufferA = Buffer.from(String(a ?? ''));
  const bufferB = Buffer.from(String(b ?? ''));
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export function hmacSha256(texto, segredo) {
  return crypto.createHmac('sha256', segredo).update(texto).digest('hex');
}
