import { api } from './api.js';
import { carregarConfig, escapar, icone, state } from './core.js';
import { cardServico } from './servico-card.js';
import { toast } from './ui.js';

async function iniciar() {
  await carregarConfig().catch(() => {});
  const config = state.config || {};
  const whatsapp = String(config.whatsapp || '').replace(/\D/g, '');

  const preencher = (id, valor, atributo = 'textContent') => {
    const elemento = document.getElementById(id);
    if (!elemento) return;
    if (atributo === 'href') elemento.href = valor;
    else elemento.textContent = valor;
  };

  preencher('hero-endereco', config.endereco || 'R. Jairo de Almeida Machado, 220 — Jaraguá, São Paulo — SP');
  preencher('hero-telefone', config.telefone || '(11) 91504-0871');
  preencher('hero-horario', config.horarioTexto || 'Ter a Sex: 13h às 20h · Sáb e Dom: 09h às 20h');
  preencher('sobre-texto', config.sobre || '');
  preencher('contato-endereco', config.endereco || '');
  preencher('contato-telefone', config.telefone || '');
  preencher('contato-horario', config.horarioTexto || '');
  preencher('versiculo-texto', `“${config.versiculoTexto || 'Porque nele vivemos, e nos movemos, e existimos.'}”`);
  preencher('versiculo-ref', config.versiculoRef || 'Atos 17:28');
  preencher('ano-direitos', new Date().getFullYear());

  const linkMapa = document.getElementById('link-mapa');
  if (linkMapa && config.mapaUrl) linkMapa.href = config.mapaUrl;
  const linkWhats = document.getElementById('link-whatsapp');
  if (linkWhats && whatsapp) linkWhats.href = `https://wa.me/${whatsapp}`;
  const linkTel = document.getElementById('link-telefone');
  if (linkTel && whatsapp) linkTel.href = `tel:+${whatsapp}`;

  const mapa = document.getElementById('mapa-embed');
  if (mapa) {
    const consulta = encodeURIComponent(config.endereco || 'R. Jairo de Almeida Machado, 220 - Jaraguá, São Paulo - SP');
    mapa.src = `https://www.google.com/maps?q=${consulta}&output=embed`;
  }

  const alvo = document.getElementById('servicos-destaque');
  if (!alvo) return;

  const promocoesAtivas = config.promocoesAtivas || [];
  if (promocoesAtivas.length > 0 && !config.tema) {
    const faixa = document.createElement('div');
    faixa.className = 'faixa-promo-auto';
    faixa.innerHTML = `
      <div class="container faixa-promo-auto-conteudo">
        <span class="badge badge-gold">${icone('sparkles')} Promoção</span>
        ${promocoesAtivas
          .map((promocao) => `<span><strong>${escapar(promocao.rotulo)}</strong> · ${Number(promocao.percentual)}% off ${escapar(promocao.servicoNome || 'em todos os serviços')}</span>`)
          .join('')}
        <a class="btn btn-sm btn-gold" href="/servicos.html">Aproveitar</a>
      </div>`;
    document.querySelector('.hero')?.after(faixa);
  }

  try {
    const dados = await api.get('/servicos');
    const servicos = dados.servicos || [];
    const ordem = { individual: 1, combo: 2, outros: 3 };
    const destaques = [...servicos]
      .sort((a, b) => (ordem[a.categoria] || 9) - (ordem[b.categoria] || 9) || a.ordem - b.ordem)
      .slice(0, 6);
    alvo.innerHTML = destaques.map((servico) => cardServico(servico, { botao: false })).join('');
    alvo.querySelectorAll('[data-servico-id]').forEach((card) => {
      card.addEventListener('click', () => {
        const servico = servicos.find((item) => item.id === card.dataset.servicoId);
        if (!servico) return;
        const precoOriginal = Number(servico.precoOriginal ?? servico.preco);
        sessionStorage.setItem(
          'bcity_servico',
          JSON.stringify({
            servico,
            adicionais: [],
            valorOriginal: precoOriginal,
            valorDesconto: Math.max(0, precoOriginal - Number(servico.preco)),
            valorTotal: servico.preco,
            duracaoTotal: servico.duracaoMin,
          }),
        );
        window.location.href = '/confirmacao.html';
      });
    });
    const total = document.getElementById('total-servicos');
    if (total) total.textContent = `${servicos.length} serviços disponíveis`;
  } catch (erro) {
    alvo.innerHTML = `<div class="empty"><h3>Não foi possível carregar os serviços</h3><p>${escapar(erro.message)}</p><a class="btn btn-primary" href="/servicos.html">Ver serviços</a></div>`;
    toast('Não foi possível carregar os serviços agora.', 'erro');
  }

  document.querySelectorAll('[data-wa-link]').forEach((link) => {
    if (whatsapp) {
      const texto = link.dataset.waLink || 'Olá! Gostaria de saber mais sobre os horários.';
      link.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(texto)}`;
    }
  });

  const botaoTopo = document.getElementById('voltar-topo');
  if (botaoTopo) {
    botaoTopo.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  document.querySelectorAll('[data-servico-icone]').forEach((el) => {
    el.innerHTML = icone(el.dataset.servicoIcone || 'scissors');
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
