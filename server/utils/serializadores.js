import { pool } from '../config/db.js';
import { config } from '../config/env.js';
import { aplicarDesconto, statusPromocao } from './promocoes.js';
import { avatarDoServico } from './avatar.js';

/**
 * Converte as linhas do banco em objetos JSON amigáveis para o front-end.
 */
export function usuarioPublico(usuario) {
  if (!usuario) return null;
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone,
    role: usuario.role,
    emailVerificado: Boolean(usuario.email_verificado),
    ativo: Boolean(usuario.ativo),
    temSenha: Boolean(usuario.senha_hash),
    temGoogle: Boolean(usuario.google_id),
    criadoEm: usuario.criado_em,
    ultimoLoginEm: usuario.ultimo_login_em,
  };
}

export function servicoPublico(servico, { promocao = null, comercial = false } = {}) {
  if (!servico) return null;
  const precoOriginal = Number(servico.preco);
  const percentual = promocao ? Number(promocao.percentual) || 0 : 0;
  const precoFinal = percentual > 0 ? aplicarDesconto(precoOriginal, percentual) : precoOriginal;
  return {
    id: servico.id,
    slug: servico.slug,
    nome: servico.nome,
    descricao: servico.descricao,
    // `preco` é o valor cobrado: no site público já vem com desconto; no admin é o preço de tabela.
    preco: comercial ? precoFinal : precoOriginal,
    precoOriginal,
    precoFinal,
    descontoPercentual: percentual,
    promocao: promocao
      ? { id: promocao.id, rotulo: promocao.rotulo, percentual }
      : null,
    duracaoMin: servico.duracao_min,
    categoria: servico.categoria,
    icone: servico.icone,
    destaque: Boolean(servico.destaque),
    ativo: Boolean(servico.ativo),
    ordem: servico.ordem,
    legadoId: servico.legado_id,
    avatarTraits: servico.avatar_traits ?? null,
    avatar: avatarDoServico(servico),
  };
}

export function promocaoPublica(promocao, agora = new Date()) {
  if (!promocao) return null;
  return {
    id: promocao.id,
    rotulo: promocao.rotulo,
    percentual: Number(promocao.percentual),
    servicoId: promocao.servico_id ?? null,
    servicoNome: promocao.servico_nome ?? null,
    inicio: promocao.inicio,
    fim: promocao.fim,
    ativo: Boolean(promocao.ativo),
    status: statusPromocao(promocao, agora),
    criadoEm: promocao.criado_em,
  };
}

export function pagamentoPublico(pagamento) {
  if (!pagamento) return null;
  return {
    id: pagamento.id,
    metodo: pagamento.metodo,
    status: pagamento.status,
    valor: Number(pagamento.valor),
    notaDinheiro: pagamento.nota_dinheiro === null ? null : Number(pagamento.nota_dinheiro),
    trocoPix: Boolean(pagamento.troco_pix),
    trocoValor: pagamento.troco_valor === null ? null : Number(pagamento.troco_valor),
    pagarAgora: Boolean(pagamento.pagar_agora),
    pixCodigo: pagamento.pix_codigo,
    pixQrBase64: pagamento.pix_qr_base64,
    pixExpiracao: pagamento.pix_expiracao,
    pagoEm: pagamento.pago_em,
    criadoEm: pagamento.criado_em,
  };
}

export function agendamentoPublico(agendamento, { incluirContato = true } = {}) {
  if (!agendamento) return null;
  const base = {
    id: agendamento.id,
    codigo: agendamento.codigo_publico,
    status: agendamento.status,
    inicio: agendamento.data_hora_inicio,
    fim: agendamento.data_hora_fim,
    duracaoMin: agendamento.duracao_min,
    valorOriginal: Number(agendamento.valor_original),
    valorDesconto: Number(agendamento.valor_desconto || 0),
    valorPago: Number(agendamento.valor_pago),
    promocaoRotulo: agendamento.promocao_rotulo || null,
    promocao: agendamento.promocao_detalhes || null,
    avatar: agendamento.avatar || null,
    observacao: agendamento.observacao,
    origem: agendamento.origem,
    criadoEm: agendamento.criado_em,
    servico: agendamento.servico_id
      ? {
          id: agendamento.servico_id,
          nome: agendamento.servico_nome,
          slug: agendamento.servico_slug,
          icone: agendamento.servico_icone,
        }
      : null,
    adicionais: Array.isArray(agendamento.adicionais) ? agendamento.adicionais : [],
    pagamento: agendamento.pagamento_id
      ? {
          id: agendamento.pagamento_id,
          metodo: agendamento.pagamento_metodo,
          status: agendamento.pagamento_status,
          valor: Number(agendamento.pagamento_valor),
        }
      : null,
  };
  if (incluirContato) {
    base.nomeCliente = agendamento.nome_cliente;
    base.emailCliente = agendamento.email_cliente;
    base.telefoneCliente = agendamento.telefone_cliente;
  }
  return base;
}

export function configPublica(configuracoes) {
  return {
    nome: configuracoes.nome_barbearia || config.barberia.nome,
    slogan: configuracoes.slogan || 'Tradição e estilo em cada corte.',
    subtitulo: configuracoes.subtitulo || 'Barbearia Premium',
    sobre: configuracoes.sobre || '',
    endereco: configuracoes.endereco || config.barberia.endereco,
    telefone: configuracoes.telefone || config.barberia.telefone,
    whatsapp: configuracoes.whatsapp || config.whatsapp.numero,
    emailContato: configuracoes.email_contato || config.brevo.remetenteEmail,
    horarioTexto: configuracoes.horario_texto || 'Ter a Sex: 13h às 20h · Sáb e Dom: 09h às 20h',
    mapaUrl: configuracoes.mapa_url || '',
    versiculo: configuracoes.versiculo || 'Deus é fiel',
    versiculoRef: configuracoes.versiculo_ref || 'Atos 17:28',
    versiculoTexto:
      configuracoes.versiculo_texto ||
      'Porque nele vivemos, e nos movemos, e existimos.',
    instagram: configuracoes.instagram || '',
    googleAtivo: Boolean(config.google.clientId && config.google.clientSecret),
    pixAtivo: Boolean(config.pix.accessToken),
    whatsappApiAtiva: Boolean(config.whatsapp.token && config.whatsapp.phoneNumberId),
    slotMinutos: config.slotMinutos,
    agendamentoMaxDias: config.agendamentoMaxDias,
  };
}

export async function carregarConfiguracoes() {
  const resultado = await pool.query('SELECT chave, valor FROM configuracoes');
  return Object.fromEntries(resultado.rows.map((linha) => [linha.chave, linha.valor]));
}

export async function registrarLog({ adminId = null, acao, entidade = null, entidadeId = null, detalhes = null, ip = null }) {
  try {
    await pool.query(
      `INSERT INTO logs_admin (admin_id, acao, entidade, entidade_id, detalhes, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, acao, entidade, entidadeId, detalhes ? JSON.stringify(detalhes) : null, ip],
    );
  } catch (erro) {
    console.error('[log-admin] falha ao registrar:', erro.message);
  }
}

export function obterIp(req) {
  return (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
}
