import { comTransacao, um, varios } from '../config/db.js';
import { HttpError, invalido, naoEncontrado, conflito } from '../utils/http.js';
import { registrarLog } from '../utils/serializadores.js';
import { sanitizarTema } from '../utils/tema.js';
import { gerarJson } from './gemini.service.js';

/**
 * Editor de tema por IA em "modo seguro".
 *
 * A IA devolve JSON (html + css), mas nada é confiado:
 * 1. o HTML passa por allowlist de tags/classes;
 * 2. o CSS passa por allowlist de propriedades e é escopado em #bcity-tema-ativo;
 * 3. o contraste texto/fundo é verificado;
 * 4. o tema nasce como rascunho e só entra no site quando o admin ativa.
 */

export const AREAS = {
  faixa_topo: 'uma faixa horizontal logo abaixo do cabeçalho do site',
  card_landing: 'um card de destaque antes do rodapé da página inicial',
  ambos: 'uma faixa logo abaixo do cabeçalho e um card de destaque antes do rodapé',
};

const ESQUEMA = {
  type: 'OBJECT',
  properties: {
    titulo: { type: 'STRING' },
    resumo: { type: 'STRING' },
    html: { type: 'STRING' },
    css: { type: 'STRING' },
  },
  required: ['titulo', 'resumo', 'html', 'css'],
  propertyOrdering: ['titulo', 'resumo', 'html', 'css'],
};

function montarSistema(area) {
  return `Você é um designer front-end da barbearia "Barbe City Jaraguá".
Gere APENAS um JSON com os campos "titulo", "resumo", "html" e "css".

OBJETIVO
Criar uma máscara visual comemorativa para ${AREAS[area] || AREAS.ambos}.

REGRAS ABSOLUTAS (o sistema rejeita o que não cumprir)
- Não use scripts, eventos, links, imagens, SVG, iframes, formulários ou fontes externas.
- Tags permitidas: div, section, span, p, strong, em, h2, h3, ul, li, br.
- Único atributo permitido: class. Toda classe deve começar com "bcity-tema-".
- Não use id, style inline, data-*, href, src, on*.
- O CSS deve ter no máximo 60 regras e usar somente classes com prefixo "bcity-tema-".
- Propriedades CSS permitidas: color, background, background-color, background-image (apenas linear-gradient), border, border-color, border-width, border-style, border-radius, box-shadow, padding (+ lados), margin (+ lados), font-size (8px a 48px), font-weight, font-style, font-family, letter-spacing, line-height, text-align, text-transform, text-shadow, display (block/flex/inline-flex/inline-block/grid/none), align-items, justify-content, flex-wrap, flex-direction, gap, row-gap, column-gap, width, max-width, height, max-height, opacity.
- NUNCA use position, top/left/right/bottom, z-index, overflow, transform, animation, transition, filter, backdrop-filter, cursor, pointer-events, content, url(), @import, @font-face, !important.
- NÃO tente alterar o tamanho, a posição ou o layout de elementos do site: você só estiliza as suas próprias classes.
- Garanta contraste de pelo menos 4.5:1 entre texto e fundo.
- Texto curto e em português do Brasil. Use emojis no HTML para decoração (🎁 🎈 ✨ 🎉).
- Use preferencialmente as cores da casa: vermelho #b91c1c, dourado #d4af37, preto #0b0b0c, branco #ffffff.
- O HTML deve ser um fragmento (sem html/head/body) com um contêiner raiz que tenha uma classe "bcity-tema-...".
- O CSS deve ser estático e responsivo usando flex-wrap; nada de medidas maiores que 1200px.

EXEMPLO DE ESTRUTURA
{"titulo":"Mês das crianças","resumo":"Faixa com presentes e desconto infantil","html":"<div class=\\"bcity-tema-faixa\\"><span class=\\"bcity-tema-emoji\\">🎁</span><strong class=\\"bcity-tema-titulo\\">Feliz Dia das Crianças!</strong><p class=\\"bcity-tema-texto\\">Desconto especial de 20% para os pequenos.</p></div>","css":".bcity-tema-faixa{display:flex;align-items:center;justify-content:center;gap:12px;padding:18px;background-color:#b91c1c;color:#ffffff;border-radius:16px}.bcity-tema-titulo{font-size:20px}.bcity-tema-texto{font-size:14px}"}

Responda somente com o JSON, sem comentários e sem markdown.`;
}

export async function gerarTema({ prompt, area = 'ambos', adminId = null }) {
  const texto = String(prompt ?? '').trim();
  if (texto.length < 20) {
    throw invalido('Descreva o tema com pelo menos 20 caracteres.', { campo: 'prompt' });
  }
  if (texto.length > 600) {
    throw invalido('A descrição do tema deve ter no máximo 600 caracteres.', { campo: 'prompt' });
  }
  const areaValida = AREAS[area] ? area : 'ambos';

  const { dados, meta } = await gerarJson({
    prompt: texto,
    sistema: montarSistema(areaValida),
    esquema: ESQUEMA,
  });

  const limpo = sanitizarTema({ html: dados?.html, css: dados?.css });
  if (!limpo.ok) {
    throw new HttpError(
      422,
      'A IA retornou um tema fora do padrão de segurança. Tente descrever novamente com outras palavras.',
      'tema_invalido',
      { motivo: limpo.motivo, avisos: limpo.avisos?.slice(0, 12) },
    );
  }

  const criado = await um(
    `INSERT INTO temas_site (prompt, area, html, css, resumo, status, modelo, criado_por)
     VALUES ($1, $2, $3, $4, $5, 'rascunho', $6, $7)
     RETURNING id, prompt, area, html, css, resumo, status, modelo, criado_em, ativado_em`,
    [
      texto,
      areaValida,
      limpo.html,
      limpo.css,
      String(dados?.resumo || dados?.titulo || 'Tema personalizado').slice(0, 160),
      meta.modelo,
      adminId,
    ],
  );

  await limparRascunhos();

  await registrarLog({
    adminId,
    acao: 'gerar_tema_ia',
    entidade: 'tema',
    entidadeId: criado.id,
    detalhes: {
      area: areaValida,
      modelo: meta.modelo,
      chave: meta.chaveIndice,
      avisos: limpo.avisos?.slice(0, 12) || [],
      contraste: limpo.contraste ?? null,
    },
  });

  return criado;
}

/**
 * Mantém no máximo 20 rascunhos para não crescer sem controle.
 */
async function limparRascunhos() {
  await varios(
    `DELETE FROM temas_site
     WHERE status = 'rascunho'
       AND id NOT IN (
         SELECT id FROM temas_site WHERE status = 'rascunho' ORDER BY criado_em DESC LIMIT 20
       )
     RETURNING id`,
  );
}

export async function listarTemas({ limite = 12 } = {}) {
  const seguro = Math.min(Math.max(Number(limite) || 12, 1), 30);
  return varios(
    `SELECT id, prompt, area, resumo, status, modelo, criado_em, ativado_em,
            CASE WHEN status = 'ativo' THEN html ELSE NULL END AS html,
            CASE WHEN status = 'ativo' THEN css ELSE NULL END AS css
     FROM temas_site
     ORDER BY criado_em DESC
     LIMIT ${seguro}`,
  );
}

export async function temaAtivo() {
  try {
    return await um(
      `SELECT id, area, html, css, resumo, status, ativado_em
       FROM temas_site
       WHERE status = 'ativo'
       LIMIT 1`,
    );
  } catch (erro) {
    if (erro?.code === '42P01') {
      console.warn('[tema] tabela ausente; rode npm run db:migrate.');
      return null;
    }
    throw erro;
  }
}

export async function buscarTema(id) {
  const tema = await um(
    `SELECT id, prompt, area, html, css, resumo, status, modelo, criado_em, ativado_em
     FROM temas_site
     WHERE id = $1`,
    [id],
  );
  if (!tema) throw naoEncontrado('Tema não encontrado.');
  return tema;
}

export async function ativarTema(id, adminId = null) {
  const existente = await um('SELECT id, status FROM temas_site WHERE id = $1', [id]);
  if (!existente) throw naoEncontrado('Tema não encontrado.');

  await comTransacao(async (cliente) => {
    await cliente.query(`UPDATE temas_site SET status = 'arquivado' WHERE status = 'ativo'`);
    await cliente.query(
      `UPDATE temas_site SET status = 'ativo', ativado_em = now() WHERE id = $1`,
      [id],
    );
  });

  await registrarLog({
    adminId,
    acao: 'ativar_tema_ia',
    entidade: 'tema',
    entidadeId: id,
    detalhes: { anterior: existente.status },
  });

  return um(
    `SELECT id, area, html, css, resumo, status, ativado_em FROM temas_site WHERE id = $1`,
    [id],
  );
}

export async function desativarTema(adminId = null) {
  const atual = await um(
    `UPDATE temas_site SET status = 'arquivado' WHERE status = 'ativo' RETURNING id`,
  );

  await registrarLog({
    adminId,
    acao: 'restaurar_site_original',
    entidade: 'tema',
    entidadeId: atual?.id || null,
    detalhes: { temaDesativado: atual?.id || null },
  });

  return atual;
}

export async function excluirTema(id, adminId = null) {
  const existente = await um('SELECT id, status FROM temas_site WHERE id = $1', [id]);
  if (!existente) throw naoEncontrado('Tema não encontrado.');
  if (existente.status === 'ativo') {
    throw conflito('Volte ao site original antes de excluir o tema ativo.', 'tema_ativo');
  }

  await um('DELETE FROM temas_site WHERE id = $1 RETURNING id', [id]);

  await registrarLog({
    adminId,
    acao: 'excluir_tema_ia',
    entidade: 'tema',
    entidadeId: id,
    detalhes: { status: existente.status },
  });

  return { id };
}
