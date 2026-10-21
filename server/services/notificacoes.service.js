import { pool } from '../config/db.js';
import { config } from '../config/env.js';
import {
  emailCancelamento,
  emailConfirmacaoAgendamento,
  emailNovoAgendamentoDono,
  enviarEmail,
} from './brevo.service.js';
import { notificarCancelamento, notificarNovoAgendamento } from './whatsapp.service.js';

async function registrarEmail({ agendamentoId, destino, assunto, resultado }) {
  try {
    await pool.query(
      `INSERT INTO notificacoes
         (agendamento_id, canal, destino, status, assunto, erro, enviado_em)
       VALUES ($1, 'email', $2, $3, $4, $5, $6)`,
      [
        agendamentoId,
        destino,
        resultado.enviado ? 'enviado' : 'falhou',
        assunto,
        resultado.enviado ? null : resultado.motivo || null,
        resultado.enviado ? new Date() : null,
      ],
    );
  } catch (erro) {
    console.error('[notificacoes] falha ao registrar e-mail:', erro.message);
  }
}

export async function enviarEmailsDoAgendamento({ agendamento, servico, adicionais, pagamento }) {
  const cliente = emailConfirmacaoAgendamento({ agendamento, servico, adicionais, pagamento });
  const dono = emailNovoAgendamentoDono({ agendamento, servico, adicionais, pagamento });
  const envios = [];
  if (agendamento.email_cliente) {
    envios.push(
      enviarEmail({
        para: agendamento.email_cliente,
        nome: agendamento.nome_cliente,
        ...cliente,
      }).then((resultado) =>
        registrarEmail({
          agendamentoId: agendamento.id,
          destino: agendamento.email_cliente,
          assunto: cliente.assunto,
          resultado,
        }),
      ),
    );
  }
  const destinoDono = config.donoEmail || config.brevo.remetenteEmail;
  if (destinoDono) {
    envios.push(
      enviarEmail({
        para: destinoDono,
        nome: 'Barbe City Jaraguá',
        ...dono,
      }).then((resultado) =>
        registrarEmail({
          agendamentoId: agendamento.id,
          destino: destinoDono,
          assunto: dono.assunto,
          resultado,
        }),
      ),
    );
  }
  await Promise.allSettled(envios);
}

export async function notificarNovoAgendamentoCompleto({ agendamento, servicos, pagamento }) {
  const [whatsapp] = await Promise.allSettled([
    notificarNovoAgendamento({
      agendamento,
      servico: servicos.principal,
      adicionais: servicos.adicionais,
      pagamento,
    }),
    enviarEmailsDoAgendamento({
      agendamento,
      servico: servicos.principal,
      adicionais: servicos.adicionais,
      pagamento,
    }),
  ]);

  return whatsapp.status === 'fulfilled' ? whatsapp.value : { enviado: false, link: null };
}

export async function notificarCancelamentoCompleto({ agendamento, servico, motivo }) {
  const email = emailCancelamento({ agendamento, servico });
  const resultados = await Promise.allSettled([
    notificarCancelamento({ agendamento, motivo }),
    agendamento.email_cliente
      ? enviarEmail({
          para: agendamento.email_cliente,
          nome: agendamento.nome_cliente,
          ...email,
        }).then((resultado) =>
          registrarEmail({
            agendamentoId: agendamento.id,
            destino: agendamento.email_cliente,
            assunto: email.assunto,
            resultado,
          }),
        )
      : Promise.resolve(),
  ]);
  const whatsapp = resultados[0];
  return whatsapp.status === 'fulfilled' ? whatsapp.value : { enviado: false, link: null };
}
