import { pool } from '../config/db.js';
import { config, recursos } from '../config/env.js';
import { fetchJson } from '../utils/fetch.js';
import { formatarBRL } from '../utils/dinheiro.js';
import { formatarDataHora } from '../utils/datas.js';
import { formatarTelefone, telefoneParaWa } from '../utils/telefone.js';

export function gerarLinkWhatsApp(numero, texto) {
  const destino = String(numero || config.whatsapp.numero || '').replace(/\D/g, '');
  return `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
}

export function montarMensagemAgendamento({ agendamento, servico, adicionais = [], pagamento }) {
  const itens = [servico?.nome || 'Serviço', ...adicionais.map((item) => item.nome)].join(' + ');
  const rotuloPagamento = {
    pix: 'Pix',
    dinheiro: 'Dinheiro',
    cartao: 'Cartão',
    legado: 'Legado',
  }[pagamento?.metodo] || 'A definir';
  const situacaoPagamento = {
    pago: 'PAGO ✅',
    pendente: 'AGUARDANDO PIX ⏳',
    na_hora: 'PAGAR NO LOCAL 💵',
    falhou: 'FALHOU ❌',
    estornado: 'ESTORNADO ↩️',
  }[pagamento?.status] || 'A DEFINIR';
  const linhas = [
    '💈 *NOVO AGENDAMENTO*',
    '━━━━━━━━━━━━━━',
    `👤 Cliente: ${agendamento.nome_cliente}`,
    `📱 Telefone: ${formatarTelefone(agendamento.telefone_cliente)}`,
    agendamento.email_cliente ? `📧 E-mail: ${agendamento.email_cliente}` : null,
    `✂️ Serviço: ${itens}`,
    `💰 Valor: ${formatarBRL(Number(agendamento.valor_original) - Number(agendamento.valor_desconto || 0))}`,
    `📅 Data: ${formatarDataHora(agendamento.data_hora_inicio)}`,
    `💳 Pagamento: ${rotuloPagamento} (${situacaoPagamento})`,
    agendamento.observacao ? `📝 Obs.: ${agendamento.observacao}` : null,
    `🔖 Código: ${agendamento.codigo_publico}`,
    '━━━━━━━━━━━━━━',
  ];
  return linhas.filter(Boolean).join('\n');
}

async function enviarPelaApiCloud({ destino, texto }) {
  if (!recursos.whatsappApiAtiva) return { enviado: false, motivo: 'whatsapp_api_nao_configurada' };
  try {
    const resposta = await fetchJson(`https://graph.facebook.com/v21.0/${config.whatsapp.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whatsapp.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: telefoneParaWa(destino),
        type: 'text',
        text: { preview_url: false, body: texto },
      }),
    });
    return { enviado: true, id: resposta?.messages?.[0]?.id || null };
  } catch (erro) {
    console.error('[whatsapp] falha no envio via Cloud API:', erro.message);
    return { enviado: false, motivo: erro.message };
  }
}

export async function notificarNovoAgendamento({ agendamento, servico, adicionais, pagamento }) {
  const texto = montarMensagemAgendamento({ agendamento, servico, adicionais, pagamento });
  const destino = config.whatsapp.numero;
  const link = gerarLinkWhatsApp(destino, texto);
  const resultado = await enviarPelaApiCloud({ destino, texto });

  const status = resultado.enviado ? 'enviado' : 'link_gerado';
  const erro = resultado.enviado ? null : resultado.motivo || null;
  try {
    await pool.query(
      `INSERT INTO notificacoes
         (agendamento_id, canal, destino, status, assunto, mensagem, link_wa, erro, payload, enviado_em)
       VALUES ($1, 'whatsapp', $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
      [
        agendamento.id,
        destino,
        status,
        'Novo agendamento',
        texto,
        link,
        erro,
        JSON.stringify({ api: resultado.enviado, id: resultado.id || null }),
        resultado.enviado ? new Date() : null,
      ],
    );
  } catch (erroBanco) {
    console.error('[whatsapp] falha ao registrar notificação:', erroBanco.message);
  }

  return { enviado: resultado.enviado, link, texto };
}

export async function notificarCancelamento({ agendamento, motivo }) {
  const texto = [
    '❌ *AGENDAMENTO CANCELADO*',
    '━━━━━━━━━━━━━━',
    `👤 Cliente: ${agendamento.nome_cliente}`,
    `📱 Telefone: ${formatarTelefone(agendamento.telefone_cliente)}`,
    `📅 Data: ${formatarDataHora(agendamento.data_hora_inicio)}`,
    `🔖 Código: ${agendamento.codigo_publico}`,
    motivo ? `📝 Motivo: ${motivo}` : null,
    '━━━━━━━━━━━━━━',
  ]
    .filter(Boolean)
    .join('\n');
  const resultado = await enviarPelaApiCloud({ destino: config.whatsapp.numero, texto });
  const link = gerarLinkWhatsApp(config.whatsapp.numero, texto);
  try {
    await pool.query(
      `INSERT INTO notificacoes
         (agendamento_id, canal, destino, status, assunto, mensagem, link_wa, erro, enviado_em)
       VALUES ($1, 'whatsapp', $2, $3, 'Agendamento cancelado', $4, $5, $6, $7)`,
      [
        agendamento.id,
        config.whatsapp.numero,
        resultado.enviado ? 'enviado' : 'link_gerado',
        texto,
        link,
        resultado.enviado ? null : resultado.motivo || null,
        resultado.enviado ? new Date() : null,
      ],
    );
  } catch (erroBanco) {
    console.error('[whatsapp] falha ao registrar cancelamento:', erroBanco.message);
  }
  return { enviado: resultado.enviado, link, texto };
}
