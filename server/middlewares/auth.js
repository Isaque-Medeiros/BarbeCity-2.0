import { pool } from '../config/db.js';
import { config } from '../config/env.js';
import { hashToken, tokenAleatorio } from '../utils/codigos.js';
import { naoAutorizado, proibido } from '../utils/http.js';

const DIAS_MS = 24 * 60 * 60 * 1000;

function opcoesCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
    maxAge: config.sessionDias * DIAS_MS,
  };
}

export async function criarSessao(res, usuarioId) {
  const token = tokenAleatorio(32);
  const expiraEm = new Date(Date.now() + config.sessionDias * DIAS_MS);
  await pool.query(
    `INSERT INTO sessoes (usuario_id, token_hash, expira_em)
     VALUES ($1, $2, $3)`,
    [usuarioId, hashToken(token), expiraEm],
  );
  res.cookie(config.cookieName, token, opcoesCookie());
  return token;
}

export async function encerrarSessao(req, res) {
  const token = req.cookies?.[config.cookieName];
  if (token) {
    await pool.query('DELETE FROM sessoes WHERE token_hash = $1', [hashToken(token)]).catch(() => {});
  }
  res.clearCookie(config.cookieName, { ...opcoesCookie(), maxAge: undefined });
}

/**
 * Carrega a sessão (se existir) em toda requisição. Não bloqueia visitantes.
 */
export async function carregarUsuario(req, res, next) {
  try {
    const token = req.cookies?.[config.cookieName];
    req.usuario = null;
    req.sessao = null;
    if (!token) return next();

    const resultado = await pool.query(
      `SELECT s.id AS sessao_id, s.expira_em, s.ultimo_uso_em,
              u.id, u.nome, u.email, u.telefone, u.senha_hash, u.google_id,
              u.role, u.email_verificado, u.ativo, u.criado_em, u.ultimo_login_em
       FROM sessoes s
       JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token_hash = $1 AND s.expira_em > now()
       LIMIT 1`,
      [hashToken(token)],
    );

    const linha = resultado.rows[0];
    if (!linha || !linha.ativo) {
      res.clearCookie(config.cookieName, { ...opcoesCookie(), maxAge: undefined });
      return next();
    }

    req.sessao = { id: linha.sessao_id, expiraEm: linha.expira_em };
    req.usuario = {
      id: linha.id,
      nome: linha.nome,
      email: linha.email,
      telefone: linha.telefone,
      senha_hash: linha.senha_hash,
      google_id: linha.google_id,
      role: linha.role,
      email_verificado: linha.email_verificado,
      ativo: linha.ativo,
      criado_em: linha.criado_em,
      ultimo_login_em: linha.ultimo_login_em,
    };

    const restanteMs = new Date(linha.expira_em).getTime() - Date.now();
    const umDia = 24 * 60 * 60 * 1000;
    if (restanteMs < config.sessionDias * DIAS_MS - umDia) {
      const novaExpira = new Date(Date.now() + config.sessionDias * DIAS_MS);
      await pool.query('UPDATE sessoes SET expira_em = $1, ultimo_uso_em = now() WHERE id = $2', [
        novaExpira,
        linha.sessao_id,
      ]);
      res.cookie(config.cookieName, token, opcoesCookie());
    }

    return next();
  } catch (erro) {
    return next(erro);
  }
}

export function requireAuth(req, res, next) {
  if (!req.usuario) return next(naoAutorizado());
  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.usuario) return next(naoAutorizado());
  if (req.usuario.role !== 'admin') return next(proibido('Acesso restrito ao administrador.'));
  return next();
}

export function exigirDonoOuAdmin(req, donoId) {
  if (!req.usuario) throw naoAutorizado();
  if (req.usuario.role === 'admin') return;
  if (String(req.usuario.id) !== String(donoId)) throw proibido();
}
