import { pool } from '../config/db.js';
import { config } from '../config/env.js';
import { codigoNumerico, compararSeguro, hashToken, tokenAleatorio } from '../utils/codigos.js';
import { emailToken, enviarEmail } from './brevo.service.js';

const VALIDADE_MIN = 15;
const MAX_TENTATIVAS = 5;

export async function criarToken({ usuario, email, tipo = 'magic_link', validadeMin = VALIDADE_MIN }) {
  const codigo = codigoNumerico(6);
  const expiraEm = new Date(Date.now() + validadeMin * 60_000);
  await pool.query(
    `UPDATE tokens_login SET usado = TRUE
     WHERE lower(email) = lower($1) AND tipo = $2 AND usado = FALSE`,
    [email, tipo],
  );
  await pool.query(
    `INSERT INTO tokens_login (email, usuario_id, token_hash, tipo, expira_em)
     VALUES ($1, $2, $3, $4, $5)`,
    [email, usuario?.id || null, hashToken(codigo), tipo, expiraEm],
  );
  return { codigo, expiraEm, validadeMin };
}

export async function enviarCodigoPorEmail({ email, nome, tipo = 'magic_link', validadeMin = VALIDADE_MIN }) {
  const existente = await pool.query('SELECT id, nome FROM usuarios WHERE lower(email) = lower($1)', [email]);
  const usuario = existente.rows[0] || null;
  const { codigo } = await criarToken({ usuario, email, tipo, validadeMin });
  const link =
    tipo === 'redefinir_senha'
      ? `${config.baseUrl}/login.html?redefinir=1&email=${encodeURIComponent(email)}`
      : `${config.baseUrl}/login.html?email=${encodeURIComponent(email)}`;
  const mensagem = emailToken({ nome: usuario?.nome || nome, codigo, link, validadeMin, tipo });
  const resultado = await enviarEmail({ para: email, nome: usuario?.nome || nome, ...mensagem });
  return { ...resultado, codigo: config.producao ? undefined : codigo, link };
}

export async function validarToken({ email, codigo, tipo = 'magic_link' }) {
  const resultado = await pool.query(
    `SELECT * FROM tokens_login
     WHERE lower(email) = lower($1) AND tipo = $2 AND usado = FALSE AND expira_em > now()
     ORDER BY criado_em DESC LIMIT 1`,
    [email, tipo],
  );
  const token = resultado.rows[0];
  if (!token) return { valido: false, motivo: 'expirado' };
  if (token.tentativas >= MAX_TENTATIVAS) {
    await pool.query('UPDATE tokens_login SET usado = TRUE WHERE id = $1', [token.id]);
    return { valido: false, motivo: 'bloqueado' };
  }
  if (!compararSeguro(hashToken(String(codigo)), token.token_hash)) {
    await pool.query('UPDATE tokens_login SET tentativas = tentativas + 1 WHERE id = $1', [token.id]);
    return { valido: false, motivo: 'codigo_invalido' };
  }
  await pool.query('UPDATE tokens_login SET usado = TRUE WHERE id = $1', [token.id]);
  return { valido: true, token };
}

export function gerarTokenAleatorio() {
  return tokenAleatorio(24);
}
