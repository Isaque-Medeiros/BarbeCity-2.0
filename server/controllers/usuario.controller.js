import { pool } from '../config/db.js';
import { asyncHandler, conflito, invalido, naoAutorizado } from '../utils/http.js';
import { conferirSenha, gerarHashSenha } from '../utils/senha.js';
import { usuarioPublico } from '../utils/serializadores.js';
import { textoObrigatorio, validarSenha, validarTelefone } from '../utils/validacao.js';
import { encerrarSessao } from '../middlewares/auth.js';

export const perfil = asyncHandler(async (req, res) => {
  const resumo = await pool.query(
    `SELECT
       count(*) FILTER (WHERE status IN ('pendente', 'confirmado') AND data_hora_fim >= now())::int AS proximos,
       count(*) FILTER (WHERE status = 'concluido')::int AS concluidos,
       count(*)::int AS total,
       COALESCE(sum(valor_pago), 0)::numeric(10,2) AS total_pago
     FROM agendamentos WHERE usuario_id = $1`,
    [req.usuario.id],
  );
  const ultimo = await pool.query(
    `SELECT max(data_hora_inicio) AS ultimo FROM agendamentos
     WHERE usuario_id = $1 AND status = 'concluido'`,
    [req.usuario.id],
  );
  return res.json({
    usuario: usuarioPublico(req.usuario),
    resumo: {
      proximos: resumo.rows[0].proximos,
      concluidos: resumo.rows[0].concluidos,
      total: resumo.rows[0].total,
      totalPago: Number(resumo.rows[0].total_pago),
      ultimoAtendimento: ultimo.rows[0].ultimo,
    },
  });
});

export const atualizarPerfil = asyncHandler(async (req, res) => {
  const nome = textoObrigatorio(req.body?.nome ?? req.usuario.nome, 'seu nome', { min: 2, max: 120 });
  const telefone = req.body?.telefone ? validarTelefone(req.body.telefone) : null;
  const atualizado = await pool.query(
    `UPDATE usuarios SET nome = $1, telefone = $2 WHERE id = $3 RETURNING *`,
    [nome, telefone, req.usuario.id],
  );
  return res.json({ usuario: usuarioPublico(atualizado.rows[0]), mensagem: 'Dados atualizados.' });
});

export const alterarSenha = asyncHandler(async (req, res) => {
  const senhaAtual = String(req.body?.senhaAtual ?? '');
  const novaSenha = validarSenha(req.body?.novaSenha);
  if (req.usuario.senha_hash) {
    const ok = await conferirSenha(senhaAtual, req.usuario.senha_hash);
    if (!ok) throw invalido('Senha atual incorreta.', { campo: 'senhaAtual' });
  } else if (!req.usuario.google_id) {
    throw conflito('Defina uma senha usando o código por e-mail.', 'sem_senha');
  }
  const hash = await gerarHashSenha(novaSenha);
  await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [hash, req.usuario.id]);
  await pool.query('DELETE FROM sessoes WHERE usuario_id = $1 AND id <> $2', [req.usuario.id, req.sessao.id]);
  return res.json({ mensagem: 'Senha definida com sucesso.' });
});

export const excluirConta = asyncHandler(async (req, res) => {
  const senha = String(req.body?.senha ?? '');
  if (!req.usuario.senha_hash || !(await conferirSenha(senha, req.usuario.senha_hash))) {
    throw invalido('Confirme sua senha para excluir a conta.', { campo: 'senha' });
  }
  await pool.query(
    `UPDATE usuarios
     SET ativo = FALSE, nome = 'Conta removida', email = NULL, telefone = NULL,
         senha_hash = NULL, google_id = NULL
     WHERE id = $1`,
    [req.usuario.id],
  );
  await pool.query('DELETE FROM sessoes WHERE usuario_id = $1', [req.usuario.id]);
  await encerrarSessao(req, res);
  return res.json({ mensagem: 'Conta removida. Seus agendamentos foram mantidos apenas para fins de histórico da barbearia.' });
});
