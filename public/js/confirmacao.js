import { carregarSessao, brl, escapar, formatarData, icone, state } from './core.js';
import { lerServico, salvarCheckout } from './booking-state.js';
import { iniciarAgenda } from './agenda.js';
import { mascararTelefone, toast } from './ui.js';

async function iniciar() {
  const dados = lerServico();
  if (!dados?.servico) {
    toast('Escolha um serviço antes de continuar.', 'aviso');
    window.location.href = '/servicos.html';
    return;
  }

  const servico = dados.servico;
  const adicionais = dados.adicionais || [];
  const total = Number(dados.valorTotal || servico.preco);
  const duracao = Number(dados.duracaoTotal || servico.duracaoMin);
  const adicionaisIds = adicionais.map((item) => item.id);
  const valorOriginal = Number(
    dados.valorOriginal ??
      [servico, ...adicionais].reduce((soma, item) => soma + Number(item.precoOriginal ?? item.preco), 0),
  );
  const desconto = Number(dados.valorDesconto ?? Math.max(0, valorOriginal - total));
  const rotulosPromocao = [...new Set(
    [servico, ...adicionais].map((item) => item.promocao?.rotulo).filter(Boolean),
  )];

  const resumoServico = document.getElementById('resumo-servico');
  const resumoValores = document.getElementById('resumo-valores');
  if (resumoServico) {
    resumoServico.innerHTML = `
      <span class="servico-icone">${icone(servico.icone || 'scissors')}</span>
      <div>
        <strong>${escapar(servico.nome)}</strong>
        <span>${adicionais.length ? `+ ${adicionais.map((item) => escapar(item.nome)).join(' + ')}` : 'Serviço selecionado'} · ${duracao} min</span>
      </div>`;
  }
  if (resumoValores) {
    resumoValores.innerHTML = `
      <div class="resumo-linha"><span>Serviço</span><strong>${brl(servico.preco)}</strong></div>
      ${adicionais
        .map((item) => `<div class="resumo-linha"><span>${escapar(item.nome)}</span><strong>${brl(item.preco)}</strong></div>`)
        .join('')}
      <div class="resumo-linha"><span>Duração total</span><strong>${duracao} min</strong></div>
      ${desconto > 0 ? `<div class="resumo-linha resumo-desconto"><span>Desconto${rotulosPromocao.length ? ` (${escapar(rotulosPromocao.join(' + '))})` : ''}</span><strong>-${brl(desconto)}</strong></div>` : ''}
      <div class="resumo-total"><span>Total</span><strong>${brl(total)}</strong></div>`;
  }

  let selecao = null;
  const alvoData = document.getElementById('resumo-data');
  const alvoHora = document.getElementById('resumo-hora');
  const agenda = iniciarAgenda({
    alvoCalendario: document.getElementById('calendario'),
    alvoHorarios: document.getElementById('horarios'),
    servicoId: servico.id,
    adicionais: adicionaisIds,
    onSelecionar: (valor) => {
      selecao = valor;
      if (alvoData) alvoData.textContent = valor ? formatarData(`${valor.data}T12:00:00`) : 'Escolha uma data';
      if (alvoHora) alvoHora.textContent = valor ? valor.hora : 'Escolha um horário';
    },
  });

  const usuario = state.usuario || (await carregarSessao());
  const campoNome = document.getElementById('campo-nome');
  const campoEmail = document.getElementById('campo-email');
  const campoTelefone = document.getElementById('campo-telefone');
  if (usuario) {
    if (campoNome && !campoNome.value) campoNome.value = usuario.nome || '';
    if (campoEmail && !campoEmail.value) campoEmail.value = usuario.email || '';
    if (campoTelefone && !campoTelefone.value) campoTelefone.value = usuario.telefone || '';
    const aviso = document.getElementById('aviso-logado');
    if (aviso) aviso.classList.remove('sr-only');
  }
  [campoTelefone].forEach(mascararTelefone);

  const formulario = document.getElementById('form-confirmacao');
  formulario?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (!selecao) {
      toast('Escolha a data e o horário do atendimento.', 'aviso');
      document.getElementById('calendario')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!formulario.reportValidity()) return;
    const valores = Object.fromEntries(new FormData(formulario).entries());
    if (!valores.aceitePrivacidade) {
      toast('Aceite a política de privacidade para continuar.', 'aviso');
      return;
    }
    salvarCheckout({
      servico,
      adicionais,
      servicoId: servico.id,
      adicionaisIds,
      valorOriginal,
      valorDesconto: desconto,
      valorTotal: total,
      duracaoTotal: duracao,
      data: selecao.data,
      hora: selecao.hora,
      inicio: selecao.inicio,
      fim: selecao.fim,
      nome: String(valores.nome || '').trim(),
      email: String(valores.email || '').trim(),
      telefone: String(valores.telefone || '').trim(),
      observacao: String(valores.observacao || '').trim(),
    });
    window.location.href = '/pagamento.html';
  });

  const voltar = document.getElementById('voltar-servicos');
  voltar?.addEventListener('click', () => {
    window.location.href = '/servicos.html';
  });

  void agenda;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
