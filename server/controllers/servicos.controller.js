import { varios, um } from '../config/db.js';
import { asyncHandler, naoEncontrado } from '../utils/http.js';
import { servicoPublico } from '../utils/serializadores.js';
import { escolherPromocao } from '../utils/promocoes.js';
import { validarUUID } from '../utils/validacao.js';
import { carregarPromocoesAtivas } from '../services/promocoes.service.js';

export const listar = asyncHandler(async (req, res) => {
  const { categoria } = req.query;
  const parametros = [];
  let filtro = 'WHERE ativo = TRUE';
  if (categoria) {
    parametros.push(String(categoria));
    filtro += ` AND categoria = $${parametros.length}`;
  }
  const [linhas, promocoes] = await Promise.all([
    varios(`SELECT * FROM servicos ${filtro} ORDER BY ordem, nome`, parametros),
    carregarPromocoesAtivas(),
  ]);
  res.json({
    servicos: linhas.map((linha) =>
      servicoPublico(linha, {
        promocao: escolherPromocao(promocoes, linha.id),
        comercial: true,
      }),
    ),
  });
});

export const detalhar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const porId = /^[0-9a-f-]{36}$/i.test(id);
  const linha = porId
    ? await um('SELECT * FROM servicos WHERE id = $1 AND ativo = TRUE', [validarUUID(id)])
    : await um('SELECT * FROM servicos WHERE slug = $1 AND ativo = TRUE', [String(id)]);
  if (!linha) throw naoEncontrado('Serviço não encontrado.');
  const promocoes = await carregarPromocoesAtivas();
  res.json({
    servico: servicoPublico(linha, {
      promocao: escolherPromocao(promocoes, linha.id),
      comercial: true,
    }),
  });
});
