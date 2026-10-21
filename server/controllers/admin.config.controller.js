import { comTransacao, um, varios } from '../config/db.js';
import { asyncHandler, conflito, invalido, naoEncontrado } from '../utils/http.js';
import { combinarDataHora } from '../utils/datas.js';
import { registrarLog } from '../utils/serializadores.js';
import {
  textoOpcional,
  validarBooleano,
  validarDataISO,
  validarHora,
  validarInteiro,
  validarUUID,
} from '../utils/validacao.js';

const CHAVES_PERMITIDAS = new Set([
  'nome_barbearia',
  'slogan',
  'subtitulo',
  'sobre',
  'endereco',
  'telefone',
  'whatsapp',
  'email_contato',
  'horario_texto',
  'mapa_url',
  'versiculo',
  'versiculo_ref',
  'versiculo_texto',
  'instagram',
  'aviso_agendamento',
  'anos_experiencia',
  'pix_chave',
]);

export const obterConfiguracoes = asyncHandler(async (req, res) => {
  const linhas = await varios('SELECT chave, valor, atualizado_em FROM configuracoes ORDER BY chave');
  res.json({ configuracoes: linhas });
});

export const salvarConfiguracoes = asyncHandler(async (req, res) => {
  const entrada = req.body?.configuracoes;
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    throw invalido('Envie um objeto "configuracoes".', { campo: 'configuracoes' });
  }
  const entradas = Object.entries(entrada).filter(([chave]) => CHAVES_PERMITIDAS.has(chave));
  if (entradas.length === 0) throw invalido('Nenhuma configuração válida enviada.');

  for (const [chave, valor] of entradas) {
    const texto = String(valor ?? '');
    const limite = chave === 'sobre' ? 2000 : chave === 'mapa_url' ? 800 : 500;
    if (texto.length > limite) throw invalido(`O campo ${chave} deve ter até ${limite} caracteres.`, { campo: chave });
  }

  await comTransacao(async (cliente) => {
    for (const [chave, valor] of entradas) {
      await cliente.query(
        `INSERT INTO configuracoes (chave, valor) VALUES ($1, $2)
         ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
        [chave, String(valor ?? '')],
      );
    }
  });

  await registrarLog({
    adminId: req.usuario.id,
    acao: 'salvar_configuracoes',
    entidade: 'configuracao',
    detalhes: Object.fromEntries(entradas),
    ip: req.ip,
  });

  res.json({ mensagem: 'Configurações salvas.' });
});

export const obterHorarios = asyncHandler(async (req, res) => {
  const linhas = await varios(
    `SELECT dia_semana, abertura, fechamento, intervalo_min, ativo
     FROM horarios_funcionamento ORDER BY dia_semana`,
  );
  res.json({
    horarios: linhas.map((linha) => ({
      diaSemana: Number(linha.dia_semana),
      abertura: String(linha.abertura).slice(0, 5),
      fechamento: String(linha.fechamento).slice(0, 5),
      intervaloMin: linha.intervalo_min,
      ativo: Boolean(linha.ativo),
    })),
  });
});

export const salvarHorarios = asyncHandler(async (req, res) => {
  const horarios = req.body?.horarios;
  if (!Array.isArray(horarios) || horarios.length === 0) {
    throw invalido('Envie a lista de horários.', { campo: 'horarios' });
  }

  const normalizados = horarios.map((horario) => {
    const diaSemana = validarInteiro(horario.diaSemana, 'diaSemana', { min: 0, max: 6 });
    const ativo = validarBooleano(horario.ativo, 'ativo');
    const abertura = validarHora(horario.abertura ?? '00:00', 'abertura');
    const fechamento = validarHora(horario.fechamento ?? '00:00', 'fechamento');
    const intervaloMin = validarInteiro(horario.intervaloMin ?? 15, 'intervaloMin', { min: 5, max: 120 });
    if (ativo && fechamento <= abertura) {
      throw invalido(`No dia ${diaSemana}, o fechamento deve ser depois da abertura.`, { campo: 'horarios' });
    }
    return { diaSemana, abertura, fechamento, intervaloMin, ativo };
  });

  const dias = new Set(normalizados.map((item) => item.diaSemana));
  if (dias.size !== normalizados.length) throw invalido('Há dias duplicados na lista.', { campo: 'horarios' });

  await comTransacao(async (cliente) => {
    for (const horario of normalizados) {
      await cliente.query(
        `INSERT INTO horarios_funcionamento (dia_semana, abertura, fechamento, intervalo_min, ativo)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (dia_semana) DO UPDATE
         SET abertura = EXCLUDED.abertura, fechamento = EXCLUDED.fechamento,
             intervalo_min = EXCLUDED.intervalo_min, ativo = EXCLUDED.ativo`,
        [horario.diaSemana, horario.abertura, horario.fechamento, horario.intervaloMin, horario.ativo],
      );
    }
  });

  await registrarLog({
    adminId: req.usuario.id,
    acao: 'salvar_horarios',
    entidade: 'horario',
    detalhes: { horarios: normalizados },
    ip: req.ip,
  });

  res.json({ mensagem: 'Horários atualizados.' });
});


export const listarBloqueios = asyncHandler(async (req, res) => {
  const linhas = await varios(
    `SELECT b.id, b.inicio, b.fim, b.motivo, b.criado_em, u.nome AS criado_por
     FROM bloqueios b LEFT JOIN usuarios u ON u.id = b.criado_por
     WHERE b.fim >= now() - interval '30 days'
     ORDER BY b.inicio ASC`,
  );
  res.json({ bloqueios: linhas });
});

export const criarBloqueio = asyncHandler(async (req, res) => {
  let inicio;
  let fim;
  if (req.body?.inicio && req.body?.fim) {
    inicio = new Date(req.body.inicio);
    fim = new Date(req.body.fim);
  } else {
    const data = validarDataISO(req.body?.data, 'data');
    const horaInicio = validarHora(req.body?.horaInicio ?? '00:00', 'horaInicio');
    const horaFim = validarHora(req.body?.horaFim ?? '23:59', 'horaFim');
    inicio = combinarDataHora(data, horaInicio);
    fim = combinarDataHora(data, horaFim);
  }
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim <= inicio) {
    throw invalido('O fim do bloqueio precisa ser depois do início.', { campo: 'fim' });
  }
  const motivo = textoOpcional(req.body?.motivo, 'motivo', { max: 300 });

  const conflitantes = await um(
    `SELECT count(*)::int AS total FROM agendamentos
     WHERE status IN ('pendente', 'confirmado')
       AND data_hora_inicio < $2 AND data_hora_fim > $1`,
    [inicio, fim],
  );
  if (conflitantes.total > 0 && req.body?.forcar !== true) {
    throw conflito(
      `Existem ${conflitantes.total} agendamento(s) nesse período. Cancele-os ou envie "forcar": true.`,
      'bloqueio_com_agendamentos',
      { agendamentos: conflitantes.total },
    );
  }

  const criado = await um(
    `INSERT INTO bloqueios (inicio, fim, motivo, criado_por)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [inicio, fim, motivo, req.usuario.id],
  );
  await registrarLog({
    adminId: req.usuario.id,
    acao: 'criar_bloqueio',
    entidade: 'bloqueio',
    entidadeId: criado.id,
    detalhes: { inicio, fim, motivo },
    ip: req.ip,
  });
  res.status(201).json({ bloqueio: criado, mensagem: 'Período bloqueado.' });
});

export const excluirBloqueio = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const existente = await um('SELECT * FROM bloqueios WHERE id = $1', [id]);
  if (!existente) throw naoEncontrado('Bloqueio não encontrado.');
  await um('DELETE FROM bloqueios WHERE id = $1 RETURNING id', [id]);
  await registrarLog({
    adminId: req.usuario.id,
    acao: 'excluir_bloqueio',
    entidade: 'bloqueio',
    entidadeId: id,
    detalhes: { inicio: existente.inicio, fim: existente.fim },
    ip: req.ip,
  });
  res.json({ mensagem: 'Bloqueio removido.' });
});

export const listarLogs = asyncHandler(async (req, res) => {
  const pagina = Math.max(Number(req.query.pagina) || 1, 1);
  const limite = Math.min(Math.max(Number(req.query.limite) || 30, 1), 100);
  const offset = (pagina - 1) * limite;
  const total = await um('SELECT count(*)::int AS total FROM logs_admin');
  const linhas = await varios(
    `SELECT l.id, l.acao, l.entidade, l.entidade_id, l.detalhes, l.ip, l.criado_em, u.nome AS admin
     FROM logs_admin l LEFT JOIN usuarios u ON u.id = l.admin_id
     ORDER BY l.criado_em DESC LIMIT ${limite} OFFSET ${offset}`,
  );
  res.json({
    logs: linhas,
    total: total.total,
    pagina,
    limite,
    paginas: Math.max(1, Math.ceil(total.total / limite)),
  });
});

export const listarNotificacoes = asyncHandler(async (req, res) => {
  const limite = Math.min(Math.max(Number(req.query.limite) || 50, 1), 200);
  const linhas = await varios(
    `SELECT n.*, a.codigo_publico, a.nome_cliente, a.data_hora_inicio
     FROM notificacoes n
     LEFT JOIN agendamentos a ON a.id = n.agendamento_id
     ORDER BY n.criado_em DESC LIMIT ${limite}`,
  );
  res.json({ notificacoes: linhas });
});

export const reenviarNotificacao = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const notificacao = await um('SELECT * FROM notificacoes WHERE id = $1', [id]);
  if (!notificacao) throw naoEncontrado('Notificação não encontrada.');
  if (notificacao.canal !== 'whatsapp') {
    throw invalido('O reenvio automático está disponível apenas para WhatsApp.', { campo: 'canal' });
  }
  const link = notificacao.link_wa || null;
  await um(`UPDATE notificacoes SET status = 'link_gerado', enviado_em = NULL WHERE id = $1 RETURNING id`, [id]);
  res.json({ link, mensagem: 'Link de WhatsApp pronto para envio manual.' });
});
