import { HttpError } from '../utils/http.js';
import { config } from '../config/env.js';

export function rotaApiNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota da API não encontrada.', codigo: 'rota_nao_encontrada' });
}

export function tratarErros(erro, req, res, next) {
  if (res.headersSent) return next(erro);

  if (erro instanceof HttpError) {
    return res.status(erro.status).json({
      erro: erro.message,
      codigo: erro.codigo,
      ...(erro.detalhes ? { detalhes: erro.detalhes } : {}),
    });
  }

  if (erro?.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.', codigo: 'json_invalido' });
  }

  if (erro?.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Requisição muito grande.', codigo: 'muito_grande' });
  }

  switch (erro?.code) {
    case '23505':
      return res.status(409).json({
        erro: 'Já existe um registro com esses dados.',
        codigo: 'registro_duplicado',
        ...(config.producao ? {} : { detalhe: erro.detail }),
      });
    case '23P01':
      return res.status(409).json({
        erro: 'Esse horário acabou de ser reservado. Escolha outro.',
        codigo: 'horario_indisponivel',
      });
    case '23503':
      return res.status(409).json({
        erro: 'Este registro está em uso e não pode ser removido.',
        codigo: 'registro_em_uso',
      });
    case '23514':
      return res.status(400).json({
        erro: 'Os dados não atendem às regras do sistema.',
        codigo: 'violacao_regra',
        ...(config.producao ? {} : { detalhe: erro.detail }),
      });
    default:
      break;
  }

  console.error(`[erro] ${req.method} ${req.originalUrl}`, erro);
  return res.status(500).json({
    erro: 'Erro interno no servidor. Tente novamente em instantes.',
    codigo: 'erro_interno',
    ...(config.producao ? {} : { detalhe: erro.message }),
  });
}
