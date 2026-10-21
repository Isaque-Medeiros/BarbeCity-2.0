import { pool, um, varios } from '../config/db.js';
import { asyncHandler, invalido, naoEncontrado } from '../utils/http.js';
import { registrarLog, servicoPublico } from '../utils/serializadores.js';
import { escolherPromocao } from '../utils/promocoes.js';
import { carregarPromocoesAtivas } from '../services/promocoes.service.js';
import {
  textoObrigatorio,
  textoOpcional,
  umDe,
  validarBooleano,
  validarInteiro,
  validarNumero,
  validarSlug,
  validarUUID,
} from '../utils/validacao.js';

const CATEGORIAS = ['individual', 'combo', 'outros'];
const ICONES = [
  'scissors',
  'razor',
  'eyebrow',
  'combo',
  'crown',
  'highlights',
  'droplet',
  'flask',
  'sparkles',
  'star',
];

const TRAITS_AVATAR = ['cabelo', 'barba', 'sobrancelha', 'luzes', 'tratamento'];

function traitsDoAvatar(valor) {
  if (valor === undefined) return undefined;
  if (valor === null || valor === '') return null;
  const lista = Array.isArray(valor) ? valor : String(valor).split(',');
  const normalizados = [...new Set(
    lista
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean),
  )];
  for (const item of normalizados) {
    if (!TRAITS_AVATAR.includes(item)) {
      throw invalido('Traço de avatar inválido.', { campo: 'avatarTraits' });
    }
  }
  return Object.fromEntries(TRAITS_AVATAR.map((traco) => [traco, normalizados.includes(traco)]));
}

function payloadServico(body, existente = null) {
  const nome = textoObrigatorio(body?.nome ?? existente?.nome, 'nome do serviço', { min: 2, max: 80 });
  const categoria = umDe(body?.categoria ?? existente?.categoria ?? 'individual', CATEGORIAS, 'categoria');
  const preco = validarNumero(body?.preco ?? existente?.preco, 'preço', { min: 0, max: 100000 });
  const duracaoMin = validarInteiro(body?.duracaoMin ?? body?.duracao_min ?? existente?.duracao_min, 'duração', {
    min: 5,
    max: 480,
  });
  const icone = String(body?.icone ?? existente?.icone ?? 'scissors');
  if (!ICONES.includes(icone)) throw invalido('Ícone inválido.', { campo: 'icone' });
  const slug = validarSlug(body?.slug ?? existente?.slug ?? nome, 'slug');
  return {
    nome,
    slug,
    descricao: textoOpcional(body?.descricao ?? existente?.descricao, 'descrição', { max: 600 }),
    preco,
    duracaoMin,
    categoria,
    icone,
    destaque: body?.destaque === undefined ? Boolean(existente?.destaque) : validarBooleano(body.destaque, 'destaque'),
    ativo: body?.ativo === undefined ? (existente ? Boolean(existente.ativo) : true) : validarBooleano(body.ativo, 'ativo'),
    ordem: validarInteiro(body?.ordem ?? existente?.ordem ?? 99, 'ordem', { min: 0, max: 999 }),
    avatarTraits:
      body?.avatarTraits === undefined && body?.avatar_traits === undefined
        ? existente?.avatar_traits ?? null
        : traitsDoAvatar(body?.avatarTraits ?? body?.avatar_traits),
  };
}

export const listar = asyncHandler(async (req, res) => {
  const [linhas, promocoes] = await Promise.all([
    varios(
      `SELECT s.*,
         (SELECT count(*)::int FROM agendamentos a WHERE a.servico_id = s.id) AS total_agendamentos
       FROM servicos s ORDER BY s.ordem, s.nome`,
    ),
    carregarPromocoesAtivas(),
  ]);
  res.json({
    servicos: linhas.map((linha) => ({
      ...servicoPublico(linha, { promocao: escolherPromocao(promocoes, linha.id) }),
      totalAgendamentos: linha.total_agendamentos,
    })),
  });
});

export const criar = asyncHandler(async (req, res) => {
  const dados = payloadServico(req.body);
  const criado = await um(
    `INSERT INTO servicos
       (slug, nome, descricao, preco, duracao_min, categoria, icone, destaque, ativo, ordem, avatar_traits)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
     RETURNING *`,
    [
      dados.slug,
      dados.nome,
      dados.descricao,
      dados.preco,
      dados.duracaoMin,
      dados.categoria,
      dados.icone,
      dados.destaque,
      dados.ativo,
      dados.ordem,
      dados.avatarTraits ? JSON.stringify(dados.avatarTraits) : null,
    ],
  );
  await registrarLog({
    adminId: req.usuario.id,
    acao: 'criar_servico',
    entidade: 'servico',
    entidadeId: criado.id,
    detalhes: dados,
    ip: req.ip,
  });
  res.status(201).json({ servico: servicoPublico(criado), mensagem: 'Serviço criado.' });
});

export const editar = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const existente = await um('SELECT * FROM servicos WHERE id = $1', [id]);
  if (!existente) throw naoEncontrado('Serviço não encontrado.');
  const dados = payloadServico(req.body, existente);
  const atualizado = await um(
    `UPDATE servicos
     SET slug = $1, nome = $2, descricao = $3, preco = $4, duracao_min = $5,
         categoria = $6, icone = $7, destaque = $8, ativo = $9, ordem = $10,
         avatar_traits = $11::jsonb
     WHERE id = $12 RETURNING *`,
    [
      dados.slug,
      dados.nome,
      dados.descricao,
      dados.preco,
      dados.duracaoMin,
      dados.categoria,
      dados.icone,
      dados.destaque,
      dados.ativo,
      dados.ordem,
      dados.avatarTraits ? JSON.stringify(dados.avatarTraits) : null,
      id,
    ],
  );
  await registrarLog({
    adminId: req.usuario.id,
    acao: 'editar_servico',
    entidade: 'servico',
    entidadeId: id,
    detalhes: dados,
    ip: req.ip,
  });
  res.json({ servico: servicoPublico(atualizado), mensagem: 'Serviço atualizado.' });
});

export const excluir = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const existente = await um('SELECT * FROM servicos WHERE id = $1', [id]);
  if (!existente) throw naoEncontrado('Serviço não encontrado.');

  try {
    await pool.query('DELETE FROM servicos WHERE id = $1', [id]);
    await registrarLog({
      adminId: req.usuario.id,
      acao: 'excluir_servico',
      entidade: 'servico',
      entidadeId: id,
      detalhes: { nome: existente.nome },
      ip: req.ip,
    });
    return res.json({ mensagem: 'Serviço excluído.', desativado: false });
  } catch (erro) {
    if (erro.code === '23503') {
      await pool.query('UPDATE servicos SET ativo = FALSE WHERE id = $1', [id]);
      await registrarLog({
        adminId: req.usuario.id,
        acao: 'desativar_servico',
        entidade: 'servico',
        entidadeId: id,
        detalhes: { motivo: 'possui agendamentos vinculados' },
        ip: req.ip,
      });
      return res.json({
        mensagem: 'O serviço possui agendamentos no histórico e foi desativado em vez de excluído.',
        desativado: true,
      });
    }
    throw erro;
  }
});
