import { config } from '../config/env.js';
import { compararSeguro, tokenAleatorio } from '../utils/codigos.js';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ROTAS_ISENTAS = ['/api/pagamentos/pix/webhook'];

/**
 * CSRF por double-submit cookie:
 * - o cookie `bcity_csrf` é legível pelo JS (não é httpOnly);
 * - toda requisição de escrita precisa repetir o valor no header X-CSRF-Token.
 */
export function csrf(req, res, next) {
  let token = req.cookies?.[config.csrfCookieName];
  if (!token) {
    token = tokenAleatorio(24);
    res.cookie(config.csrfCookieName, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: config.cookieSecure,
      path: '/',
      maxAge: 2 * 60 * 60 * 1000,
    });
  }

  if (METODOS_SEGUROS.has(req.method)) return next();
  if (ROTAS_ISENTAS.some((rota) => req.originalUrl.startsWith(rota))) return next();

  const enviado = req.get('x-csrf-token') || req.body?._csrf || '';
  if (!enviado || !compararSeguro(token, enviado)) {
    return res.status(403).json({
      erro: 'Token de segurança inválido ou expirado. Recarregue a página e tente novamente.',
      codigo: 'csrf_invalido',
    });
  }
  return next();
}

export function emitirCsrf(req, res) {
  let token = req.cookies?.[config.csrfCookieName];
  if (!token) {
    token = tokenAleatorio(24);
    res.cookie(config.csrfCookieName, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: config.cookieSecure,
      path: '/',
      maxAge: 2 * 60 * 60 * 1000,
    });
  }
  res.json({ csrfToken: token });
}
