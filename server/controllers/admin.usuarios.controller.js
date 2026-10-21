import { pool, um, varios } from '../config/db.js';
import { asyncHandler, conflito, invalido, naoEncontrado } from '../utils/http.js';
import { registrarLog, usuarioPublico } from '../utils/serializadores.js';
import { textoOpcional, umDe, validarBooleano, validarUUID } from '../utils/validacao.js';

async function contarAdmins() {
  const resultado = await um(`SELECT count(*)::int AS total FROM usuarios WHERE role = 'admin' AND ativo = TRUE`);
  return resultado.total;
}

export const listar = asyncHandler(async (req, res) => {
  const busca = textoOpcional(req.query.busca, 'busca', { max: 100 });
  const role = req.query.role ? umDe(req.query.role, ['cliente', 'admin'], 'role') : null;
  const pagina = Math.max(Number(req.query.pagina) || 1, 1);
  const limite = Math.min(Math.max(Number(req.query.limite) || 20, 1), 100);
  const offset = (pagina - 1) * limite;

  const condicoes = [];
  const parametros = [];
  if (busca) {
    parametros.push(`%${busca}%`);
    condicoes.push(
      `(u.nome ILIKE $${parametros.length} OR u.email ILIKE $${parametros.length} OR u.telefone ILIKE $${parametros.length})`,
    );
  }
  if (role) {
    parametros.push(role);
    condicoes.push(`u.role = $${parametros.length}`);
  }
  const onde = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  const total = await um(`SELECT count(*)::int AS total FROM usuarios u ${onde}`, parametros);
  const linhas = await varios(
    `SELECT u.*,
       count(a.id)::int AS total_agendamentos,
       COALESCE(sum(a.valor_pago), 0)::numeric(10,2) AS total_pago,
       max(a.data_hora_inicio) AS ultimo_agendamento
     FROM usuarios u
     LEFT JOIN agendamentos a ON a.usuario_id = u.id
     ${onde}
     GROUP BY u.id
     ORDER BY u.criado_em DESC
     LIMIT ${limite} OFFSET ${offset}`,
    parametros,
  );

  return res.json({
    usuarios: linhas.map((linha) => ({
      ...usuarioPublico(linha),
      totalAgendamentos: linha.total_agendamentos,
      totalPago: Number(linha.total_pago),
      ultimoAgendamento: linha.ultimo_agendamento,
    })),
    total: total.total,
    pagina,
    limite,
    paginas: Math.max(1, Math.ceil(total.total / limite)),
  });
});

export const detalhar = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const usuario = await um('SELECT * FROM usuarios WHERE id = $1', [id]);
  if (!usuario) throw naoEncontrado('Usuário não encontrado.');

  const agendamentos = await varios(
    `SELECT a.id, a.codigo_publico, a.data_hora_inicio, a.status, a.valor_original, a.valor_desconto, a.valor_pago,
            s.nome AS servico
     FROM agendamentos a JOIN servicos s ON s.id = a.servico_id
     WHERE a.usuario_id = $1 ORDER BY a.data_hora_inicio DESC LIMIT 30`,
    [id],
  );
  const totais = await um(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE status = 'concluido')::int AS concluidos,
            COALESCE(sum(valor_pago), 0)::numeric(10,2) AS total_pago
     FROM agendamentos WHERE usuario_id = $1`,
    [id],
  );
  return res.json({ usuario: usuarioPublico(usuario), agendamentos, resumo: totais });
});

export const alterarRole = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const role = umDe(req.body?.role, ['cliente', 'admin'], 'role');
  const usuario = await um('SELECT * FROM usuarios WHERE id = $1', [id]);
  if (!usuario) throw naoEncontrado('Usuário não encontrado.');
  if (String(req.usuario.id) === String(id) && role !== 'admin') {
    throw invalido('Você não pode remover seu próprio acesso de administrador.', { campo: 'role' });
  }
  if (usuario.role === 'admin' && role === 'cliente' && (await contarAdmins()) <= 1) {
    throw conflito('É necessário manter pelo menos um administrador ativo.', 'ultimo_admin');
  }
  const atualizado = await um(`UPDATE usuarios SET role = $1 WHERE id = $2 RETURNING *`, [role, id]);
  await registrarLog({
    adminId: req.usuario.id,
    acao: 'alterar_role',
    entidade: 'usuario',
    entidadeId: id,
    detalhes: { de: usuario.role, para: role },
    ip: req.ip,
  });
  return res.json({ usuario: usuarioPublico(atualizado), mensagem: 'Permissão atualizada.' });
});

export const alterarAtivo = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const ativo = validarBooleano(req.body?.ativo, 'ativo');
  const usuario = await um('SELECT * FROM usuarios WHERE id = $1', [id]);
  if (!usuario) throw naoEncontrado('Usuário não encontrado.');
  if (String(req.usuario.id) === String(id) && !ativo) {
    throw invalido('Você não pode desativar sua própria conta.', { campo: 'ativo' });
  }
  if (usuario.role === 'admin' && !ativo && (await contarAdmins()) <= 1) {
    throw conflito('É necessário manter pelo menos um administrador ativo.', 'ultimo_admin');
  }
  const atualizado = await um(`UPDATE usuarios SET ativo = $1 WHERE id = $2 RETURNING *`, [ativo, id]);
  if (!ativo) await pool.query('DELETE FROM sessoes WHERE usuario_id = $1', [id]);
  await registrarLog({
    adminId: req.usuario.id,
    acao: ativo ? 'ativar_usuario' : 'desativar_usuario',
    entidade: 'usuario',
    entidadeId: id,
    ip: req.ip,
  });
  return res.json({
    usuario: usuarioPublico(atualizado),
    mensagem: ativo ? 'Usuário ativado.' : 'Usuário desativado.',
  });
});

export const excluir = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const usuario = await um('SELECT * FROM usuarios WHERE id = $1', [id]);
  if (!usuario) throw naoEncontrado('Usuário não encontrado.');
  if (String(req.usuario.id) === String(id)) {
    throw invalido('Você não pode excluir sua própria conta por aqui.');
  }
  if (usuario.role === 'admin' && (await contarAdmins()) <= 1) {
    throw conflito('É necessário manter pelo menos um administrador ativo.', 'ultimo_admin');
  }
  await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
  await registrarLog({
    adminId: req.usuario.id,
    acao: 'excluir_usuario',
    entidade: 'usuario',
    entidadeId: id,
    detalhes: { nome: usuario.nome, email: usuario.email },
    ip: req.ip,
  });
  return res.json({ mensagem: 'Usuário excluído. Os agendamentos dele permanecem no histórico.' });
});

