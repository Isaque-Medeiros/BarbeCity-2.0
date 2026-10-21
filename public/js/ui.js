import { escapar } from './core.js';

let containerToast = null;

export function toast(mensagem, tipo = 'info', duracao = 4200) {
  if (!containerToast) {
    containerToast = document.createElement('div');
    containerToast.className = 'toast-stack';
    containerToast.setAttribute('aria-live', 'polite');
    document.body.appendChild(containerToast);
  }
  const item = document.createElement('div');
  item.className = `toast toast-${tipo}`;
  const icones = { sucesso: 'check', erro: 'alert', info: 'info', aviso: 'alert' };
  item.innerHTML = `
    <svg class="icon" aria-hidden="true"><use href="#i-${icones[tipo] || 'info'}"></use></svg>
    <div class="toast-text">${escapar(mensagem)}</div>
    <button type="button" class="toast-close" aria-label="Fechar aviso">×</button>`;
  item.querySelector('.toast-close').addEventListener('click', () => item.remove());
  containerToast.appendChild(item);
  setTimeout(() => {
    item.classList.add('toast-saindo');
    setTimeout(() => item.remove(), 250);
  }, duracao);
  return item;
}

export function definirCarregando(botao, carregando, texto = 'Aguarde...') {
  if (!botao) return;
  if (carregando) {
    botao.dataset.textoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.classList.add('is-loading');
    botao.innerHTML = `<span class="spinner" aria-hidden="true"></span>${escapar(texto)}`;
  } else {
    botao.disabled = false;
    botao.classList.remove('is-loading');
    if (botao.dataset.textoOriginal) botao.innerHTML = botao.dataset.textoOriginal;
  }
}

let modalAtual = null;

export function abrirModal({ titulo, conteudo, largura = '', aoFechar = null }) {
  fecharModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${largura}" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <div class="modal-head">
        <h2 id="modal-titulo">${escapar(titulo)}</h2>
        <button type="button" class="btn-icon" data-fechar aria-label="Fechar">×</button>
      </div>
      <div class="modal-body">${conteudo}</div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('modal-aberto');
  const observador = new MutationObserver(() => {
    if (!document.querySelector('.modal-overlay')) {
      document.body.classList.remove('modal-aberto');
      observador.disconnect();
    }
  });
  observador.observe(document.body, { childList: true });
  overlay.querySelector('[data-fechar]').addEventListener('click', () => fecharModal(aoFechar));
  overlay.addEventListener('click', (evento) => {
    if (evento.target === overlay) fecharModal(aoFechar);
  });
  modalAtual = overlay;
  return overlay;
}

export function fecharModal(aoFechar = null) {
  if (modalAtual) {
    modalAtual.remove();
    modalAtual = null;
    document.body.classList.remove('modal-aberto');
    if (typeof aoFechar === 'function') aoFechar();
  }
}

export function confirmar({ titulo = 'Confirmar', mensagem, textoConfirmar = 'Confirmar', perigo = false }) {
  return new Promise((resolve) => {
    const overlay = abrirModal({
      titulo,
      conteudo: `
        <p class="modal-text">${escapar(mensagem)}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-cancelar>Cancelar</button>
          <button type="button" class="btn ${perigo ? 'btn-danger' : 'btn-primary'}" data-confirmar>${escapar(textoConfirmar)}</button>
        </div>`,
    });
    let decidido = false;
    const finalizar = (valor) => {
      if (decidido) return;
      decidido = true;
      fecharModal();
      resolve(valor);
    };
    overlay.querySelector('[data-cancelar]').addEventListener('click', () => finalizar(false));
    overlay.querySelector('[data-confirmar]').addEventListener('click', () => finalizar(true));
    overlay.addEventListener('click', (evento) => {
      if (evento.target === overlay) finalizar(false);
    });
  });
}

export function estadoVazio({ icone = 'calendar', titulo, texto, acao = '' }) {
  return `<div class="empty">
    <div class="empty-icon"><svg class="icon" aria-hidden="true"><use href="#i-${icone}"></use></svg></div>
    <h3>${escapar(titulo)}</h3>
    <p>${escapar(texto)}</p>
    ${acao}
  </div>`;
}

export function skeleton(linhas = 3) {
  return `<div class="skeleton-lista">${Array.from({ length: linhas })
    .map(() => '<div class="skeleton"></div>')
    .join('')}</div>`;
}

export function mascararTelefone(input) {
  if (!input) return;
  input.addEventListener('input', () => {
    let valor = input.value.replace(/\D/g, '').slice(0, 11);
    if (valor.length > 10) {
      valor = valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (valor.length > 6) {
      valor = valor.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (valor.length > 2) {
      valor = valor.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    } else if (valor.length > 0) {
      valor = valor.replace(/^(\d{0,2}).*/, '($1');
    }
    input.value = valor;
  });
}

export function lerQuery(nome) {
  return new URLSearchParams(window.location.search).get(nome);
}

export function irPara(url) {
  window.location.href = url;
}
