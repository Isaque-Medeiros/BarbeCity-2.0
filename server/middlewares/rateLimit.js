import rateLimit from 'express-rate-limit';

function limiter({ janelaMinutos, maximo, mensagem, chaveExtra = '' }) {
  return rateLimit({
    windowMs: janelaMinutos * 60 * 1000,
    max: maximo,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}|${chaveExtra}`,
    handler: (req, res) => {
      res.status(429).json({
        erro: mensagem || 'Muitas requisições. Aguarde alguns minutos e tente novamente.',
        codigo: 'muitas_requisicoes',
      });
    },
  });
}

export const limitadorGlobal = limiter({
  janelaMinutos: 15,
  maximo: 600,
  mensagem: 'Muitas requisições. Aguarde alguns minutos.',
});

export const limitadorLogin = limiter({
  janelaMinutos: 15,
  maximo: 25,
  mensagem: 'Muitas tentativas de acesso. Aguarde 15 minutos.',
  chaveExtra: 'auth',
});

export const limitadorEmail = limiter({
  janelaMinutos: 60,
  maximo: 6,
  mensagem: 'Muitos pedidos de código. Aguarde uma hora.',
  chaveExtra: 'email',
});

export const limitadorAgendamento = limiter({
  janelaMinutos: 60,
  maximo: 20,
  mensagem: 'Muitos agendamentos em sequência. Aguarde um pouco.',
  chaveExtra: 'agenda',
});

export const limitadorConsulta = limiter({
  janelaMinutos: 15,
  maximo: 40,
  mensagem: 'Muitas consultas. Aguarde alguns minutos.',
  chaveExtra: 'consulta',
});

export const limitadorWebhook = limiter({
  janelaMinutos: 1,
  maximo: 120,
  mensagem: 'Limite de webhooks excedido.',
  chaveExtra: 'webhook',
});

export const limitadorGeracaoIA = limiter({
  janelaMinutos: 60,
  maximo: 10,
  mensagem: 'Muitas gerações de tema em sequência. Aguarde alguns minutos.',
  chaveExtra: 'ia',
});
