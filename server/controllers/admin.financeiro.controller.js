import { varios } from '../config/db.js';
import { config } from '../config/env.js';
import { asyncHandler } from '../utils/http.js';
import { validarDataISO } from '../utils/validacao.js';

function inicioDoDia(data) {
  return new Date(`${validarDataISO(data, 'de')}T00:00:00-03:00`);
}

function fimDoDia(data) {
  return new Date(`${validarDataISO(data, 'ate')}T23:59:59.999-03:00`);
}

export const financeiro = asyncHandler(async (req, res) => {
  const hoje = new Date();
  const de = req.query.de ? inicioDoDia(req.query.de) : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ate = req.query.ate ? fimDoDia(req.query.ate) : hoje;

  const totais = await varios(
    `SELECT
       COALESCE(sum(p.valor) FILTER (WHERE p.status = 'pago' AND p.pago_em >= $1 AND p.pago_em <= $2), 0)::numeric(10,2) AS receita_conciliada,
       COALESCE(sum(p.valor) FILTER (WHERE p.status IN ('pendente', 'na_hora')), 0)::numeric(10,2) AS a_receber,
       COALESCE(sum(GREATEST(a.valor_original - a.valor_desconto, 0)) FILTER (
         WHERE a.status = 'concluido'
           AND NOT EXISTS (SELECT 1 FROM pagamentos pp WHERE pp.agendamento_id = a.id AND pp.status = 'pago')
       ), 0)::numeric(10,2) AS historico_estimado,
       COALESCE(sum(a.valor_desconto) FILTER (WHERE a.status <> 'cancelado'), 0)::numeric(10,2) AS descontos_concedidos,
       count(DISTINCT a.id)::int AS agendamentos,
       count(DISTINCT a.id) FILTER (WHERE a.status = 'concluido')::int AS concluidos,
       count(DISTINCT a.id) FILTER (WHERE a.status IN ('pendente', 'confirmado'))::int AS ativos,
       COALESCE(avg(GREATEST(a.valor_original - a.valor_desconto, 0)) FILTER (WHERE a.status = 'concluido'), 0)::numeric(10,2) AS ticket_medio
     FROM agendamentos a
     LEFT JOIN pagamentos p ON p.agendamento_id = a.id
     WHERE a.data_hora_inicio >= $1 AND a.data_hora_inicio <= $2`,
    [de, ate],
  );

  const porMetodo = await varios(
    `SELECT p.metodo, COALESCE(sum(p.valor), 0)::numeric(10,2) AS valor, count(*)::int AS quantidade
     FROM pagamentos p
     WHERE p.status = 'pago' AND p.pago_em >= $1 AND p.pago_em <= $2
     GROUP BY p.metodo ORDER BY valor DESC`,
    [de, ate],
  );

  const porDia = await varios(
    `SELECT to_char((p.pago_em AT TIME ZONE $3)::date, 'YYYY-MM-DD') AS dia,
            COALESCE(sum(p.valor), 0)::numeric(10,2) AS valor,
            count(*)::int AS quantidade
     FROM pagamentos p
     WHERE p.status = 'pago' AND p.pago_em >= $1 AND p.pago_em <= $2
     GROUP BY 1 ORDER BY 1`,
    [de, ate, config.timezone],
  );

  const topServicos = await varios(
    `SELECT s.nome, count(a.id)::int AS quantidade,
            COALESCE(sum(GREATEST(a.valor_original - a.valor_desconto, 0)), 0)::numeric(10,2) AS valor
     FROM agendamentos a JOIN servicos s ON s.id = a.servico_id
     WHERE a.data_hora_inicio >= $1 AND a.data_hora_inicio <= $2 AND a.status <> 'cancelado'
     GROUP BY s.nome ORDER BY quantidade DESC LIMIT 6`,
    [de, ate],
  );

  res.json({
    periodo: { de: de.toISOString(), ate: ate.toISOString() },
    resumo: {
      receitaConciliada: Number(totais[0].receita_conciliada),
      aReceber: Number(totais[0].a_receber),
      historicoEstimado: Number(totais[0].historico_estimado),
      descontosConcedidos: Number(totais[0].descontos_concedidos),
      agendamentos: totais[0].agendamentos,
      concluidos: totais[0].concluidos,
      ativos: totais[0].ativos,
      ticketMedio: Number(totais[0].ticket_medio),
    },
    porMetodo: porMetodo.map((linha) => ({
      metodo: linha.metodo,
      valor: Number(linha.valor),
      quantidade: linha.quantidade,
    })),
    porDia: porDia.map((linha) => ({
      dia: linha.dia,
      valor: Number(linha.valor),
      quantidade: linha.quantidade,
    })),
    topServicos: topServicos.map((linha) => ({
      nome: linha.nome,
      quantidade: linha.quantidade,
      valor: Number(linha.valor),
    })),
  });
});

export const dashboard = asyncHandler(async (req, res) => {
  const contagens = await varios(
    `SELECT
       count(*) FILTER (WHERE status IN ('pendente', 'confirmado'))::int AS ativos,
       count(*) FILTER (WHERE status = 'concluido')::int AS concluidos,
       count(*) FILTER (WHERE status = 'cancelado')::int AS cancelados,
       count(*) FILTER (WHERE status = 'ausente')::int AS ausentes,
       count(*)::int AS total,
       count(*) FILTER (
         WHERE status IN ('pendente', 'confirmado')
           AND (data_hora_inicio AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date
       )::int AS hoje,
       count(*) FILTER (
         WHERE status IN ('pendente', 'confirmado')
           AND data_hora_inicio >= now() AND data_hora_inicio < now() + interval '7 days'
       )::int AS proximos_sete
     FROM agendamentos`,
    [config.timezone],
  );

  const hoje = await varios(
    `SELECT a.id, a.codigo_publico, a.nome_cliente, a.telefone_cliente, a.data_hora_inicio,
            a.status, a.valor_original, a.valor_desconto, a.valor_pago, s.nome AS servico,
            p.metodo AS pagamento_metodo, p.status AS pagamento_status
     FROM agendamentos a
     JOIN servicos s ON s.id = a.servico_id
     LEFT JOIN LATERAL (
       SELECT metodo, status FROM pagamentos WHERE agendamento_id = a.id ORDER BY criado_em DESC LIMIT 1
     ) p ON TRUE
     WHERE (a.data_hora_inicio AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date
     ORDER BY a.data_hora_inicio ASC`,
    [config.timezone],
  );

  const pendentes = await varios(
    `SELECT a.id, a.codigo_publico, a.nome_cliente, a.data_hora_inicio, a.status,
            a.valor_original, a.valor_desconto, s.nome AS servico, p.metodo, p.status AS pagamento_status
     FROM agendamentos a
     JOIN servicos s ON s.id = a.servico_id
     LEFT JOIN LATERAL (
       SELECT metodo, status FROM pagamentos WHERE agendamento_id = a.id ORDER BY criado_em DESC LIMIT 1
     ) p ON TRUE
     WHERE a.status IN ('pendente', 'confirmado') AND p.status IN ('pendente', 'na_hora')
     ORDER BY a.data_hora_inicio ASC LIMIT 10`,
  );

  const usuarios = await varios(`SELECT count(*)::int AS total, count(*) FILTER (WHERE role = 'admin')::int AS admins FROM usuarios`);

  res.json({
    contagens: contagens[0],
    hoje,
    pagamentosPendentes: pendentes,
    usuarios: usuarios[0],
  });
});
