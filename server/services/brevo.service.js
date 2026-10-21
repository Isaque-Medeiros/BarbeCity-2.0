import { config, recursos } from '../config/env.js';
import { fetchJson } from '../utils/fetch.js';
import { escaparHtml } from '../utils/validacao.js';
import { formatarBRL } from '../utils/dinheiro.js';
import { formatarDataHora } from '../utils/datas.js';
import { formatarTelefone } from '../utils/telefone.js';

const CORES = {
  fundo: '#0d0d0d',
  superficie: '#161616',
  borda: '#2b2b2b',
  texto: '#f5f0e6',
  suave: '#a39d92',
  dourado: '#d4af37',
  vermelho: '#b91c1c',
};

function layoutEmail({ titulo, preheader = '', corpo }) {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escaparHtml(titulo)}</title></head>
<body style="margin:0;padding:0;background:${CORES.fundo};font-family:Arial,Helvetica,sans-serif;color:${CORES.texto};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escaparHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${CORES.fundo};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${CORES.superficie};border:1px solid ${CORES.borda};border-radius:18px;overflow:hidden;">
        <tr><td style="padding:26px 28px 10px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;color:${CORES.dourado};text-transform:uppercase;">Barbearia Premium</div>
          <div style="font-size:26px;font-weight:bold;color:${CORES.texto};margin-top:6px;">Barbe <span style="color:${CORES.vermelho};">City</span> Jaraguá</div>
          <div style="height:3px;width:56px;background:${CORES.dourado};margin:12px auto 0;border-radius:2px;"></div>
        </td></tr>
        <tr><td style="padding:12px 28px 28px;">
          <h1 style="font-size:20px;margin:0 0 14px;color:${CORES.texto};">${escaparHtml(titulo)}</h1>
          <div style="font-size:15px;line-height:1.6;color:${CORES.suave};">${corpo}</div>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid ${CORES.borda};font-size:12px;line-height:1.6;color:${CORES.suave};text-align:center;">
          Barbe City Jaraguá · R. Jairo de Almeida Machado, 220 — Jaraguá, São Paulo/SP<br>
          (11) 91504-0871 · <span style="color:${CORES.dourado};">Deus é fiel</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function botao(texto, url) {
  return `<a href="${url}" style="display:inline-block;background:${CORES.vermelho};color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:12px;font-weight:bold;font-size:15px;margin:8px 0;">${escaparHtml(texto)}</a>`;
}

function caixa(dados) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#101010;border:1px solid ${CORES.borda};border-radius:12px;margin:14px 0;">
    ${dados
      .map(
        ([rotulo, valor]) => `<tr>
          <td style="padding:9px 14px;font-size:13px;color:${CORES.suave};width:40%;">${escaparHtml(rotulo)}</td>
          <td style="padding:9px 14px;font-size:14px;color:${CORES.texto};font-weight:bold;">${valor}</td>
        </tr>`,
      )
      .join('')}
  </table>`;
}

export async function enviarEmail({ para, nome, assunto, html, texto }) {
  if (!recursos.brevoAtivo) {
    return { enviado: false, motivo: 'brevo_nao_configurado' };
  }
  try {
    const resposta = await fetchJson('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.brevo.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: config.brevo.remetenteNome, email: config.brevo.remetenteEmail },
        to: [{ email: para, ...(nome ? { name: nome } : {}) }],
        subject: assunto,
        htmlContent: html,
        textContent: texto || undefined,
      }),
    });
    return { enviado: true, id: resposta?.messageId || null };
  } catch (erro) {
    console.error(`[brevo] falha ao enviar para ${para}:`, erro.message);
    return { enviado: false, motivo: erro.message };
  }
}


export function emailToken({ nome, codigo, link, validadeMin = 15, tipo = 'login' }) {
  const titulo = tipo === 'redefinir' ? 'Redefinir sua senha' : 'Seu código de acesso';
  const html = layoutEmail({
    titulo,
    preheader: `Seu código é ${codigo}`,
    corpo: `
      <p>Olá${nome ? `, <strong style="color:${CORES.texto};">${escaparHtml(nome)}</strong>` : ''}!</p>
      <p>Use o código abaixo para ${tipo === 'redefinir' ? 'criar uma nova senha' : 'entrar na sua conta'}.
      Ele expira em <strong style="color:${CORES.dourado};">${validadeMin} minutos</strong> e só pode ser usado uma vez.</p>
      <div style="font-size:34px;letter-spacing:10px;font-weight:bold;color:${CORES.dourado};background:#101010;border:1px dashed ${CORES.dourado};border-radius:12px;text-align:center;padding:16px;margin:18px 0;">
        ${escaparHtml(codigo)}
      </div>
      <p style="text-align:center;">${botao('Abrir o site', link)}</p>
      <p style="font-size:13px;">Se você não pediu este código, ignore este e-mail.</p>`,
  });
  return {
    assunto: `${titulo} · Barbe City Jaraguá`,
    html,
    texto: `Seu código: ${codigo} (válido por ${validadeMin} minutos). Acesse: ${link}`,
  };
}

export function emailBoasVindas({ nome }) {
  return {
    assunto: 'Bem-vindo à Barbe City Jaraguá',
    html: layoutEmail({
      titulo: 'Sua conta está pronta',
      preheader: 'Bem-vindo à Barbe City Jaraguá',
      corpo: `
        <p>Olá, <strong style="color:${CORES.texto};">${escaparHtml(nome)}</strong>!</p>
        <p>Sua conta na Barbe City Jaraguá foi criada. Agora você pode agendar, acompanhar seus horários e consultar seu histórico.</p>
        <p style="text-align:center;">${botao('Agendar meu horário', `${config.baseUrl}/servicos.html`)}</p>
        <p style="font-size:13px;">Tradição e estilo em cada corte. Deus é fiel!</p>`,
    }),
    texto: `Olá, ${nome}! Sua conta na Barbe City Jaraguá foi criada. Acesse ${config.baseUrl}/servicos.html`,
  };
}

export function emailConfirmacaoAgendamento({ agendamento, servico, adicionais = [], pagamento }) {
  const itens = [servico.nome, ...adicionais.map((item) => item.nome)].join(' + ');
  const statusPagamento =
    pagamento?.status === 'pago' ? 'Pago' : pagamento?.status === 'na_hora' ? 'Pagar no local' : 'Aguardando Pix';
  return {
    assunto: `Agendamento confirmado · ${formatarDataHora(agendamento.data_hora_inicio)}`,
    html: layoutEmail({
      titulo: 'Seu horário está confirmado',
      preheader: `${itens} em ${formatarDataHora(agendamento.data_hora_inicio)}`,
      corpo: `
        <p>Olá, <strong style="color:${CORES.texto};">${escaparHtml(agendamento.nome_cliente)}</strong>! Seu agendamento foi registrado.</p>
        ${caixa([
          ['Código', `<span style="color:${CORES.dourado};letter-spacing:2px;">${escaparHtml(agendamento.codigo_publico)}</span>`],
          ['Serviço', escaparHtml(itens)],
          ['Data e hora', escaparHtml(formatarDataHora(agendamento.data_hora_inicio))],
          ['Duração', `${agendamento.duracao_min} minutos`],
          ['Valor', escaparHtml(formatarBRL(Number(agendamento.valor_original) - Number(agendamento.valor_desconto || 0)))],
          ['Pagamento', escaparHtml(`${pagamento?.metodo || 'a definir'} · ${statusPagamento}`)],
          ['Endereço', 'R. Jairo de Almeida Machado, 220 — Jaraguá, São Paulo/SP'],
        ])}
        <p>Guarde o código acima: com ele e seu telefone você consulta ou cancela o agendamento.</p>
        <p style="text-align:center;">${botao('Meu agendamento', `${config.baseUrl}/consultar.html`)}</p>
        <p style="font-size:13px;">Chegue com 10 minutos de antecedência. Até breve!</p>`,
    }),
    texto: `Agendamento confirmado: ${itens} em ${formatarDataHora(agendamento.data_hora_inicio)}. Código ${agendamento.codigo_publico}.`,
  };
}


export function emailNovoAgendamentoDono({ agendamento, servico, adicionais = [], pagamento }) {
  const itens = [servico.nome, ...adicionais.map((item) => item.nome)].join(' + ');
  return {
    assunto: `Novo agendamento · ${agendamento.nome_cliente} · ${formatarDataHora(agendamento.data_hora_inicio)}`,
    html: layoutEmail({
      titulo: 'Novo agendamento recebido',
      preheader: `${agendamento.nome_cliente} · ${formatarDataHora(agendamento.data_hora_inicio)}`,
      corpo: `
        ${caixa([
          ['Cliente', escaparHtml(agendamento.nome_cliente)],
          ['Telefone', escaparHtml(formatarTelefone(agendamento.telefone_cliente))],
          ['E-mail', escaparHtml(agendamento.email_cliente || 'não informado')],
          ['Serviço', escaparHtml(itens)],
          ['Data e hora', escaparHtml(formatarDataHora(agendamento.data_hora_inicio))],
          ['Valor', escaparHtml(formatarBRL(Number(agendamento.valor_original) - Number(agendamento.valor_desconto || 0)))],
          ['Pagamento', escaparHtml(`${pagamento?.metodo || 'a definir'} · ${pagamento?.status || 'pendente'}`)],
          ['Código', escaparHtml(agendamento.codigo_publico)],
        ])}
        <p style="text-align:center;">${botao('Abrir painel administrativo', `${config.baseUrl}/admin.html`)}</p>`,
    }),
    texto: `Novo agendamento: ${agendamento.nome_cliente} · ${itens} · ${formatarDataHora(agendamento.data_hora_inicio)}`,
  };
}

export function emailCancelamento({ agendamento, servico }) {
  return {
    assunto: `Agendamento cancelado · ${formatarDataHora(agendamento.data_hora_inicio)}`,
    html: layoutEmail({
      titulo: 'Agendamento cancelado',
      preheader: 'Seu horário foi cancelado',
      corpo: `
        <p>Olá, <strong style="color:${CORES.texto};">${escaparHtml(agendamento.nome_cliente)}</strong>. Seu agendamento foi cancelado.</p>
        ${caixa([
          ['Serviço', escaparHtml(servico?.nome || 'Serviço')],
          ['Data e hora', escaparHtml(formatarDataHora(agendamento.data_hora_inicio))],
          ['Código', escaparHtml(agendamento.codigo_publico)],
        ])}
        <p>Se quiser, você pode escolher um novo horário quando quiser.</p>
        <p style="text-align:center;">${botao('Agendar novamente', `${config.baseUrl}/servicos.html`)}</p>`,
    }),
    texto: `Seu agendamento de ${servico?.nome || 'serviço'} em ${formatarDataHora(agendamento.data_hora_inicio)} foi cancelado.`,
  };
}
