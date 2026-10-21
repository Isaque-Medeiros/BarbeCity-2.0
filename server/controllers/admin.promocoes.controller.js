import { um, varios } from '../config/db.js';
import { asyncHandler, invalido, naoEncontrado } from '../utils/http.js';
import { promocaoPublica, registrarLog } from '../utils/serializadores.js';
import {
  textoObrigatorio,
  validarBooleano,
  validarNumero,
  validarUUID,
} from '../utils/validacao.js';

function dataOpcional(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) throw invalido(`Data inválida (${campo}).`, { campo });
  return data;
}

async function payloadPromocao(body, existente = null) {
  const rotulo = textoObrigatorio(body?.rotulo ?? existente?.rotulo, 'nome da promoção', {
    min: 2,
    max: 60,
  });
  const percentual = validarNumero(body?.percentual ?? existente?.percentual, 'percentual', {
    min: 1,
    max: 90,
  });

  let servicoId = existente?.servico_id ?? null;
  if (body?.servicoId !== undefined || body?.servico_id !== undefined) {
    const bruto = body?.servicoId ?? body?.servico_id;
    servicoId = bruto ? validarUUID(bruto, 'servicoId') : null;
  }
  if (servicoId) {
    const servico = await um('SELECT id FROM servicos WHERE id = $1', [servicoId]);
    if (!servico) throw invalido('Serviço não encontrado para aplicar a promoção.', { campo: 'servicoId' });
  }

  const inicio =
    body?.inicio === undefined
      ? existente?.inicio
        ? new Date(existente.inicio)
        : new Date()
      : dataOpcional(body.inicio, 'inicio');
  if (!inicio) throw invalido('Informe o início da promoção.', { campo: 'inicio' });

  const fim =
    body?.fim === undefined
      ? existente?.fim
        ? new Date(existente.fim)
        : null
      : dataOpcional(body.fim, 'fim');
  if (fim && fim <= inicio) {
    throw invalido('O fim da promoção precisa ser depois do início.', { campo: 'fim' });
  }

  const ativo =
    body?.ativo === undefined
      ? existente
        ? Boolean(existente.ativo)
        : true
      : validarBooleano(body.ativo, 'ativo');

  return { rotulo, percentual, servicoId, inicio, fim, ativo };
}

async function buscarComServico(id) {
  return um(
    `SELECT p.*, s.nome AS servico_nome
     FROM promocoes p
     LEFT JOIN servicos s ON s.id = p.servico_id
     WHERE p.id = $1`,
    [id],
  );
}

export const listar = asyncHandler(async (req, res) => {
  const linhas = await varios(
    `SELECT p.*, s.nome AS servico_nome
     FROM promocoes p
     LEFT JOIN servicos s ON s.id = p.servico_id
     ORDER BY p.ativo DESC, p.criado_em DESC`,
  );
  res.json({ promocoes: linhas.map((linha) => promocaoPublica(linha)) });
});

export const criar = asyncHandler(async (req, res) => {
  const dados = await payloadPromocao(req.body);
  const criado = await um(
    `INSERT INTO promocoes (rotulo, percentual, servico_id, inicio, fim, ativo, criado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      dados.rotulo,
      dados.percentual,
      dados.servicoId,
      dados.inicio,
      dados.fim,
      dados.ativo,
      req.usuario.id,
    ],
  );

  await registrarLog({
    adminId: req.usuario.id,
    acao: 'criar_promocao',
    entidade: 'promocao',
    entidadeId: criado.id,
    detalhes: {
      rotulo: dados.rotulo,
      percentual: dados.percentual,
      servicoId: dados.servicoId,
      inicio: dados.inicio,
      fim: dados.fim,
    },
    ip: req.ip,
  });

  res.status(201).json({
    promocao: promocaoPublica(await buscarComServico(criado.id)),
    mensagem: 'Promoção aplicada.',
  });
});

export const editar = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const existente = await um('SELECT * FROM promocoes WHERE id = $1', [id]);
  if (!existente) throw naoEncontrado('Promoção não encontrada.');

  const dados = await payloadPromocao(req.body, existente);
  await um(
    `UPDATE promocoes
     SET rotulo = $1, percentual = $2, servico_id = $3, inicio = $4, fim = $5, ativo = $6
     WHERE id = $7
     RETURNING id`,
    [
      dados.rotulo,
      dados.percentual,
      dados.servicoId,
      dados.inicio,
      dados.fim,
      dados.ativo,
      id,
    ],
  );

  await registrarLog({
    adminId: req.usuario.id,
    acao: 'editar_promocao',
    entidade: 'promocao',
    entidadeId: id,
    detalhes: {
      rotulo: dados.rotulo,
      percentual: dados.percentual,
      servicoId: dados.servicoId,
      ativo: dados.ativo,
    },
    ip: req.ip,
  });

  res.json({
    promocao: promocaoPublica(await buscarComServico(id)),
    mensagem: 'Promoção atualizada.',
  });
});

export const excluir = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const existente = await um('SELECT * FROM promocoes WHERE id = $1', [id]);
  if (!existente) throw naoEncontrado('Promoção não encontrada.');

  await um('DELETE FROM promocoes WHERE id = $1 RETURNING id', [id]);
  await registrarLog({
    adminId: req.usuario.id,
    acao: 'excluir_promocao',
    entidade: 'promocao',
    entidadeId: id,
    detalhes: { rotulo: existente.rotulo, percentual: existente.percentual },
    ip: req.ip,
  });

  res.json({ mensagem: 'Promoção removida.' });
});
