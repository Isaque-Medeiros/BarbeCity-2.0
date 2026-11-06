import { carregarConfig, carregarSessao, escapar, icone, state } from './core.js';
import { aplicarTemaSite } from './tema-site.js';
import { avatarMini3D } from './avatar3d.js?v=2026.20';

const PADRAO = {
  nome: 'Barbe City Jaraguá',
  slogan: 'Tradição e estilo em cada corte.',
  endereco: 'R. Jairo de Almeida Machado, 220 — Jaraguá, São Paulo — SP',
  telefone: '(11) 91504-0871',
  whatsapp: '5511915040871',
  horarioTexto: 'Ter a Sex: 13h às 20h · Sáb e Dom: 09h às 20h',
  mapaUrl:
    'https://www.google.com/maps/search/?api=1&query=R.+Jairo+de+Almeida+Machado,+220+-+Jaragu%C3%A1,+S%C3%A3o+Paulo+-+SP',
  versiculo: 'Deus é fiel',
  versiculoRef: 'Atos 17:28',
  versiculoTexto: 'Porque nele vivemos, e nos movemos, e existimos.',
};

let spriteInjetado = false;
let ultimoFoco = null;

async function injetarSprite() {
  if (spriteInjetado || document.getElementById('bcity-sprite')) return;
  try {
    const resposta = await fetch('/assets/icons/sprite.svg');
    if (!resposta.ok) return;
    const texto = await resposta.text();
    const caixa = document.createElement('div');
    caixa.id = 'bcity-sprite';
    caixa.setAttribute('aria-hidden', 'true');
    caixa.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    caixa.innerHTML = texto;
    document.body.prepend(caixa);
    spriteInjetado = true;
  } catch {
    /* sem sprite: ícones ficam vazios, mas o site continua */
  }
}

export function aplicarTema(tema) {
  const escolhido = tema || localStorage.getItem('bcity_tema') || 'dark';
  document.documentElement.dataset.theme = escolhido;
  localStorage.setItem('bcity_tema', escolhido);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', escolhido === 'dark' ? '#0b0b0c' : '#faf8f5');
  document.querySelectorAll('[data-tema-toggle]').forEach((botao) => {
    botao.setAttribute('aria-label', escolhido === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
    botao.innerHTML = icone(escolhido === 'dark' ? 'sun' : 'moon');
  });
  window.dispatchEvent(new CustomEvent('bcity:tema', { detail: escolhido }));
}

function linkNav(href, texto, ativo) {
  return `<a class="nav-link ${ativo ? 'is-active' : ''}" href="${href}" ${ativo ? 'aria-current="page"' : ''}>${texto}</a>`;
}

function renderizarHeader(config) {
  const caminho = window.location.pathname.replace(/\/$/, '') || '/';
  const ativo = (pagina) => caminho === pagina || caminho.endsWith(pagina);
  const usuario = state.usuario;
  const primeiroNome = usuario?.nome ? escapar(usuario.nome.split(' ')[0]) : '';

  const areaUsuario = usuario
    ? `<a class="nav-link account-link" href="/usuario.html">${usuario.avatar ? avatarMini3D(usuario.avatar, { tamanho: 26 }) : icone('user')}<span>${primeiroNome}</span></a>`
    : `<a class="nav-link account-link" href="/login.html">${icone('user')}<span>Entrar</span></a>`;

  const admin =
    usuario?.role === 'admin'
      ? `<a class="nav-link admin-link" href="/admin.html">${icone('settings')}<span>Painel</span></a>`
      : '';

  const cta = `<a class="btn btn-primary btn-sm header-cta" href="/servicos.html">${icone('calendar')} Agendar</a>`;

  return `
  <header class="site-header" data-header>
    <div class="header-inner">
      <a class="brand" href="/" aria-label="${escapar(config.nome)} — início">
        <img src="/assets/logo-mark.svg" alt="" width="40" height="40" class="brand-mark">
        <span class="brand-text">
          <span class="brand-name">BARBE <em>City</em></span>
          <span class="brand-sub">JARAGUÁ</span>
        </span>
      </a>

      <nav class="primary-nav" id="primary-nav" aria-label="Navegação principal">
        <div class="drawer-head">
          <span class="drawer-title">Menu</span>
          <button type="button" class="drawer-close" data-menu-close aria-label="Fechar menu">${icone('x')}</button>
        </div>
        ${linkNav('/', 'Início', caminho === '/')}
        ${linkNav('/servicos.html', 'Serviços', ativo('/servicos.html'))}
        ${linkNav('/consultar.html', 'Meu agendamento', ativo('/consultar.html'))}
        <a class="nav-link" href="/#sobre">Sobre</a>
        <a class="nav-link" href="/#contato">Contato</a>
        ${admin}
        <div class="nav-mobile-extra">
          ${areaUsuario}
          <a class="btn btn-primary btn-block" href="/servicos.html">${icone('scissors')} Agendar horário</a>
        </div>
      </nav>

      <div class="header-actions">
        <button type="button" class="btn-icon theme-toggle" data-tema-toggle aria-label="Alternar tema">${icone('moon')}</button>
        ${areaUsuario}
        ${admin}
        ${cta}
        <button type="button" class="menu-toggle" data-menu-toggle aria-label="Abrir menu" aria-expanded="false" aria-controls="primary-nav">
          <span class="menu-bars" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  </header>
  <div class="menu-backdrop" data-menu-backdrop aria-hidden="true"></div>`;
}

function renderizarFooter(config) {
  const ano = new Date().getFullYear();
  const whatsapp = String(config.whatsapp || '').replace(/\D/g, '');
  return `
  <footer class="site-footer" id="rodape">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a class="brand" href="/" aria-label="${escapar(config.nome)}">
          <img src="/assets/logo-mark.svg" alt="" width="44" height="44" class="brand-mark">
          <span class="brand-text">
            <span class="brand-name">BARBE <em>City</em></span>
            <span class="brand-sub">JARAGUÁ</span>
          </span>
        </a>
        <p>${escapar(config.slogan || PADRAO.slogan)}</p>
        <p class="footer-verse">✝ “${escapar(config.versiculo || PADRAO.versiculo)}”</p>
      </div>

      <div class="footer-col">
        <h3>Navegar</h3>
        <a href="/">Início</a>
        <a href="/servicos.html">Agendar horário</a>
        <a href="/consultar.html">Meu agendamento</a>
        <a href="/login.html">Entrar / Criar conta</a>
        <a href="/privacidade.html">Privacidade</a>
      </div>

      <div class="footer-col">
        <h3>Contato</h3>
        <p>${escapar(config.endereco || PADRAO.endereco)}</p>
        <a href="tel:+${whatsapp}">${escapar(config.telefone || PADRAO.telefone)}</a>
        <a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener">${icone('whatsapp')} Chamar no WhatsApp</a>
        <a href="${escapar(config.mapaUrl || PADRAO.mapaUrl)}" target="_blank" rel="noopener">${icone('map-pin')} Ver no mapa</a>
      </div>

      <div class="footer-col">
        <h3>Funcionamento</h3>
        <p>${escapar(config.horarioTexto || PADRAO.horarioTexto)}</p>
        <div class="footer-social">
          <a class="btn-icon" href="https://wa.me/${whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp">${icone('whatsapp')}</a>
          <a class="btn-icon" href="tel:+${whatsapp}" aria-label="Telefone">${icone('phone')}</a>
          <a class="btn-icon" href="mailto:${escapar(config.emailContato || '')}" aria-label="E-mail">${icone('mail')}</a>
        </div>
      </div>
    </div>

    <div class="container footer-bottom">
      <p>© ${ano} ${escapar(config.nome || PADRAO.nome)}. Todos os direitos reservados.</p>
      <p class="footer-sign">Tradição e estilo em cada corte · <span>Deus é fiel</span></p>
      <a href="/admin.html" class="footer-admin">Acesso administrativo</a>
    </div>
  </footer>`;
}

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/* A gaveta mobile precisa ser filha do body: qualquer ancestral com
   transform/filter/backdrop-filter viraria containing block e prenderia
   o position:fixed dentro do header. */
function posicionarNav() {
  const nav = document.getElementById('primary-nav');
  const header = document.querySelector('.site-header');
  if (!nav || !header) return;
  const inner = header.querySelector('.header-inner');
  const mobile = window.matchMedia('(max-width: 1023px)').matches;
  if (mobile) {
    if (nav.parentElement !== document.body) document.body.appendChild(nav);
  } else if (inner && nav.parentElement !== inner) {
    inner.insertBefore(nav, inner.querySelector('.header-actions'));
  }
}

function menuEstaAberto() {
  return document.body.classList.contains('menu-aberto');
}

function fecharMenu({ devolverFoco = true } = {}) {
  if (!menuEstaAberto()) return;
  document.body.classList.remove('menu-aberto');
  const botao = document.querySelector('[data-menu-toggle]');
  if (botao) {
    botao.setAttribute('aria-expanded', 'false');
    botao.setAttribute('aria-label', 'Abrir menu');
  }
  if (devolverFoco && ultimoFoco && typeof ultimoFoco.focus === 'function') {
    ultimoFoco.focus({ preventScroll: true });
  }
}

function abrirMenu() {
  const nav = document.getElementById('primary-nav');
  if (!nav) return;
  ultimoFoco = document.activeElement;
  document.body.classList.add('menu-aberto');
  const botao = document.querySelector('[data-menu-toggle]');
  if (botao) {
    botao.setAttribute('aria-expanded', 'true');
    botao.setAttribute('aria-label', 'Fechar menu');
  }
  const primeiro = nav.querySelector(FOCAVEIS);
  if (primeiro) primeiro.focus({ preventScroll: true });
}

function prenderFoco(evento) {
  const nav = document.getElementById('primary-nav');
  if (!nav) return;
  const itens = [...nav.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null);
  if (!itens.length) return;
  const primeiro = itens[0];
  const ultimo = itens[itens.length - 1];
  if (evento.shiftKey && document.activeElement === primeiro) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primeiro.focus();
  }
}

let globaisLigados = false;

function ligarGlobais() {
  if (globaisLigados) return;
  globaisLigados = true;

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fecharMenu();
    if (evento.key === 'Tab' && menuEstaAberto()) prenderFoco(evento);
  });

  window.addEventListener(
    'resize',
    () => {
      posicionarNav();
      if (window.innerWidth > 1023) fecharMenu({ devolverFoco: false });
    },
    { passive: true },
  );

  let ultimoScroll = 0;
  window.addEventListener(
    'scroll',
    () => {
      const header = document.querySelector('[data-header]');
      if (!header) return;
      const y = window.scrollY || document.documentElement.scrollTop;
      if (Math.abs(y - ultimoScroll) < 6) return;
      ultimoScroll = y;
      header.classList.toggle('is-scrolled', y > 10);
    },
    { passive: true },
  );
}

function removerNavSolta() {
  document.querySelectorAll('body > #primary-nav').forEach((n) => n.remove());
}

function ligarComportamentos() {
  removerNavSolta();
  posicionarNav();

  document.querySelectorAll('[data-tema-toggle]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const atual = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      aplicarTema(atual);
    });
  });

  const menu = document.querySelector('[data-menu-toggle]');
  const nav = document.getElementById('primary-nav');
  if (menu && nav) {
    menu.addEventListener('click', () => (menuEstaAberto() ? fecharMenu() : abrirMenu()));

    const fechar = document.querySelector('[data-menu-close]');
    if (fechar) fechar.addEventListener('click', () => fecharMenu());

    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => fecharMenu({ devolverFoco: false })));

    const backdrop = document.querySelector('[data-menu-backdrop]');
    if (backdrop) backdrop.addEventListener('click', () => fecharMenu());
  }

  const header = document.querySelector('[data-header]');
  if (header) header.classList.toggle('is-scrolled', (window.scrollY || 0) > 10);
  ligarGlobais();
  iniciarRevelacao();
}

/* Revelação suave no scroll — só em elementos estáticos, para não
   esconder conteúdo montado depois por JS. */
let revelacaoIniciada = false;

function iniciarRevelacao() {
  if (revelacaoIniciada) return;
  revelacaoIniciada = true;
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const seletor = [
    '.section-head',
    '.hero-copy > *',
    '.hero-visual',
    '.diferencial',
    '.galeria-item',
    '.sobre-grid > *',
    '.contato-grid > *',
    '.versiculo blockquote',
    '.page-head > *',
    '.auth-card',
    '.perfil-topo',
  ].join(',');

  const alvos = [...document.querySelectorAll(seletor)].filter((el) => !el.hasAttribute('data-reveal'));
  if (!alvos.length) return;

  alvos.forEach((el, indice) => {
    el.setAttribute('data-reveal', '');
    const atraso = Math.min((indice % 4) * 70, 210);
    el.style.setProperty('--reveal-delay', `${atraso}ms`);
  });

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('is-visible');
        observador.unobserve(entrada.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
  );

  alvos.forEach((el) => observador.observe(el));

  // rede de segurança: revela o que estiver perto da viewport mesmo se o
  // observer não disparar (print, salto de âncora, navegador antigo)
  const pendentes = new Set(alvos);
  const revelarProximos = () => {
    const limite = window.innerHeight + 140;
    for (const el of [...pendentes]) {
      if (el.getBoundingClientRect().top < limite) {
        el.classList.add('is-visible');
        pendentes.delete(el);
      }
    }
  };

  window.addEventListener('scroll', revelarProximos, { passive: true });
  window.addEventListener('resize', revelarProximos, { passive: true });
  window.addEventListener('beforeprint', () => alvos.forEach((el) => el.classList.add('is-visible')));
  setTimeout(revelarProximos, 700);
  setTimeout(revelarProximos, 1800);
}

export function atualizarHeader() {
  const alvo = document.getElementById('site-header');
  if (!alvo) return;
  const config = state.config || PADRAO;
  removerNavSolta();
  alvo.innerHTML = renderizarHeader(config);
  aplicarTema();
  ligarComportamentos();
}

export async function iniciarLayout() {
  const sprite = injetarSprite();

  if (!document.querySelector('.skip-link')) {
    const pular = document.createElement('a');
    pular.className = 'skip-link';
    pular.href = '#conteudo';
    pular.textContent = 'Pular para o conteúdo';
    document.body.prepend(pular);
  }

  const alvoHeader = document.getElementById('site-header');
  const alvoFooter = document.getElementById('site-footer');

  // header fixo: o body precisa compensar a altura
  document.body.classList.toggle('tem-header', Boolean(alvoHeader));

  // Primeiro paint: header/footer com os dados padrão, sem esperar a API.
  if (alvoHeader) alvoHeader.innerHTML = renderizarHeader(PADRAO);
  if (alvoFooter) alvoFooter.innerHTML = renderizarFooter(PADRAO);
  aplicarTema();
  ligarComportamentos();

  await sprite;
  const [config] = await Promise.all([carregarConfig().catch(() => null), carregarSessao()]);
  // carregarConfig() devolve o state (config em state.config), não { configuracao }
  const cfg = state.config || config?.config || PADRAO;

  if (alvoHeader) alvoHeader.innerHTML = renderizarHeader(cfg);
  if (alvoFooter) alvoFooter.innerHTML = renderizarFooter(cfg);

  const ehAdmin = window.location.pathname.replace(/\/$/, '').endsWith('/admin.html');
  if (!ehAdmin) aplicarTemaSite(cfg.tema || null);
  aplicarTema();
  ligarComportamentos();

  window.addEventListener('bcity:usuario', () => atualizarHeader());
  window.dispatchEvent(new CustomEvent('bcity:layout', { detail: { config: cfg } }));
  return cfg;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => iniciarLayout());
} else {
  iniciarLayout();
}
