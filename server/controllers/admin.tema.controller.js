import { asyncHandler, invalido } from '../utils/http.js';
import { validarUUID } from '../utils/validacao.js';
import {
  AREAS,
  ativarTema,
  buscarTema,
  desativarTema,
  excluirTema,
  gerarTema,
  listarTemas,
  temaAtivo,
} from '../services/tema.service.js';
import { estadoIA } from '../services/gemini.service.js';

export const listar = asyncHandler(async (req, res) => {
  const [temas, ativo] = await Promise.all([listarTemas({ limite: 12 }), temaAtivo()]);
  res.json({
    temas,
    ativo,
    ia: estadoIA(),
    areas: Object.entries(AREAS).map(([id, descricao]) => ({ id, descricao })),
  });
});

export const gerar = asyncHandler(async (req, res) => {
  const prompt = String(req.body?.prompt ?? '').trim();
  const area = validarArea(req.body?.area);
  const tema = await gerarTema({ prompt, area, adminId: req.usuario.id });
  res.status(201).json({ tema, mensagem: 'Tema gerado como rascunho. Confira a prévia antes de ativar.' });
});

export const detalhar = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const tema = await buscarTema(id);
  res.json({ tema });
});

export const ativar = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  const tema = await ativarTema(id, req.usuario.id);
  res.json({ tema, mensagem: 'Tema aplicado no site.' });
});

export const resetar = asyncHandler(async (req, res) => {
  const tema = await desativarTema(req.usuario.id);
  res.json({
    tema: tema?.id || null,
    mensagem: tema
      ? 'Site restaurado para o visual original.'
      : 'O site já estava com o visual original.',
  });
});

export const excluir = asyncHandler(async (req, res) => {
  const id = validarUUID(req.params.id, 'id');
  await excluirTema(id, req.usuario.id);
  res.json({ mensagem: 'Tema excluído.' });
});

export function validarArea(valor) {
  const area = String(valor ?? 'ambos');
  if (!AREAS[area]) throw invalido('Área inválida para o tema.', { campo: 'area' });
  return area;
}
