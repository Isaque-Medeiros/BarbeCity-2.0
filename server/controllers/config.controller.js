import { asyncHandler } from '../utils/http.js';
import { configPublica, carregarConfiguracoes, promocaoPublica } from '../utils/serializadores.js';
import { varios } from '../config/db.js';
import { carregarPromocoesAtivas } from '../services/promocoes.service.js';
import { temaAtivo } from '../services/tema.service.js';

export const publica = asyncHandler(async (req, res) => {
  const [configuracoes, horarios, promocoes, tema] = await Promise.all([
    carregarConfiguracoes(),
    varios(
      `SELECT dia_semana, abertura, fechamento, intervalo_min, ativo
       FROM horarios_funcionamento ORDER BY dia_semana`,
    ),
    carregarPromocoesAtivas(),
    temaAtivo(),
  ]);

  res.json({
    configuracao: {
      ...configPublica(configuracoes),
      tema: tema
        ? {
            id: tema.id,
            area: tema.area,
            html: tema.html,
            css: tema.css,
            resumo: tema.resumo,
            ativadoEm: tema.ativado_em,
          }
        : null,
      promocoesAtivas: promocoes.map((promocao) => promocaoPublica(promocao)),
    },
    horarios: horarios.map((linha) => ({
      diaSemana: Number(linha.dia_semana),
      abertura: String(linha.abertura).slice(0, 5),
      fechamento: String(linha.fechamento).slice(0, 5),
      intervaloMin: linha.intervalo_min,
      ativo: Boolean(linha.ativo),
    })),
  });
});
