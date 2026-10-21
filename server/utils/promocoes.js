import { arredondar, paraNumero } from './dinheiro.js';

/**
 * Regras de promoção do site.
 *
 * São funções puras (sem banco) para poderem ser testadas em `tests/`.
 * A regra de negócio é simples e determinística:
 * - vale a promoção do serviço específico; se não houver, a promoção global;
 * - entre várias candidatas, vence o maior percentual e, no empate, a mais recente.
 */

function paraData(valor) {
  if (!valor) return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function idDoServico(promocao) {
  return promocao?.servico_id ?? promocao?.servicoId ?? null;
}

/**
 * Aplica um percentual de desconto e devolve o valor final com 2 casas.
 */
export function aplicarDesconto(preco, percentual) {
  const base = Math.max(0, paraNumero(preco));
  const pct = Math.min(Math.max(paraNumero(percentual), 0), 100);
  const final = base - (base * pct) / 100;
  return arredondar(Math.max(0, final));
}

/**
 * A promoção está ativa e dentro da janela de validade?
 */
export function promocaoVigente(promocao, agora = new Date()) {
  if (!promocao || promocao.ativo === false) return false;
  const referencia = paraData(agora) || new Date();
  const inicio = paraData(promocao.inicio);
  const fim = paraData(promocao.fim);
  if (inicio && inicio > referencia) return false;
  if (fim && fim <= referencia) return false;
  return true;
}

/**
 * Escolhe a melhor promoção para um serviço.
 */
export function escolherPromocao(promocoes, servicoId, agora = new Date()) {
  const lista = (Array.isArray(promocoes) ? promocoes : []).filter((item) => promocaoVigente(item, agora));
  if (lista.length === 0) return null;

  const especificas = lista.filter(
    (item) => idDoServico(item) && String(idDoServico(item)) === String(servicoId),
  );
  const candidatas = especificas.length > 0 ? especificas : lista.filter((item) => !idDoServico(item));
  if (candidatas.length === 0) return null;

  return [...candidatas].sort((a, b) => {
    const diferenca = (Number(b.percentual) || 0) - (Number(a.percentual) || 0);
    if (diferenca !== 0) return diferenca;
    return (paraData(b.criado_em)?.getTime() || 0) - (paraData(a.criado_em)?.getTime() || 0);
  })[0];
}

/**
 * Calcula preços e descontos de uma lista de serviços.
 * Devolve `itens` com `preco` já descontado (é o valor usado no checkout).
 */
export function calcularPrecos(itens, promocoes = [], agora = new Date()) {
  const detalhes = [];
  const enriquecidos = (Array.isArray(itens) ? itens : []).map((item) => {
    const precoOriginal = paraNumero(item.preco);
    const promocao = escolherPromocao(promocoes, item.id, agora);
    const percentual = promocao ? Number(promocao.percentual) || 0 : 0;
    const precoFinal = percentual > 0 ? aplicarDesconto(precoOriginal, percentual) : precoOriginal;

    if (percentual > 0) {
      detalhes.push({
        servicoId: item.id ?? null,
        nome: item.nome ?? null,
        rotulo: promocao.rotulo ?? null,
        percentual,
        valorOriginal: precoOriginal,
        valorFinal: precoFinal,
        valorDesconto: arredondar(precoOriginal - precoFinal),
      });
    }

    return {
      ...item,
      precoOriginal,
      preco: precoFinal,
      descontoPercentual: percentual,
      promocao: promocao
        ? { id: promocao.id ?? null, rotulo: promocao.rotulo ?? null, percentual }
        : null,
    };
  });

  const valorOriginal = arredondar(enriquecidos.reduce((soma, item) => soma + item.precoOriginal, 0));
  const valorTotal = arredondar(enriquecidos.reduce((soma, item) => soma + item.preco, 0));
  const rotulos = [...new Set(detalhes.map((item) => item.rotulo).filter(Boolean))];

  return {
    itens: enriquecidos,
    valorOriginal,
    valorTotal,
    valorDesconto: arredondar(valorOriginal - valorTotal),
    promocaoRotulo: rotulos.length > 0 ? rotulos.join(' + ') : null,
    promocaoDetalhes:
      detalhes.length > 0
        ? { rotulo: rotulos.join(' + ') || 'Promoção', itens: detalhes }
        : null,
  };
}

/**
 * Situação exibida no painel administrativo.
 */
export function statusPromocao(promocao, agora = new Date()) {
  if (!promocao || promocao.ativo === false) return 'encerrada';
  const referencia = paraData(agora) || new Date();
  const inicio = paraData(promocao.inicio);
  const fim = paraData(promocao.fim);
  if (inicio && inicio > referencia) return 'agendada';
  if (fim && fim <= referencia) return 'expirada';
  return 'ativa';
}
