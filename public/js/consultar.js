import { api } from './api.js';
import { brl, escapar, formatarDataHora, icone, rotuloMetodo, statusInfo } from './core.js';
import { stickerCard } from './avatar-barbearia.js';
import { confirmar, mascararTelefone, toast } from './ui.js';

async function iniciar() {
  const form = document.getElementById('form-consulta');
  const resultado = document.getElementById('resultado-consulta');
  if (!form || !resultado) return;

  const campoCodigo = document.getElementById('codigo');
  const campoTelefone = document.getElementById('telefone');
  mascararTelefone(campoTelefone);

  const params = new URLSearchParams(window.location.search);
  if (params.get('codigo')) campoCodigo.value = params.get('codigo');
  if (params.get('telefone')) campoTelefone.value = params.get('telefone');

  let atual = null;

  function renderizar(agendamento) {
    const status = statusInfo(agendamento.status);
    const pagamento = agendamento.pagamento;
    const pagamentoInfo = pagamento ? statusInfo(pagamento.status) : null;
    const podeCancelar = ['pendente', 'confirmado'].includes(agendamento.status);
    resultado.innerHTML = `
      <div class="painel">
        <div class="painel-titulo">
          <h2>${escapar(agendamento.servico?.nome || 'Agendamento')}</h2>
          <span class="badge ${status.classe}">${status.rotulo}</span>
        </div>
        <div class="sticker-destaque">
          ${stickerCard(agendamento, { titulo: 'Sticker do atendimento' })}
        </div>
        <div class="resumo" style="position:static;border:0;background:transparent;padding:0;">
          <div class="resumo-servico">
            <span class="servico-icone">${icone(agendamento.servico?.icone || 'scissors')}</span>
            <div>
              <strong>${escapar(agendamento.servico?.nome || 'Serviço')}</strong>
              <span>${escapar(formatarDataHora(agendamento.inicio))} · ${agendamento.duracaoMin} min</span>
            </div>
          </div>
          <div class="resumo-linha"><span>Cliente</span><strong>${escapar(agendamento.nomeCliente || '')}</strong></div>
          <div class="resumo-linha"><span>Telefone</span><strong>${escapar(agendamento.telefoneCliente || '')}</strong></div>
          ${agendamento.emailCliente ? `<div class="resumo-linha"><span>E-mail</span><strong>${escapar(agendamento.emailCliente)}</strong></div>` : ''}
          <div class="resumo-linha"><span>Data e hora</span><strong>${escapar(formatarDataHora(agendamento.inicio))}</strong></div>
          <div class="resumo-linha"><span>Serviço</span><strong>${escapar([agendamento.servico?.nome, ...(agendamento.adicionais || []).map((item) => item.nome)].filter(Boolean).join(' + '))}</strong></div>
          ${Number(agendamento.valorDesconto) > 0 ? `<div class="resumo-linha resumo-desconto"><span>Desconto</span><strong>-${brl(agendamento.valorDesconto)}</strong></div>` : ''}
          <div class="resumo-linha"><span>Valor</span><strong>${brl(agendamento.valorOriginal - Number(agendamento.valorDesconto || 0))}</strong></div>
          ${pagamento ? `<div class="resumo-linha"><span>Pagamento</span><strong>${escapar(rotuloMetodo(pagamento.metodo))} · <span class="badge ${pagamentoInfo.classe}">${pagamentoInfo.rotulo}</span></strong></div>` : ''}
          ${agendamento.observacao ? `<div class="resumo-linha"><span>Observação</span><strong>${escapar(agendamento.observacao)}</strong></div>` : ''}
          <div class="resumo-total"><span>Código</span><strong style="font-size:1rem;letter-spacing:2px;">${escapar(agendamento.codigo)}</strong></div>
        </div>
        <div class="sucesso-acoes" style="justify-content:flex-start;">
          ${podeCancelar ? `<button type="button" class="btn btn-danger" id="cancelar-agendamento">${icone('x')} Cancelar agendamento</button>` : ''}
          <a class="btn btn-ghost" href="/servicos.html">${icone('calendar')} Novo agendamento</a>
          <a class="btn btn-ghost" href="https://wa.me/5511915040871" target="_blank" rel="noopener">${icone('whatsapp')} Falar com a barbearia</a>
        </div>
      </div>`;

    document.getElementById('cancelar-agendamento')?.addEventListener('click', async () => {
      const confirmado = await confirmar({
        titulo: 'Cancelar agendamento',
        mensagem: 'Tem certeza que deseja cancelar este horário? O horário voltará a ficar disponível.',
        textoConfirmar: 'Sim, cancelar',
        perigo: true,
      });
      if (!confirmado) return;
      try {
        await api.post('/agendamentos/consulta/cancelar', {
          codigo: agendamento.codigo,
          telefone: campoTelefone.value,
          motivo: 'Cancelado pelo cliente pelo site',
        });
        toast('Agendamento cancelado.', 'sucesso');
        consultar();
      } catch (erro) {
        toast(erro.message, 'erro');
      }
    });
  }

  async function consultar() {
    if (!form.reportValidity()) return;
    resultado.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    try {
      const params = new URLSearchParams({
        codigo: campoCodigo.value.trim(),
        telefone: campoTelefone.value.trim(),
      });
      const dados = await api.get(`/agendamentos/consulta?${params.toString()}`);
      atual = dados.agendamento;
      renderizar(atual);
    } catch (erro) {
      resultado.innerHTML = `<div class="empty"><div class="empty-icon">${icone('search')}</div><h3>Não encontramos este agendamento</h3><p>${escapar(erro.message)}</p></div>`;
    }
  }

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    consultar();
  });
  if (campoCodigo.value && campoTelefone.value) consultar();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
