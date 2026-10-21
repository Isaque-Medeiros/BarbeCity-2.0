import { varios } from '../config/db.js';

/**
 * Promoções vigentes (ativas e dentro da janela de validade).
 * A escolha da melhor promoção fica em `server/utils/promocoes.js`.
 */
export async function carregarPromocoesAtivas() {
  try {
    return await varios(
      `SELECT p.id, p.rotulo, p.percentual, p.servico_id, p.inicio, p.fim, p.ativo, p.criado_em,
              s.nome AS servico_nome
       FROM promocoes p
       LEFT JOIN servicos s ON s.id = p.servico_id
       WHERE p.ativo = TRUE
         AND p.inicio <= now()
         AND (p.fim IS NULL OR p.fim > now())
       ORDER BY p.percentual DESC, p.criado_em DESC`,
    );
  } catch (erro) {
    // 42P01 = tabela inexistente: o código subiu antes da migração.
    if (erro?.code === '42P01') {
      console.warn('[promocoes] tabela ausente; rode npm run db:migrate.');
      return [];
    }
    throw erro;
  }
}
