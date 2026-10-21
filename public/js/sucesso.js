import { brl, carregarConfig, escapar, formatarDataHora, icone, rotuloMetodo, state, statusInfo, urlWa } from './core.js';
import { lerUltimoAgendamento } from './booking-state.js';
import { stickerCard } from './avatar-barbearia.js';
import { toast } from './ui.js';

function gerarIcs(agendamento, servico) {
  const inicio = new Date(agendamento.inicio);
  const fim = new Date(agendamento.fim);
  const formato = (data) => data.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escaparIcs = (texto) => String(texto || '').replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barbe City Jaragua//Agendamento//PT-BR',
    'BEGIN:VEVENT',
    `UID:${agendamento.id}@barbecityjaragua`,
    `DTSTAMP:${formato(new Date())}`,
    `DTSTART:${formato(inicio)}`,
    `DTEND:${formato(fim)}`,
    `SUMMARY:${escaparIcs(`Barbe City Jaraguá — ${servico}`)}`,
    `DESCRIPTION:${escaparIcs(`Código do agendamento: ${agendamento.codigo}`)}`,
    `LOCATION:${escaparIcs('R. Jairo de Almeida Machado, 220 - Jaraguá, São Paulo - SP')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

async function iniciar() {
  await carregarConfig().catch(() => {});
  const dados = lerUltimoAgendamento();
  const alvo = document.getElementById('conteudo-sucesso');
  if (!alvo) return;

  if (!dados?.agendamento) {
    alvo.innerHTML = `
      <div class="sucesso-card">
        <div class="sucesso-icone">${icone('calendar')}</div>
        <h1>Nenhum agendamento recente</h1>
        <p class="muted">Se você acabou de agendar, consulte abaixo usando o código e o telefone informados.</p>
        <div class="sucesso-acoes">
          <a class="btn btn-primary" href="/servicos.html">Agendar agora</a>
          <a class="btn btn-outline" href="/consultar.html">Consultar agendamento</a>
        </div>
      </div>`;
    return;
  }

  const { agendamento, checkout, pagamento } = dados;
  const servico = checkout?.servico?.nome || agendamento.servico?.nome || 'Serviço';
  const adicionais = (checkout?.adicionais || []).map((item) => item.nome);
  const statusPagamento = pagamento?.status || agendamento.pagamento?.status || 'na_hora';
  const pago = statusPagamento === 'pago';
  const infoPagamento = statusInfo(statusPagamento);
  const telefone = state.config?.whatsapp || '5511915040871';
  const mensagemCliente = `Olá! Fiz um agendamento na Barbe City Jaraguá.\n\nCódigo: ${agendamento.codigo}\nServiço: ${[servico, ...adicionais].join(' + ')}\nData: ${formatarDataHora(agendamento.inicio)}\nValor: ${brl(agendamento.valorOriginal)}`;
  const linkCliente = `https://wa.me/?text=${encodeURIComponent(mensagemCliente)}`;

  alvo.innerHTML = `
    <div class="sucesso-card">
      <div class="sucesso-icone">${icone('check')}</div>
      <span class="eyebrow centro">Agendamento registrado</span>
      <h1>Horário reservado com sucesso</h1>
      <p class="muted">${escapar(agendamento.nomeCliente || checkout?.nome || 'Cliente')}, seu horário está guardado. Apresente o código abaixo na barbearia.</p>
      <div class="sucesso-codigo">${icone('calendar')} ${escapar(agendamento.codigo)}</div>

      <div class="sticker-destaque">
        ${stickerCard(agendamento, { titulo: 'Sticker do seu atendimento' })}
      </div>

      <div class="resumo" style="text-align:left;position:static;margin:0 auto;max-width:520px;">
        <div class="resumo-linha"><span>Serviço</span><strong>${escapar([servico, ...adicionais].join(' + '))}</strong></div>
        <div class="resumo-linha"><span>Data e hora</span><strong>${escapar(formatarDataHora(agendamento.inicio))}</strong></div>
        <div class="resumo-linha"><span>Duração</span><strong>${agendamento.duracaoMin} min</strong></div>
        ${Number(agendamento.valorDesconto) > 0 ? `<div class="resumo-linha resumo-desconto"><span>Desconto</span><strong>-${brl(agendamento.valorDesconto)}</strong></div>` : ''}
        <div class="resumo-linha"><span>Valor</span><strong>${brl(agendamento.valorOriginal - Number(agendamento.valorDesconto || 0))}</strong></div>
        <div class="resumo-linha"><span>Pagamento</span><strong>${escapar(rotuloMetodo(pagamento?.metodo || agendamento.pagamento?.metodo))} · <span class="badge ${infoPagamento.classe}">${infoPagamento.rotulo}</span></strong></div>
        <div class="resumo-linha"><span>Endereço</span><strong>${escapar(state.config?.endereco || 'R. Jairo de Almeida Machado, 220 — Jaraguá, São Paulo/SP')}</strong></div>
      </div>

      ${pago ? '' : '<p class="hint" style="margin-top:14px;">O pagamento será confirmado no atendimento ou pelo Pix online.</p>'}

      <div class="sucesso-acoes">
        <a class="btn btn-primary" href="${escapar(dados.notificacao?.link || urlWa(telefone, mensagemCliente))}" target="_blank" rel="noopener">${icone('whatsapp')} Avisar a barbearia</a>
        <a class="btn btn-outline" href="${escapar(linkCliente)}" target="_blank" rel="noopener">${icone('whatsapp')} Enviar para mim</a>
        <button type="button" class="btn btn-ghost" id="baixar-ics">${icone('download')} Adicionar ao calendário</button>
        <a class="btn btn-ghost" href="/consultar.html?codigo=${encodeURIComponent(agendamento.codigo)}">${icone('search')} Consultar / cancelar</a>
      </div>

      <p class="hint" style="margin-top:22px;">Guarde o código <strong>${escapar(agendamento.codigo)}</strong>. Ele e seu telefone são necessários para consultar o agendamento.</p>
    </div>`;

  document.getElementById('baixar-ics')?.addEventListener('click', () => {
    try {
      const conteudo = gerarIcs(agendamento, [servico, ...adicionais].join(' + '));
      const blob = new Blob([conteudo], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `barbe-city-${agendamento.codigo}.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      toast('Convite do calendário baixado.', 'sucesso');
    } catch {
      toast('Não foi possível gerar o arquivo do calendário.', 'erro');
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
