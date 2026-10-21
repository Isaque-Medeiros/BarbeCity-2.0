import { pool } from '../config/db.js';
import { config, recursos } from '../config/env.js';
import { HttpError, asyncHandler, conflito, invalido } from '../utils/http.js';
import { compararSeguro, tokenAleatorio } from '../utils/codigos.js';
import { conferirSenha, gerarHashSenha, precisaRehash } from '../utils/senha.js';
import { usuarioPublico } from '../utils/serializadores.js';
import {
  emailValido,
  normalizarEmail,
  textoObrigatorio,
  validarEmail,
  validarSenha,
  validarTelefone,
} from '../utils/validacao.js';
import { criarSessao, encerrarSessao } from '../middlewares/auth.js';
import { emailBoasVindas, enviarEmail } from '../services/brevo.service.js';
import {
  googleConfigurado,
  obterPerfilGoogle,
  trocarCodigoPorToken,
  urlConsentimento,
} from '../services/google.service.js';
import { enviarCodigoPorEmail, validarToken } from '../services/tokens.service.js';
import { vincularAgendamentos } from '../services/agendamentos.service.js';

async function usuarioPorEmail(email) {
  const resultado = await pool.query('SELECT * FROM usuarios WHERE lower(email) = lower($1)', [email]);
  return resultado.rows[0] || null;
}

async function usuarioPorId(id) {
  const resultado = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
  return resultado.rows[0] || null;
}

async function concluirLogin(res, usuario) {
  await pool.query('UPDATE usuarios SET ultimo_login_em = now() WHERE id = $1', [usuario.id]);
  const vinculados = await vincularAgendamentos(usuario.id, usuario.email);
  await criarSessao(res, usuario.id);
  return { usuario: usuarioPublico(usuario), agendamentosVinculados: vinculados };
}

async function criarUsuario({ nome, email, senha = null, telefone = null, googleId = null, emailVerificado = false }) {
  const hash = senha ? await gerarHashSenha(senha) : null;
  const resultado = await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, telefone, google_id, email_verificado, role)
     VALUES ($1, $2, $3, $4, $5, $6, 'cliente')
     RETURNING *`,
    [nome, email, hash, telefone, googleId, emailVerificado],
  );
  return resultado.rows[0];
}

export const csrf = asyncHandler(async (req, res) => {
  const { emitirCsrf } = await import('../middlewares/csrf.js');
  return emitirCsrf(req, res);
});

export const cadastro = asyncHandler(async (req, res) => {
  const nome = textoObrigatorio(req.body?.nome, 'seu nome', { min: 2, max: 120 });
  const email = validarEmail(req.body?.email, 'e-mail');
  const senha = validarSenha(req.body?.senha);
  const telefone = req.body?.telefone ? validarTelefone(req.body.telefone) : null;
  if (req.body?.aceitePrivacidade !== true) {
    throw invalido('É necessário aceitar a política de privacidade.', { campo: 'aceitePrivacidade' });
  }

  const existente = await usuarioPorEmail(email);
  if (existente) {
    if (!existente.senha_hash && existente.google_id) {
      throw conflito('Este e-mail já usa login com Google. Entre com o Google.', 'email_google');
    }
    throw conflito('Este e-mail já está cadastrado. Faça login.', 'email_em_uso');
  }

  const usuario = await criarUsuario({ nome, email, senha, telefone });
  const sessao = await concluirLogin(res, usuario);

  const boasVindas = emailBoasVindas({ nome: usuario.nome });
  await enviarEmail({ para: usuario.email, nome: usuario.nome, ...boasVindas }).catch(() => {});

  return res.status(201).json(sessao);
});

export const login = asyncHandler(async (req, res) => {
  const email = validarEmail(req.body?.email, 'e-mail');
  const senha = String(req.body?.senha ?? '');
  if (!senha) throw invalido('Informe sua senha.', { campo: 'senha' });

  const usuario = await usuarioPorEmail(email);
  if (!usuario || !usuario.ativo) {
    throw new HttpError(401, 'E-mail ou senha incorretos.', 'credenciais');
  }
  if (!usuario.senha_hash) {
    throw conflito(
      'Esta conta usa login com Google ou código por e-mail. Use uma dessas opções.',
      'sem_senha',
    );
  }
  const senhaOk = await conferirSenha(senha, usuario.senha_hash);
  if (!senhaOk) {
    throw new HttpError(401, 'E-mail ou senha incorretos.', 'credenciais');
  }
  if (precisaRehash(usuario.senha_hash)) {
    const novoHash = await gerarHashSenha(senha);
    await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [novoHash, usuario.id]);
  }

  const sessao = await concluirLogin(res, usuario);
  return res.json(sessao);
});

export const solicitarToken = asyncHandler(async (req, res) => {
  const email = validarEmail(req.body?.email, 'e-mail');
  if (!recursos.brevoAtivo) {
    throw new HttpError(
      503,
      'O envio de códigos por e-mail ainda não está configurado. Use senha ou Google.',
      'email_indisponivel',
    );
  }

  let usuario = await usuarioPorEmail(email);
  if (!usuario) {
    const nome = email
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (letra) => letra.toUpperCase());
    usuario = await criarUsuario({ nome, email, emailVerificado: false });
  }

  const resultado = await enviarCodigoPorEmail({ email, nome: usuario.nome });
  return res.json({
    mensagem: 'Se o e-mail estiver correto, enviaremos um código de acesso em instantes.',
    expiraEmMinutos: 15,
    ...(config.producao ? {} : { codigoDev: resultado.codigo }),
  });
});

export const validarTokenLogin = asyncHandler(async (req, res) => {
  const email = validarEmail(req.body?.email, 'e-mail');
  const codigo = String(req.body?.codigo ?? '').trim();
  if (!/^\d{6}$/.test(codigo)) throw invalido('Digite o código de 6 dígitos.', { campo: 'codigo' });

  const validacao = await validarToken({ email, codigo, tipo: 'magic_link' });
  if (!validacao.valido) {
    const mensagens = {
      expirado: 'Código expirado. Peça um novo código.',
      bloqueado: 'Muitas tentativas. Peça um novo código.',
      codigo_invalido: 'Código incorreto. Confira e tente novamente.',
    };
    throw invalido(mensagens[validacao.motivo] || 'Código inválido.', { campo: 'codigo' });
  }

  let usuario = await usuarioPorEmail(email);
  if (!usuario) {
    const nome = email.split('@')[0];
    usuario = await criarUsuario({ nome, email, emailVerificado: true });
  } else if (!usuario.email_verificado) {
    await pool.query('UPDATE usuarios SET email_verificado = TRUE WHERE id = $1', [usuario.id]);
    usuario.email_verificado = true;
  }
  if (!usuario.ativo) throw conflito('Esta conta está desativada. Fale com a barbearia.', 'conta_inativa');

  const sessao = await concluirLogin(res, usuario);
  return res.json(sessao);
});

export const googleIniciar = asyncHandler(async (req, res) => {
  if (!googleConfigurado()) {
    return res.redirect('/login.html?erro=google_indisponivel');
  }
  const state = tokenAleatorio(24);
  res.cookie('bcity_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
    maxAge: 10 * 60 * 1000,
  });
  return res.redirect(urlConsentimento(state));
});

export const googleCallback = asyncHandler(async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const stateCookie = req.cookies?.bcity_oauth_state;
    res.clearCookie('bcity_oauth_state', { path: '/' });

    if (error) return res.redirect('/login.html?erro=google_cancelado');
    if (!code || !state || !stateCookie || !compararSeguro(String(state), stateCookie)) {
      return res.redirect('/login.html?erro=google_estado');
    }
    if (!googleConfigurado()) return res.redirect('/login.html?erro=google_indisponivel');

    const tokens = await trocarCodigoPorToken(String(code));
    const perfil = await obterPerfilGoogle(tokens.access_token);
    const email = normalizarEmail(perfil.email);
    if (!emailValido(email)) return res.redirect('/login.html?erro=google_email');

    let usuario = await usuarioPorEmail(email);
    if (usuario) {
      const atualizacoes = [];
      const valores = [];
      if (!usuario.google_id) {
        valores.push(perfil.sub);
        atualizacoes.push(`google_id = $${valores.length}`);
      }
      if (!usuario.email_verificado) atualizacoes.push('email_verificado = TRUE');
      if ((!usuario.nome || usuario.nome.length < 2) && perfil.name) {
        valores.push(perfil.name);
        atualizacoes.push(`nome = $${valores.length}`);
      }
      if (atualizacoes.length > 0) {
        valores.push(usuario.id);
        await pool.query(`UPDATE usuarios SET ${atualizacoes.join(', ')} WHERE id = $${valores.length}`, valores);
        usuario = await usuarioPorId(usuario.id);
      }
    } else {
      usuario = await criarUsuario({
        nome: perfil.name || email.split('@')[0],
        email,
        googleId: perfil.sub,
        emailVerificado: true,
      });
    }

    if (!usuario.ativo) return res.redirect('/login.html?erro=conta_inativa');
    await concluirLogin(res, usuario);
    return res.redirect('/usuario.html?bemvindo=1');
  } catch (erro) {
    console.error('[auth] erro no Google OAuth:', erro.message);
    return res.redirect('/login.html?erro=google_falhou');
  }
});

export const logout = asyncHandler(async (req, res) => {
  await encerrarSessao(req, res);
  return res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  return res.json({ usuario: req.usuario ? usuarioPublico(req.usuario) : null });
});

export const esqueciSenha = asyncHandler(async (req, res) => {
  const email = validarEmail(req.body?.email, 'e-mail');
  if (!recursos.brevoAtivo) {
    throw new HttpError(503, 'Envio de e-mail não configurado.', 'email_indisponivel');
  }
  const usuario = await usuarioPorEmail(email);
  if (usuario && usuario.ativo) {
    await enviarCodigoPorEmail({ email, nome: usuario.nome, tipo: 'redefinir_senha' });
  }
  return res.json({
    mensagem: 'Se existir uma conta com este e-mail, enviaremos as instruções em instantes.',
  });
});

export const redefinirSenha = asyncHandler(async (req, res) => {
  const email = validarEmail(req.body?.email, 'e-mail');
  const codigo = String(req.body?.codigo ?? '').trim();
  const novaSenha = validarSenha(req.body?.novaSenha);
  if (!/^\d{6}$/.test(codigo)) throw invalido('Digite o código de 6 dígitos.', { campo: 'codigo' });

  const validacao = await validarToken({ email, codigo, tipo: 'redefinir_senha' });
  if (!validacao.valido) throw invalido('Código inválido ou expirado. Peça um novo.', { campo: 'codigo' });

  const usuario = await usuarioPorEmail(email);
  if (!usuario || !usuario.ativo) throw invalido('Conta não encontrada.', { campo: 'email' });

  const hash = await gerarHashSenha(novaSenha);
  await pool.query('UPDATE usuarios SET senha_hash = $1, email_verificado = TRUE WHERE id = $2', [hash, usuario.id]);
  await pool.query('DELETE FROM sessoes WHERE usuario_id = $1', [usuario.id]);
  const atualizado = await usuarioPorId(usuario.id);
  const sessao = await concluirLogin(res, atualizado);
  return res.json({ ...sessao, mensagem: 'Senha alterada com sucesso.' });
});

export const reenviarVerificacao = asyncHandler(async (req, res) => {
  if (!req.usuario) throw new HttpError(401, 'Entre para continuar.', 'nao_autenticado');
  if (req.usuario.email_verificado) return res.json({ mensagem: 'Seu e-mail já está verificado.' });
  if (!recursos.brevoAtivo) return res.json({ mensagem: 'Envio de e-mail indisponível no momento.' });
  await enviarCodigoPorEmail({
    email: req.usuario.email,
    nome: req.usuario.nome,
    tipo: 'verificacao_email',
  });
  return res.json({ mensagem: 'Enviamos um código de verificação para o seu e-mail.' });
});

export const verificarEmail = asyncHandler(async (req, res) => {
  if (!req.usuario) throw new HttpError(401, 'Entre para continuar.', 'nao_autenticado');
  const codigo = String(req.body?.codigo ?? '').trim();
  if (!/^\d{6}$/.test(codigo)) throw invalido('Digite o código de 6 dígitos.', { campo: 'codigo' });
  const validacao = await validarToken({ email: req.usuario.email, codigo, tipo: 'verificacao_email' });
  if (!validacao.valido) throw invalido('Código inválido ou expirado.', { campo: 'codigo' });
  await pool.query('UPDATE usuarios SET email_verificado = TRUE WHERE id = $1', [req.usuario.id]);
  return res.json({ mensagem: 'E-mail verificado com sucesso.' });
});

