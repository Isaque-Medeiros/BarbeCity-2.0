import { api } from './api.js';
import { brl, escapar, icone, state } from './core.js';
import { cardServico } from './servico-card.js';
import { salvarServico } from './booking-state.js';
import { avatarSVG, mesclarAvatares, rotuloTraits } from './avatar-barbearia.js';
import { toast } from './ui.js';

async function iniciar() {
  const alvo = document.getElementById('lista-servicos');
  const painelAdicionais = document.getElementById('adicionais');
  const barra = document.getElementById('barra-resumo');
  const tabs = document.querySelectorAll('[data-filtro]');
  if (!alvo) return;

  let servicos = [];
  let principal = null;
  let adicionais = [];
  let filtro = 'todos';

  const params = new URLSearchParams(window.location.search);

  function total() {
    if (!principal) return 0;
    return [principal, ...adicionais].reduce((soma, item) => soma + Number(item.preco), 0);
  }

  function duracao() {
    if (!principal) return 0;
    return [principal, ...adicionais].reduce((soma, item) => soma + Number(item.duracaoMin), 0);
  }

  function valorOriginal() {
    if (!principal) return 0;
    return [principal, ...adicionais].reduce(
      (soma, item) => soma + Number(item.precoOriginal ?? item.preco),
      0,
    );
  }

  function desconto() {
    return Math.max(0, Math.round((valorOriginal() - total()) * 100) / 100);
  }

  function renderizarAvatar() {
    const alvoAvatar = document.getElementById('avatar-preview');
    if (!alvoAvatar) return;
    if (!principal) {
      alvoAvatar.innerHTML = `
        <div class="avatar-preview-vazio">
          <strong>Seu visual</strong>
          <span>Escolha um serviço para ver o avatar.</span>
        </div>`;
      return;
    }
    const itens = [principal, ...adicionais];
    const traits = mesclarAvatares(itens);
    const rotulo = rotuloTraits(traits);
    const economia = desconto();
    alvoAvatar.innerHTML = `
      <div class="avatar-preview-card">
        <span class="avatar-preview-eyebrow">Prévia do seu visual</span>
        ${avatarSVG(traits, { tamanho: 200, rotulo })}
        <strong>${escapar(itens.map((item) => item.nome).join(' + '))}</strong>
        <span class="avatar-preview-rotulo">${escapar(rotulo)}</span>
        ${economia > 0 ? `<span class="badge badge-danger">Economia de ${brl(economia)}</span>` : ''}
      </div>`;
  }

  function renderizarLista() {
    const visiveis = servicos.filter((servico) => filtro === 'todos' || servico.categoria === filtro);
    if (visiveis.length === 0) {
      alvo.innerHTML = '<div class="empty"><h3>Nenhum serviço nesta categoria</h3><p>Escolha outra categoria.</p></div>';
      return;
    }
    alvo.innerHTML = visiveis
      .map((servico) => cardServico(servico, { selecionado: principal?.id === servico.id }))
      .join('');
    alvo.querySelectorAll('[data-servico-id]').forEach((card) => {
      card.addEventListener('click', (evento) => {
        const botao = evento.target.closest('[data-selecionar-servico]');
        const id = botao?.dataset.selecionarServico || card.dataset.servicoId;
        const servico = servicos.find((item) => item.id === id);
        if (servico) selecionar(servico);
      });
    });
  }

  function renderizarAdicionais() {
    if (!painelAdicionais) return;
    if (!principal) {
      painelAdicionais.innerHTML = '';
      return;
    }
    const opcoes = servicos.filter(
      (servico) => servico.id !== principal.id && ['individual', 'outros'].includes(servico.categoria),
    );
    if (opcoes.length === 0) {
      painelAdicionais.innerHTML = '';
      return;
    }
    painelAdicionais.innerHTML = `
      <div class="painel" style="margin-top:18px;">
        <div class="painel-titulo">
          <h2>Quer adicionar mais algum cuidado?</h2>
          <span class="badge badge-muted">Opcional</span>
        </div>
        <div class="cards-servicos" style="grid-template-columns:repeat(3,1fr);">
          ${opcoes
            .map(
              (servico) => `
            <label class="servico-card ${adicionais.some((item) => item.id === servico.id) ? 'is-selecionado' : ''}" style="cursor:pointer;">
              <div class="servico-topo">
                <span class="servico-icone">${icone(servico.icone || 'sparkles')}</span>
                <input type="checkbox" data-adicional="${servico.id}" ${adicionais.some((item) => item.id === servico.id) ? 'checked' : ''} style="accent-color:var(--red);width:20px;height:20px;">
              </div>
              <h3 style="font-size:1rem;">${escapar(servico.nome)}</h3>
              <div class="servico-meta" style="padding-top:10px;">
                <span class="servico-preco" style="font-size:1.1rem;">+ ${brl(servico.preco)}</span>
                <span class="servico-duracao">${servico.duracaoMin} min</span>
              </div>
            </label>`,
            )
            .join('')}
        </div>
      </div>`;
    painelAdicionais.querySelectorAll('[data-adicional]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const servico = servicos.find((item) => item.id === checkbox.dataset.adicional);
        if (!servico) return;
        if (checkbox.checked) {
          if (adicionais.length >= 4) {
            checkbox.checked = false;
            toast('Você pode adicionar no máximo 4 serviços extras.', 'aviso');
            return;
          }
          adicionais.push(servico);
        } else {
          adicionais = adicionais.filter((item) => item.id !== servico.id);
        }
        renderizarAdicionais();
        renderizarBarra();
        renderizarAvatar();
      });
    });
  }

  function renderizarBarra() {
    if (!barra) return;
    if (!principal) {
      barra.innerHTML = '<span class="muted">Escolha um serviço para continuar.</span>';
      barra.classList.remove('is-ativa');
      return;
    }
    barra.classList.add('is-ativa');
    const economia = desconto();
    barra.innerHTML = `
      <div class="barra-info">
        <span class="badge badge-gold">${icone('check')} Selecionado</span>
        <strong>${escapar(principal.nome)}${adicionais.length ? ` + ${adicionais.length} extra(s)` : ''}</strong>
        <span class="muted">
          ${duracao()} min ·
          ${economia > 0 ? `<s>${brl(valorOriginal())}</s> ` : ''}
          ${brl(total())}
          ${economia > 0 ? ` <span class="badge badge-danger">-${brl(economia)}</span>` : ''}
        </span>
      </div>
      <button type="button" class="btn btn-primary" id="continuar">Continuar ${icone('arrow-right')}</button>`;
    barra.querySelector('#continuar').addEventListener('click', continuar);
  }


  function selecionar(servico) {
    if (principal?.id === servico.id) return;
    principal = servico;
    adicionais = adicionais.filter((item) => item.id !== servico.id);
    renderizarLista();
    renderizarAdicionais();
    renderizarBarra();
    renderizarAvatar();
    document.getElementById('etapa-servico')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function continuar() {
    if (!principal) {
      toast('Escolha um serviço primeiro.', 'aviso');
      return;
    }
    salvarServico({
      servico: principal,
      adicionais,
      valorOriginal: valorOriginal(),
      valorDesconto: desconto(),
      valorTotal: total(),
      duracaoTotal: duracao(),
    });
    window.location.href = '/confirmacao.html';
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((item) => item.classList.remove('is-active'));
      tab.classList.add('is-active');
      filtro = tab.dataset.filtro;
      renderizarLista();
    });
  });

  alvo.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  try {
    const dados = await api.get('/servicos');
    servicos = dados.servicos || [];
    const porSlug = params.get('servico');
    const porId = params.get('id');
    const inicial = servicos.find((item) => item.slug === porSlug || item.id === porId);
    if (inicial) principal = inicial;
    renderizarLista();
    renderizarAdicionais();
    renderizarBarra();
    renderizarAvatar();
    if (state.config) {
      const nome = document.getElementById('config-nome');
      if (nome) nome.textContent = state.config.nome;
    }
  } catch (erro) {
    alvo.innerHTML = `<div class="empty"><h3>Não foi possível carregar</h3><p>${escapar(erro.message)}</p><button class="btn btn-primary" data-recarregar>Tentar novamente</button></div>`;
    alvo.querySelector('[data-recarregar]')?.addEventListener('click', () => window.location.reload());
    toast(erro.message, 'erro');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
