const SERVICO = 'bcity_servico';
const CHECKOUT = 'bcity_checkout';
const ULTIMO = 'bcity_ultimo_agendamento';

function ler(chave) {
  try {
    const texto = sessionStorage.getItem(chave);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

function salvar(chave, valor) {
  try {
    sessionStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* armazenamento indisponível */
  }
}

export function salvarServico(dados) {
  salvar(SERVICO, dados);
}
export function lerServico() {
  return ler(SERVICO);
}
export function limparServico() {
  sessionStorage.removeItem(SERVICO);
}

export function salvarCheckout(dados) {
  salvar(CHECKOUT, dados);
}
export function lerCheckout() {
  return ler(CHECKOUT);
}
export function limparCheckout() {
  sessionStorage.removeItem(CHECKOUT);
}

export function salvarUltimoAgendamento(dados) {
  salvar(ULTIMO, dados);
}
export function lerUltimoAgendamento() {
  return ler(ULTIMO);
}
export function limparUltimoAgendamento() {
  sessionStorage.removeItem(ULTIMO);
}
