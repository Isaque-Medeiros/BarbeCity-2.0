const CHAVE_FECHADO = 'bcity_tema_fechado';

/**
 * Aplica a máscara visual gerada pela IA.
 *
 * O HTML/CSS já chega sanitizado do servidor. Aqui só montamos o contêiner,
 * inserimos no ponto seguro e oferecemos um botão de fechar (por sessão).
 */
export function aplicarTemaSite(tema) {
  limparTemaSite();
  if (!tema || !tema.html || !tema.css) return;

  try {
    if (sessionStorage.getItem(CHAVE_FECHADO) === String(tema.id)) return;
  } catch {
    /* armazenamento indisponível */
  }

  const estilo = document.createElement('style');
  estilo.id = 'bcity-tema-estilo';
  estilo.textContent = tema.css;
  document.head.appendChild(estilo);

  const secao = document.createElement('section');
  secao.id = 'bcity-tema-ativo';
  secao.className = 'bcity-tema-wrap';
  secao.setAttribute('role', 'region');
  secao.setAttribute('aria-label', tema.resumo || 'Novidade da barbearia');
  secao.innerHTML = tema.html;

  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'bcity-tema-fechar';
  fechar.setAttribute('aria-label', 'Fechar novidade');
  fechar.textContent = '×';
  fechar.addEventListener('click', () => {
    try {
      sessionStorage.setItem(CHAVE_FECHADO, String(tema.id));
    } catch {
      /* ignore */
    }
    limparTemaSite();
  });
  secao.appendChild(fechar);

  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  if (tema.area === 'card_landing' && footer?.parentNode) {
    footer.parentNode.insertBefore(secao, footer);
  } else if (header?.parentNode) {
    header.parentNode.insertBefore(secao, header.nextSibling);
  } else {
    document.body.prepend(secao);
  }
}

export function limparTemaSite() {
  document.getElementById('bcity-tema-ativo')?.remove();
  document.getElementById('bcity-tema-estilo')?.remove();
}
