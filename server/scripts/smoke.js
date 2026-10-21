import { config } from '../config/env.js';
import { pool, encerrarPool } from '../config/db.js';

const BASE = `http://localhost:${config.porta}`;
const cookies = new Map();

function guardarCookies(resposta) {
  const lista = resposta.headers.getSetCookie?.() || [];
  for (const cookie of lista) {
    const [par] = cookie.split(';');
    const [nome, ...resto] = par.split('=');
    cookies.set(nome.trim(), resto.join('='));
  }
}

function cabecalhos(extra = {}) {
  const cookie = [...cookies.entries()].map(([nome, valor]) => `${nome}=${valor}`).join('; ');
  return {
    Accept: 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
    'X-CSRF-Token': cookies.get('bcity_csrf') || '',
    ...extra,
  };
}

async function requisitar(caminho, opcoes = {}) {
  const headers = cabecalhos(opcoes.headers || {});
  if (opcoes.body !== undefined) headers['Content-Type'] = 'application/json';
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: opcoes.method || 'GET',
    headers,
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
    redirect: 'manual',
  });
  guardarCookies(resposta);
  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = texto;
  }
  if (!resposta.ok) {
    throw new Error(`[${resposta.status}] ${opcoes.method || 'GET'} ${caminho}: ${dados?.erro || texto}`);
  }
  return dados;
}

function mesSeguinte() {
  const agora = new Date();
  const data = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 15));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function main() {
  const resultados = [];
  const registrar = (nome, valor) => {
    resultados.push({ nome, valor });
    console.log(`✓ ${nome}: ${typeof valor === 'object' ? JSON.stringify(valor) : valor}`);
  };

  const health = await requisitar('/api/health');
  if (!health.ok) throw new Error('Banco offline no health check');
  registrar('health', { banco: health.banco, ambiente: health.ambiente });

  const publico = await requisitar('/api/config/publica');
  if (!publico?.configuracao?.nome) throw new Error('Configuração pública vazia');
  registrar('configuração pública', publico.configuracao.nome);

  const servicos = await requisitar('/api/servicos');
  if (!servicos.servicos?.length) throw new Error('Nenhum serviço ativo');
  registrar('serviços ativos', servicos.servicos.length);

  const corte = servicos.servicos.find((item) => item.slug === 'corte') || servicos.servicos[0];
  const mes = mesSeguinte();
  const disponibilidadeMes = await requisitar(
    `/api/agendamentos/disponibilidade/mes?servico_id=${corte.id}&mes=${mes}`,
  );
  registrar('dias no mês', disponibilidadeMes.dias.length);

  let dia = null;
  let slot = null;
  for (const candidato of disponibilidadeMes.dias) {
    if (!candidato.aberto || candidato.disponiveis === 0) continue;
    const diaDados = await requisitar(
      `/api/agendamentos/disponibilidade?servico_id=${corte.id}&data=${candidato.data}`,
    );
    const livre = diaDados.slots.find((item) => item.disponivel);
    if (livre) {
      dia = candidato.data;
      slot = livre.hora;
      break;
    }
  }
  if (!dia || !slot) throw new Error('Nenhum horário disponível no próximo mês');
  registrar('horário disponível', `${dia} ${slot}`);

  const criado = await requisitar('/api/agendamentos', {
    method: 'POST',
    body: {
      servico_id: corte.id,
      data: dia,
      hora: slot,
      nome: 'Teste Automatizado',
      telefone: '(11) 99999-9999',
      email: 'teste@example.com',
      aceitePrivacidade: true,
      pagamento: { metodo: 'dinheiro', notaDinheiro: 100, trocoPix: true },
    },
  });
  const codigo = criado.agendamento.codigo;
  registrar('agendamento criado', { codigo, status: criado.agendamento.status, valor: criado.agendamento.valorOriginal });

  const consulta = await requisitar(
    `/api/agendamentos/consulta?codigo=${codigo}&telefone=${encodeURIComponent('(11) 99999-9999')}`,
  );
  registrar('consulta pública', consulta.agendamento.codigo);

  const cancelado = await requisitar('/api/agendamentos/consulta/cancelar', {
    method: 'POST',
    body: {
      codigo,
      telefone: '(11) 99999-9999',
      motivo: 'Teste automatizado',
    },
  });
  registrar('cancelamento', cancelado.agendamento.status);

  const login = await requisitar('/api/auth/login', {
    method: 'POST',
    body: { email: config.admin.email, senha: config.admin.senha },
  });
  if (login.usuario.role !== 'admin') throw new Error('Login não retornou admin');
  registrar('login admin', login.usuario.email);

  const dashboard = await requisitar('/api/admin/dashboard');
  registrar('dashboard', { hoje: dashboard.contagens.hoje, ativos: dashboard.contagens.ativos });

  const financeiro = await requisitar('/api/admin/financeiro');
  registrar('financeiro', financeiro.resumo);

  const adminServicos = await requisitar('/api/admin/servicos');
  registrar('admin serviços', adminServicos.servicos.length);

  const adminUsuarios = await requisitar('/api/admin/usuarios');
  registrar('admin usuários', adminUsuarios.total);

  const adminAgendamentos = await requisitar('/api/admin/agendamentos?limite=5');
  registrar('admin agendamentos', adminAgendamentos.total);

  const horarios = await requisitar('/api/admin/horarios');
  registrar('horários', horarios.horarios.length);

  const notificacoes = await requisitar('/api/admin/notificacoes');
  registrar('notificações', notificacoes.notificacoes.length);

  await pool.query('DELETE FROM agendamentos WHERE codigo_publico = $1', [codigo]);
  console.log('✓ agendamento de teste removido');

  console.log(`\nSMOKE_OK ${resultados.length} verificações`);
}

main()
  .catch((erro) => {
    console.error('SMOKE_FALHOU:', erro.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await encerrarPool();
  });
