import { brl, escapar, icone } from './core.js';

const CATEGORIAS = {
  individual: 'Individual',
  combo: 'Combo',
  outros: 'Tratamento',
};

export function cardServico(servico, { selecionado = false, botao = true } = {}) {
  const destaque = servico.destaque ? '<span class="badge badge-gold servico-selo">Destaque</span>' : '';
  const temDesconto = Number(servico.descontoPercentual) > 0;
  const preco = `
    <span class="servico-preco ${temDesconto ? 'tem-desconto' : ''}">
      ${temDesconto ? `<small>${brl(servico.precoOriginal)}</small>` : ''}
      <strong>${brl(servico.preco)}</strong>
      ${temDesconto ? `<span class="badge badge-danger servico-desconto">-${Number(servico.descontoPercentual)}%</span>` : ''}
    </span>`;

  return `
    <article class="servico-card ${servico.destaque ? 'is-destaque' : ''} ${selecionado ? 'is-selecionado' : ''}"
      data-servico-id="${servico.id}" data-categoria="${servico.categoria}">
      ${destaque}
      <div class="servico-topo">
        <span class="servico-icone">${icone(servico.icone || 'scissors')}</span>
        <span class="badge badge-muted">${escapar(CATEGORIAS[servico.categoria] || servico.categoria)}</span>
      </div>
      <h3>${escapar(servico.nome)}</h3>
      <p>${escapar(servico.descricao || '')}</p>
      ${temDesconto ? `<div class="servico-promocao">${icone('sparkles')} ${escapar(servico.promocao?.rotulo || 'Promoção ativa')}</div>` : ''}
      <div class="servico-meta">
        ${preco}
        <span class="servico-duracao">${icone('clock')} ${servico.duracaoMin} min</span>
      </div>
      ${botao ? `<button type="button" class="btn btn-outline btn-block servico-selecionar" data-selecionar-servico="${servico.id}">${icone('calendar')} Escolher este serviço</button>` : ''}
    </article>`;
}
