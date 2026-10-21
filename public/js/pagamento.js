import { api } from './api.js';
import { brl, carregarConfig, escapar, formatarData, icone, state } from './core.js';
import { lerCheckout, limparCheckout, limparServico, salvarUltimoAgendamento } from './booking-state.js';
import { definirCarregando, toast } from './ui.js';

function renderResumo(checkout) {
  const alvo = document.getElementById('resumo-pagamento');
  if (!alvo) return;
  const itens = [checkout.servico, ...(checkout.adicionais || [])];
  alvo.innerHTML = `
    <div class="resumo-servico">
      <span class="servico-icone">${icone(checkout.servico.icone || 'scissors')}</span>
      <div>
        <strong>${escapar(itens.map((item) => item.nome).join(' + '))}</strong>
        <span>${checkout.duracaoTotal} min · ${escapar(formatarData(`${checkout.data}T12:00:00`))} às ${escapar(checkout.hora)}</span>
      </div>
    </div>
    <div class="resumo-linha"><span>Cliente</span><strong>${escapar(checkout.nome)}</strong></div>
    <div class="resumo-linha"><span>Telefone</span><strong>${escapar(checkout.telefone)}</strong></div>
    ${checkout.email ? `<div class="resumo-linha"><span>E-mail</span><strong>${escapar(checkout.email)}</strong></div>` : ''}
    ${checkout.observacao ? `<div class="resumo-linha"><span>Observação</span><strong>${escapar(checkout.observacao)}</strong></div>` : ''}
    <div class="resumo-linha"><span>Data</span><strong>${escapar(formatarData(`${checkout.data}T12:00:00`))} às ${escapar(checkout.hora)}</strong></div>
    ${Number(checkout.valorDesconto) > 0 ? `<div class="resumo-linha resumo-desconto"><span>Desconto</span><strong>-${brl(checkout.valorDesconto)}</strong></div>` : ''}
    <div class="resumo-total"><span>Total</span><strong>${brl(checkout.valorTotal)}</strong></div>`;
}

function iniciarPollingPix({ agendamento, checkout }) {
  const status = document.getElementById('pix-status');
  let tentativas = 0;
  const intervalo = setInterval(async () => {
    tentativas += 1;
    try {
      const params = new URLSearchParams({ codigo: agendamento.codigo });
      const resposta = await api.get(`/pagamentos/pix/${agendamento.id}/status?${params.toString()}`);
      if (resposta.status === 'pago') {
        clearInterval(intervalo);
        if (status) status.innerHTML = `${icone('check-circle')} Pagamento confirmado!`;
        salvarUltimoAgendamento({ agendamento, checkout, pagamento: resposta, pago: true });
        setTimeout(() => {
          window.location.href = '/sucesso.html';
        }, 900);
      } else if (tentativas % 5 === 0 && status) {
        status.innerHTML = `${icone('clock')} Aguardando o pagamento...`;
      }
    } catch {
      /* continua tentando */
    }
    if (tentativas > 150) clearInterval(intervalo);
  }, 4000);
}

async function iniciar() {
  await carregarConfig().catch(() => {});
  const checkout = lerCheckout();
  if (!checkout?.servico) {
    toast('Seu checkout expirou. Escolha o serviço novamente.', 'aviso');
    window.location.href = '/servicos.html';
    return;
  }

  renderResumo(checkout);
  const form = document.getElementById('form-pagamento');
  const botao = document.getElementById('btn-confirmar');
  const extras = {
    dinheiro: document.getElementById('extra-dinheiro'),
    cartao: document.getElementById('extra-cartao'),
    pix: document.getElementById('extra-pix'),
  };

  function metodoSelecionado() {
    return document.querySelector('input[name="metodo"]:checked')?.value || 'pix';
  }

  function atualizarMetodo() {
    const metodo = metodoSelecionado();
    document.querySelectorAll('.pagamento-opcao').forEach((opcao) => {
      opcao.classList.toggle('is-selecionado', opcao.dataset.metodo === metodo);
    });
    Object.entries(extras).forEach(([chave, elemento]) => {
      if (elemento) elemento.hidden = chave !== metodo;
    });
    if (metodo === 'pix') {
      const agora = document.querySelector('input[name="pagarAgora"]:checked')?.value === 'true';
      document.querySelectorAll('.pix-escolha label').forEach((label) => {
        label.classList.toggle('is-selecionado', label.dataset.pixOpcao === String(agora));
      });
    }
  }

  document.querySelectorAll('input[name="metodo"]').forEach((radio) => radio.addEventListener('change', atualizarMetodo));
  document.querySelectorAll('input[name="pagarAgora"]').forEach((radio) => radio.addEventListener('change', atualizarMetodo));
  atualizarMetodo();

  if (!state.config?.pixAtivo) {
    const agora = document.querySelector('input[name="pagarAgora"][value="true"]');
    if (agora) {
      agora.disabled = true;
      const nota = document.createElement('span');
      nota.className = 'hint';
      nota.textContent = ' Pix online indisponível no momento.';
      agora.closest('label')?.appendChild(nota);
    }
  }


  const notaInput = document.getElementById('nota-dinheiro');
  const trocoPreview = document.getElementById('troco-preview');
  notaInput?.addEventListener('input', () => {
    const nota = Number(notaInput.value.replace(',', '.'));
    if (trocoPreview) {
      if (!Number.isFinite(nota) || nota <= 0) {
        trocoPreview.innerHTML = '';
      } else {
        const troco = Math.max(0, nota - Number(checkout.valorTotal));
        trocoPreview.innerHTML = `<div class="troco-box"><span>Troco estimado</span><strong>${brl(troco)}</strong></div>`;
      }
    }
  });

  form?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!form.reportValidity()) return;
    const metodo = metodoSelecionado();
    const pagarAgora =
      metodo === 'pix' && document.querySelector('input[name="pagarAgora"]:checked')?.value === 'true';
    if (metodo === 'pix' && pagarAgora && !state.config?.pixAtivo) {
      toast('Pix online indisponível. Escolha pagar no local.', 'aviso');
      return;
    }
    if (!document.getElementById('aceite-pagamento')?.checked) {
      toast('Aceite a política de privacidade para concluir.', 'aviso');
      return;
    }

    definirCarregando(botao, true, 'Confirmando...');
    try {
      const resposta = await api.post('/agendamentos', {
        servico_id: checkout.servicoId,
        adicionais: checkout.adicionaisIds,
        data: checkout.data,
        hora: checkout.hora,
        nome: checkout.nome,
        email: checkout.email || undefined,
        telefone: checkout.telefone,
        observacao: checkout.observacao || undefined,
        aceitePrivacidade: true,
        pagamento: {
          metodo,
          notaDinheiro:
            metodo === 'dinheiro' && notaInput?.value ? Number(notaInput.value.replace(',', '.')) : undefined,
          trocoPix: metodo === 'dinheiro' && document.getElementById('troco-pix')?.checked,
          pagarAgora,
        },
      });

      salvarUltimoAgendamento({
        agendamento: resposta.agendamento,
        pagamento: resposta.pagamento,
        checkout,
        notificacao: resposta.notificacao,
        pix: resposta.pix,
        aviso: resposta.aviso || null,
      });
      limparCheckout();
      limparServico();

      if (resposta.pix?.qrBase64 || resposta.pix?.codigo) {
        const painel = document.getElementById('pix-painel');
        if (painel) {
          painel.hidden = false;
          painel.innerHTML = `
            <h3>Pague com Pix para confirmar</h3>
            <p class="muted">Escaneie o QR Code ou use o código copia e cola. O status é atualizado automaticamente.</p>
            ${resposta.pix.qrBase64 ? `<div class="pix-qr"><img src="data:image/png;base64,${resposta.pix.qrBase64}" alt="QR Code Pix"></div>` : ''}
            <div class="pix-codigo"><code>${escapar(resposta.pix.codigo || '')}</code><button type="button" class="btn btn-sm btn-ghost" id="copiar-pix">${icone('copy')} Copiar</button></div>
            <div class="pix-status" id="pix-status">${icone('clock')} Aguardando o pagamento...</div>
            <p class="hint" style="margin-top:10px;">Seu horário já está reservado. Você também pode pagar no local.</p>
            <a class="btn btn-ghost btn-block" style="margin-top:12px;" href="/sucesso.html">Continuar sem pagar agora</a>`;
          painel.querySelector('#copiar-pix')?.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(resposta.pix.codigo || '');
              toast('Código Pix copiado.', 'sucesso');
            } catch {
              toast('Selecione o código manualmente para copiar.', 'aviso');
            }
          });
          painel.scrollIntoView({ behavior: 'smooth', block: 'center' });
          iniciarPollingPix({ agendamento: resposta.agendamento, checkout });
        }
        return;
      }

      if (resposta.aviso) toast(resposta.aviso, 'aviso', 6000);
      window.location.href = '/sucesso.html';
    } catch (erro) {
      definirCarregando(botao, false);
      if (erro.codigo === 'horario_indisponivel') {
        toast('Esse horário acabou de ser reservado. Escolha outro.', 'erro', 6000);
        setTimeout(() => {
          window.location.href = '/confirmacao.html';
        }, 1600);
      } else {
        toast(erro.message, 'erro', 6000);
      }
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
