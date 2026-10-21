import { comTransacao, um, varios } from '../config/db.js';
import { codigoPublico } from '../utils/codigos.js';
import { conflito, invalido, naoEncontrado, proibido } from '../utils/http.js';
import { calcularTroco } from '../utils/dinheiro.js';
import { criarCobrancaPix } from './pix.service.js';

const SELECT_BASE = `
  SELECT a.*,
         s.nome AS servico_nome,
         s.slug AS servico_slug,
         s.icone AS servico_icone,
         p.id AS pagamento_id,
         p.metodo AS pagamento_metodo,
         p.status AS pagamento_status,
         p.valor AS pagamento_valor,
         COALESCE(
           (SELECT json_agg(json_build_object('id', i.servico_id, 'nome', i.nome_snapshot, 'preco', i.preco))
            FROM agendamento_itens i WHERE i.agendamento_id = a.id),
           '[]'::json
         ) AS adicionais
  FROM agendamentos a
  JOIN servicos s ON s.id = a.servico_id
  LEFT JOIN LATERAL (
    SELECT id, metodo, status, valor
    FROM pagamentos WHERE agendamento_id = a.id
    ORDER BY criado_em DESC LIMIT 1
  ) p ON TRUE
`;

export async function buscarPorId(id, cliente = null) {
  if (cliente) {
    const resultado = await cliente.query(`${SELECT_BASE} WHERE a.id = $1`, [id]);
    return resultado.rows[0] ?? null;
  }
  return um(`${SELECT_BASE} WHERE a.id = $1`, [id]);
}

export async function buscarPorCodigo(codigo) {
  return um(`${SELECT_BASE} WHERE lower(a.codigo_publico) = lower($1)`, [String(codigo).trim()]);
}

export async function listarDoUsuario(usuarioId, { limite = 50 } = {}) {
  return varios(
    `${SELECT_BASE} WHERE a.usuario_id = $1 ORDER BY a.data_hora_inicio DESC LIMIT $2`,
    [usuarioId, limite],
  );
}

export async function listarPorEmail(email) {
  return varios(
    `${SELECT_BASE} WHERE lower(a.email_cliente) = lower($1) ORDER BY a.data_hora_inicio DESC LIMIT 50`,
    [email],
  );
}

export async function vincularAgendamentos(usuarioId, email) {
  if (!email) return 0;
  const resultado = await varios(
    `UPDATE agendamentos SET usuario_id = $1
     WHERE usuario_id IS NULL AND lower(email_cliente) = lower($2)
     RETURNING id`,
    [usuarioId, email],
  );
  return resultado.length;
}


function dadosPagamento({ metodo, notaDinheiro, trocoPix, pagarAgora, valor }) {
  const status = metodo === 'pix' && pagarAgora ? 'pendente' : 'na_hora';
  const nota = metodo === 'dinheiro' && notaDinheiro ? Number(notaDinheiro) : null;
  return {
    metodo,
    status,
    valor,
    notaDinheiro: nota,
    trocoPix: metodo === 'dinheiro' ? Boolean(trocoPix) : false,
    trocoValor: metodo === 'dinheiro' && nota ? calcularTroco(nota, valor) : null,
    pagarAgora: metodo === 'pix' ? Boolean(pagarAgora) : false,
  };
}

export async function criarAgendamento({
  servicos,
  inicio,
  fim,
  nomeCliente,
  emailCliente = null,
  telefoneCliente,
  observacao = null,
  usuarioId = null,
  formaPagamento,
  origem = 'site',
  status = 'confirmado',
}) {
  if (!servicos?.principal) throw invalido('Serviço inválido.');
  if (!(inicio instanceof Date) || !(fim instanceof Date) || fim <= inicio) {
    throw invalido('Data/hora do agendamento inválida.');
  }
  const pagamentoDados = dadosPagamento({ ...formaPagamento, valor: servicos.valorTotal });
  const codigo = codigoPublico();

  const criado = await comTransacao(async (cliente) => {
    await cliente.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`agenda:${inicio.toISOString()}`]);

    const ocupado = await cliente.query(
      `SELECT 1 FROM agendamentos
       WHERE status = ANY($3::text[]) AND data_hora_inicio < $2 AND data_hora_fim > $1
       LIMIT 1`,
      [inicio, fim, ['pendente', 'confirmado']],
    );
    if (ocupado.rowCount > 0) {
      throw conflito('Esse horário acabou de ser reservado. Escolha outro.', 'horario_indisponivel');
    }

    const bloqueado = await cliente.query(
      'SELECT 1 FROM bloqueios WHERE inicio < $2 AND fim > $1 LIMIT 1',
      [inicio, fim],
    );
    if (bloqueado.rowCount > 0) {
      throw conflito('Esse horário está bloqueado na agenda.', 'horario_indisponivel');
    }

    const agendamento = await cliente.query(
      `INSERT INTO agendamentos
         (codigo_publico, usuario_id, servico_id, nome_cliente, email_cliente, telefone_cliente,
          data_hora_inicio, data_hora_fim, duracao_min, valor_original, valor_pago, valor_desconto,
          promocao_rotulo, promocao_detalhes, avatar, status, observacao, origem)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, $11, $12, $13::jsonb, $14::jsonb, $15, $16, $17)
       RETURNING *`,
      [
        codigo,
        usuarioId,
        servicos.principal.id,
        nomeCliente,
        emailCliente,
        telefoneCliente,
        inicio,
        fim,
        servicos.duracaoTotal,
        servicos.valorOriginal ?? servicos.valorTotal,
        servicos.valorDesconto ?? 0,
        servicos.promocaoRotulo ?? null,
        servicos.promocaoDetalhes ? JSON.stringify(servicos.promocaoDetalhes) : null,
        JSON.stringify(servicos.avatar || null),
        status,
        observacao,
        origem,
      ],
    );

    for (const adicional of servicos.adicionais) {
      await cliente.query(
        `INSERT INTO agendamento_itens (agendamento_id, servico_id, nome_snapshot, preco, duracao_min)
         VALUES ($1, $2, $3, $4, $5)`,
        [agendamento.rows[0].id, adicional.id, adicional.nome, adicional.preco, adicional.duracao_min],
      );
    }

    const pagamento = await cliente.query(
      `INSERT INTO pagamentos
         (agendamento_id, metodo, status, valor, nota_dinheiro, troco_pix, troco_valor, pagar_agora)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        agendamento.rows[0].id,
        pagamentoDados.metodo,
        pagamentoDados.status,
        pagamentoDados.valor,
        pagamentoDados.notaDinheiro,
        pagamentoDados.trocoPix,
        pagamentoDados.trocoValor,
        pagamentoDados.pagarAgora,
      ],
    );

    return { agendamento: agendamento.rows[0], pagamento: pagamento.rows[0] };
  });

  let pix = null;
  let pixErro = null;
  if (pagamentoDados.metodo === 'pix' && pagamentoDados.pagarAgora) {
    try {
      pix = await criarCobrancaPix({
        pagamentoId: criado.pagamento.id,
        valor: servicos.valorTotal,
        descricao: `Barbe City Jaraguá — ${servicos.servicos.map((item) => item.nome).join(' + ')}`,
        emailPagador: emailCliente,
        nomePagador: nomeCliente,
      });
      await comTransacao(async (cliente) => {
        await cliente.query(
          `UPDATE pagamentos
           SET pix_codigo = $1, pix_qr_base64 = $2, pix_transacao_id = $3, pix_expiracao = $4,
               status = $5, gateway_payload = $6::jsonb
           WHERE id = $7`,
          [
            pix.codigo,
            pix.qrBase64,
            pix.transacaoId || null,
            pix.expiracao ? new Date(pix.expiracao) : null,
            pix.status === 'approved' ? 'pago' : 'pendente',
            JSON.stringify(pix.payload ?? null),
            criado.pagamento.id,
          ],
        );
        if (pix.status === 'approved') {
          await cliente.query('UPDATE agendamentos SET valor_pago = $1 WHERE id = $2', [
            servicos.valorTotal,
            criado.agendamento.id,
          ]);
        }
      });
    } catch (erro) {
      pixErro = erro.message;
      console.error('[agendamento] falha ao criar cobrança Pix:', erro.message);
    }
  }

  const completo = await buscarPorId(criado.agendamento.id);
  return {
    agendamento: completo,
    servicos,
    pagamento: completo,
    pix: pix
      ? {
          codigo: pix.codigo,
          qrBase64: pix.qrBase64,
          ticketUrl: pix.ticketUrl,
          expiracao: pix.expiracao,
          transacaoId: pix.transacaoId,
        }
      : null,
    pixErro,
  };
}

export async function cancelarAgendamento({ agendamento, usuario = null, motivo = null, permitirConvidado = false }) {
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');
  if (['cancelado', 'concluido', 'ausente'].includes(agendamento.status)) {
    throw conflito('Este agendamento não pode mais ser cancelado.', 'status_invalido');
  }
  if (usuario) {
    if (usuario.role !== 'admin' && String(agendamento.usuario_id) !== String(usuario.id)) {
      throw proibido('Você não pode cancelar este agendamento.');
    }
  } else if (!permitirConvidado) {
    throw proibido('Você não pode cancelar este agendamento.');
  }

  return comTransacao(async (cliente) => {
    const atualizado = await cliente.query(
      `UPDATE agendamentos
       SET status = 'cancelado',
           observacao = CASE WHEN $2::text IS NULL THEN observacao ELSE CONCAT_WS(' | ', observacao, $2) END
       WHERE id = $1 RETURNING *`,
      [agendamento.id, motivo ? `Cancelado: ${motivo}` : null],
    );
    await cliente.query(
      `UPDATE pagamentos SET status = 'falhou'
       WHERE agendamento_id = $1 AND status = 'pendente'`,
      [agendamento.id],
    );
    return atualizado.rows[0];
  });
}

export async function atualizarStatus({ agendamento, status, usuarioId = null }) {
  const permitidos = ['pendente', 'confirmado', 'concluido', 'cancelado', 'ausente'];
  if (!permitidos.includes(status)) throw invalido('Status inválido.', { campo: 'status' });
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');

  return comTransacao(async (cliente) => {
    await cliente.query('UPDATE agendamentos SET status = $1 WHERE id = $2', [status, agendamento.id]);
    if (status === 'cancelado') {
      await cliente.query(`UPDATE pagamentos SET status = 'falhou' WHERE agendamento_id = $1 AND status = 'pendente'`, [
        agendamento.id,
      ]);
    }
    if (status === 'concluido') {
      await cliente.query(
        `UPDATE agendamentos SET valor_pago = (
           SELECT COALESCE(sum(valor), 0) FROM pagamentos WHERE agendamento_id = $1 AND status = 'pago'
         ) WHERE id = $1`,
        [agendamento.id],
      );
    }
    await cliente.query(
      `INSERT INTO logs_admin (admin_id, acao, entidade, entidade_id, detalhes)
       VALUES ($1, 'alterar_status_agendamento', 'agendamento', $2, $3::jsonb)`,
      [usuarioId, agendamento.id, JSON.stringify({ de: agendamento.status, para: status })],
    );
    const resultado = await buscarPorId(agendamento.id, cliente);
    return resultado;
  });
}

export async function reagendarAgendamento({ agendamento, inicio, fim, duracaoMin = null, atualizadoPor = null }) {
  if (!agendamento) throw naoEncontrado('Agendamento não encontrado.');
  if (!['pendente', 'confirmado'].includes(agendamento.status)) {
    throw conflito('Só é possível reagendar horários pendentes ou confirmados.', 'status_invalido');
  }
  return comTransacao(async (cliente) => {
    await cliente.query(
      `UPDATE agendamentos
       SET data_hora_inicio = $1, data_hora_fim = $2, duracao_min = COALESCE($3, duracao_min)
       WHERE id = $4`,
      [inicio, fim, duracaoMin, agendamento.id],
    );
    await cliente.query(
      `INSERT INTO logs_admin (admin_id, acao, entidade, entidade_id, detalhes)
       VALUES ($1, 'reagendar', 'agendamento', $2, $3::jsonb)`,
      [
        atualizadoPor,
        agendamento.id,
        JSON.stringify({
          de: agendamento.data_hora_inicio,
          para: inicio,
          fimAnterior: agendamento.data_hora_fim,
          fimNovo: fim,
        }),
      ],
    );
    return buscarPorId(agendamento.id, cliente);
  });
}

export async function listarAdmin({ status, de, ate, busca, pagina = 1, limite = 20, apenasAtivos = false }) {
  const condicoes = [];
  const parametros = [];
  const adicionar = (sql, valor) => {
    parametros.push(valor);
    condicoes.push(sql.replace('?', `$${parametros.length}`));
  };

  if (status) adicionar('a.status = ?', status);
  if (apenasAtivos) condicoes.push(`a.status IN ('pendente', 'confirmado')`);
  if (de) adicionar('a.data_hora_inicio >= ?', de);
  if (ate) adicionar('a.data_hora_inicio < ?', ate);
  if (busca) {
    parametros.push(`%${String(busca).trim()}%`);
    const indice = `$${parametros.length}`;
    condicoes.push(
      `(a.nome_cliente ILIKE ${indice} OR a.telefone_cliente ILIKE ${indice} OR a.email_cliente ILIKE ${indice} OR a.codigo_publico ILIKE ${indice})`,
    );
  }

  const onde = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';
  const limiteSeguro = Math.min(Math.max(Number(limite) || 20, 1), 100);
  const paginaSegura = Math.max(Number(pagina) || 1, 1);
  const offset = (paginaSegura - 1) * limiteSeguro;

  const totalResultado = await varios(
    `SELECT count(*)::int AS total FROM agendamentos a ${onde}`,
    parametros,
  );
  const linhas = await varios(
    `${SELECT_BASE} ${onde} ORDER BY a.data_hora_inicio DESC LIMIT ${limiteSeguro} OFFSET ${offset}`,
    parametros,
  );

  return {
    itens: linhas,
    total: totalResultado[0]?.total || 0,
    pagina: paginaSegura,
    limite: limiteSeguro,
    paginas: Math.max(1, Math.ceil((totalResultado[0]?.total || 0) / limiteSeguro)),
  };
}
