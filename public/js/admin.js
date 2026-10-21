import { api } from './api.js';
import {
  brl,
  carregarSessao,
  dataSP,
  escapar,
  formatarDataHora,
  formatarTelefone,
  horaSP,
  icone,
  rotuloMetodo,
  state,
  statusInfo,
} from './core.js';
import { abrirModal, confirmar, definirCarregando, toast } from './ui.js';
import { avatarMini } from './avatar-barbearia.js';

const SECOES = [
  { id: 'dashboard', rotulo: 'Visão geral', icone: 'home' },
  { id: 'agendamentos', rotulo: 'Agendamentos', icone: 'calendar' },
  { id: 'servicos', rotulo: 'Serviços', icone: 'scissors' },
  { id: 'promocoes', rotulo: 'Promoções', icone: 'cash' },
  { id: 'tema', rotulo: 'Tema do site (IA)', icone: 'sparkles' },
  { id: 'usuarios', rotulo: 'Usuários', icone: 'users' },
  { id: 'financeiro', rotulo: 'Financeiro', icone: 'wallet' },
  { id: 'horarios', rotulo: 'Horários', icone: 'clock' },
  { id: 'bloqueios', rotulo: 'Bloqueios', icone: 'ban' },
  { id: 'config', rotulo: 'Configurações', icone: 'settings' },
  { id: 'logs', rotulo: 'Logs', icone: 'list' },
  { id: 'notificacoes', rotulo: 'Notificações', icone: 'bell' },
];

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const TRAITS_AVATAR = [
  { id: 'cabelo', rotulo: 'Cabelo' },
  { id: 'barba', rotulo: 'Barba' },
  { id: 'sobrancelha', rotulo: 'Sobrancelha' },
  { id: 'luzes', rotulo: 'Luzes' },
  { id: 'tratamento', rotulo: 'Tratamento' },
];

const STATUS_PROMOCAO = {
  ativa: { rotulo: 'Ativa', classe: 'badge-success' },
  agendada: { rotulo: 'Agendada', classe: 'badge-warning' },
  expirada: { rotulo: 'Expirada', classe: 'badge-muted' },
  encerrada: { rotulo: 'Encerrada', classe: 'badge-muted' },
};

const estado = {
  secao: 'dashboard',
  agendamentos: { pagina: 1, status: '', de: '', ate: '', busca: '', ativos: false },
  usuarios: { pagina: 1, busca: '', role: '' },
  logs: { pagina: 1 },
  servicos: [],
  temaRascunho: null,
};

let alvoConteudo = null;

function renderizarNav() {
  const alvo = document.getElementById('admin-nav');
  if (!alvo) return;
  alvo.innerHTML = SECOES.map(
    (secao) => `
      <button type="button" data-secao="${secao.id}" class="${estado.secao === secao.id ? 'is-active' : ''}">
        ${icone(secao.icone)} <span>${secao.rotulo}</span>
      </button>`,
  ).join('');
  alvo.querySelectorAll('[data-secao]').forEach((botao) => {
    botao.addEventListener('click', () => carregarSecao(botao.dataset.secao));
  });
}

function cabecalho(titulo, descricao, acao = '') {
  return `
    <div class="admin-topo">
      <div>
        <h1>${escapar(titulo)}</h1>
        <p>${escapar(descricao)}</p>
      </div>
      ${acao}
    </div>`;
}

function carregando() {
  alvoConteudo.innerHTML =
    '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
}

async function carregarSecao(id) {
  estado.secao = id;
  renderizarNav();
  carregando();
  window.location.hash = id;
  try {
    if (id === 'dashboard') await secaoDashboard();
    else if (id === 'agendamentos') await secaoAgendamentos();
    else if (id === 'servicos') await secaoServicos();
    else if (id === 'promocoes') await secaoPromocoes();
    else if (id === 'tema') await secaoTema();
    else if (id === 'usuarios') await secaoUsuarios();
    else if (id === 'financeiro') await secaoFinanceiro();
    else if (id === 'horarios') await secaoHorarios();
    else if (id === 'bloqueios') await secaoBloqueios();
    else if (id === 'config') await secaoConfig();
    else if (id === 'logs') await secaoLogs();
    else if (id === 'notificacoes') await secaoNotificacoes();
  } catch (erro) {
    alvoConteudo.innerHTML = `<div class="empty"><h3>Erro ao carregar</h3><p>${escapar(erro.message)}</p><button class="btn btn-primary" data-recarregar>Tentar novamente</button></div>`;
    alvoConteudo.querySelector('[data-recarregar]')?.addEventListener('click', () => carregarSecao(id));
    if (erro.status === 401 || erro.status === 403) {
      toast('Sua sessão de administrador expirou. Entre novamente.', 'aviso', 6000);
    }
  }
}

async function secaoDashboard() {
  const [dados, financeiro] = await Promise.all([api.get('/admin/dashboard'), api.get('/admin/financeiro')]);
  const c = dados.contagens;
  const f = financeiro.resumo;
  alvoConteudo.innerHTML = `
    ${cabecalho('Visão geral', 'O pulso da barbearia em tempo real.', `<button class="btn btn-primary btn-sm" data-novo-agendamento>${icone('plus')} Novo agendamento</button>`)}
    <div class="grid-kpis">
      <div class="kpi-card gold"><span>${icone('calendar')} Hoje</span><strong>${c.hoje}</strong><small>atendimentos na agenda</small></div>
      <div class="kpi-card"><span>${icone('clock')} Próximos</span><strong>${c.ativos}</strong><small>pendentes ou confirmados</small></div>
      <div class="kpi-card green"><span>${icone('wallet')} Receita do mês</span><strong>${brl(f.receitaConciliada)}</strong><small>pagamentos confirmados</small></div>
      <div class="kpi-card"><span>${icone('cash')} A receber</span><strong>${brl(f.aReceber)}</strong><small>no local ou Pix pendente</small></div>
    </div>
    <div class="admin-grid-2">
      <div class="admin-card">
        <h3>Agenda de hoje</h3>
        ${dados.hoje.length ? dados.hoje.map((item) => `
          <div class="linha-lista">
            <div>
              <strong>${escapar(item.nome_cliente)} · ${escapar(item.servico)}</strong>
              <span>${escapar(formatarDataHora(item.data_hora_inicio))} · ${escapar(formatarTelefone(item.telefone_cliente))}</span>
            </div>
            <div style="text-align:right;">
              <span class="badge ${statusInfo(item.status).classe}">${statusInfo(item.status).rotulo}</span>
              <div class="muted" style="font-size:.78rem;">
                ${brl(Number(item.valor_original) - Number(item.valor_desconto || 0))}
                ${Number(item.valor_desconto) > 0 ? `<span class="badge badge-danger" style="font-size:.6rem;">-${brl(item.valor_desconto)}</span>` : ''}
              </div>
            </div>
          </div>`).join('') : '<p class="muted">Nenhum atendimento marcado para hoje.</p>'}
      </div>
      <div class="admin-card">
        <h3>Pagamentos pendentes</h3>
        ${dados.pagamentosPendentes.length ? dados.pagamentosPendentes.map((item) => `
          <div class="linha-lista">
            <div>
              <strong>${escapar(item.nome_cliente)}</strong>
              <span>${escapar(item.servico)} · ${escapar(formatarDataHora(item.data_hora_inicio))}</span>
            </div>
            <div style="text-align:right;">
              <div class="muted">${brl(Number(item.valor_original) - Number(item.valor_desconto || 0))}</div>
              <span class="badge ${statusInfo(item.pagamento_status).classe}">${statusInfo(item.pagamento_status).rotulo}</span>
            </div>
          </div>`).join('') : '<p class="muted">Nenhum pagamento pendente.</p>'}
      </div>
    </div>
    <div class="admin-grid-2" style="margin-top:16px;">
      <div class="admin-card">
        <h3>Resumo rápido</h3>
        <div class="grid-kpis" style="grid-template-columns:repeat(3,1fr);margin:0;">
          <div><span class="label">Concluídos</span><strong>${c.concluidos}</strong></div>
          <div><span class="label">Cancelados</span><strong>${c.cancelados}</strong></div>
          <div><span class="label">Ausentes</span><strong>${c.ausentes}</strong></div>
          <div><span class="label">Usuários</span><strong>${dados.usuarios.total}</strong></div>
          <div><span class="label">Admins</span><strong>${dados.usuarios.admins}</strong></div>
          <div><span class="label">Total</span><strong>${c.total}</strong></div>
          <div><span class="label">Descontos no mês</span><strong>${brl(f.descontosConcedidos)}</strong></div>
        </div>
      </div>
      <div class="admin-card">
        <h3>Histórico legado</h3>
        <p class="muted" style="font-size:.84rem;">Receita estimada dos atendimentos concluídos sem pagamento conciliado.</p>
        <strong style="font-family:var(--font-display);font-size:1.8rem;color:var(--gold);">${brl(f.historicoEstimado)}</strong>
        <p class="hint" style="margin-top:8px;">${c.ausentes} ausência(s) registrada(s) no histórico.</p>
      </div>
    </div>`;
  alvoConteudo.querySelector('[data-novo-agendamento]')?.addEventListener('click', abrirNovoAgendamento);
}

async function secaoAgendamentos() {
  const { pagina, status, de, ate, busca, ativos } = estado.agendamentos;
  const params = new URLSearchParams({ pagina, limite: 20 });
  if (status) params.set('status', status);
  if (de) params.set('de', de);
  if (ate) params.set('ate', ate);
  if (busca) params.set('busca', busca);
  if (ativos) params.set('ativos', '1');
  const dados = await api.get(`/admin/agendamentos?${params.toString()}`);

  alvoConteudo.innerHTML = `
    ${cabecalho('Agendamentos', `${dados.total} registro(s) encontrados.`, `<button class="btn btn-primary btn-sm" data-novo-agendamento>${icone('plus')} Novo agendamento</button>`)}
    <form class="filtros" id="filtros-agendamentos">
      <div class="field" style="min-width:170px;">
        <label class="label">Buscar</label>
        <input class="input" name="busca" value="${escapar(busca)}" placeholder="Nome, telefone, código">
      </div>
      <div class="field">
        <label class="label">Status</label>
        <select class="select" name="status">
          <option value="">Todos</option>
          ${['pendente', 'confirmado', 'concluido', 'cancelado', 'ausente']
            .map((item) => `<option value="${item}" ${status === item ? 'selected' : ''}>${statusInfo(item).rotulo}</option>`)
            .join('')}
        </select>
      </div>
      <div class="field"><label class="label">De</label><input class="input" type="date" name="de" value="${escapar(de)}"></div>
      <div class="field"><label class="label">Até</label><input class="input" type="date" name="ate" value="${escapar(ate)}"></div>
      <label class="checkbox" style="padding-bottom:9px;"><input type="checkbox" name="ativos" ${ativos ? 'checked' : ''}> Somente ativos</label>
      <button type="submit" class="btn btn-ghost">${icone('filter')} Filtrar</button>
      <button type="button" class="btn btn-outline" data-limpar>Limpar</button>
    </form>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Cliente</th><th>Contato</th><th>Serviço</th><th>Data</th><th>Valor</th><th>Status</th><th style="text-align:right;">Ações</th></tr></thead>
        <tbody>
          ${dados.itens.length ? dados.itens.map((item) => {
            const pagamento = item.pagamento_status ? statusInfo(item.pagamento_status) : null;
            return `
              <tr>
                <td>
                  <strong>${escapar(item.nome_cliente)}</strong>
                  <div class="muted" style="font-size:.72rem;letter-spacing:1px;">${escapar(item.codigo_publico)}</div>
                </td>
                <td>
                  <div>${escapar(formatarTelefone(item.telefone_cliente))}</div>
                  <div class="muted" style="font-size:.75rem;">${escapar(item.email_cliente || 'sem e-mail')}</div>
                </td>
                <td>
                  <div class="servico-celula">
                    ${avatarMini(item)}
                    <div>
                      <div>${escapar(item.servico_nome)}</div>
                      ${item.adicionais?.length ? `<div class="muted" style="font-size:.72rem;">+ ${escapar(item.adicionais.map((extra) => extra.nome).join(' + '))}</div>` : ''}
                    </div>
                  </div>
                </td>
                <td>
                  <div>${escapar(formatarDataHora(item.data_hora_inicio))}</div>
                  <div class="muted" style="font-size:.72rem;">${item.duracao_min} min</div>
                </td>
                <td>
                  <div>${brl(Number(item.valor_original) - Number(item.valor_desconto || 0))}</div>
                  ${Number(item.valor_desconto) > 0 ? `<div class="muted" style="font-size:.7rem;"><s>${brl(item.valor_original)}</s> -${brl(item.valor_desconto)}</div>` : ''}
                  ${pagamento ? `<span class="badge ${pagamento.classe}" style="font-size:.6rem;">${pagamento.rotulo}</span>` : ''}
                </td>
                <td>
                  <select class="select" data-status-id="${item.id}" style="min-height:32px;padding:6px 8px;font-size:.76rem;">
                    ${['pendente', 'confirmado', 'concluido', 'cancelado', 'ausente']
                      .map((opcao) => `<option value="${opcao}" ${item.status === opcao ? 'selected' : ''}>${statusInfo(opcao).rotulo}</option>`)
                      .join('')}
                  </select>
                </td>
                <td>
                  <div class="acoes">
                    ${item.pagamento_status && item.pagamento_status !== 'pago' ? `<button class="btn-icon" data-pagar="${item.id}" title="Confirmar pagamento">${icone('cash')}</button>` : ''}
                    <button class="btn-icon" data-reagendar="${item.id}" data-data="${escapar(item.data_hora_inicio)}" title="Reagendar">${icone('calendar')}</button>
                    <a class="btn-icon" href="https://wa.me/${String(item.telefone_cliente || '').replace(/\D/g, '')}" target="_blank" rel="noopener" title="WhatsApp">${icone('whatsapp')}</a>
                  </div>
                </td>
              </tr>`;
          }).join('') : `<tr><td colspan="7">${estadoVazio({ icone: 'calendar', titulo: 'Nenhum agendamento', texto: 'Ajuste os filtros ou crie um agendamento manual.' })}</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="paginacao">
      <span>Página ${dados.pagina} de ${dados.paginas} · ${dados.total} registros</span>
      <div class="botoes">
        <button class="btn btn-sm btn-ghost" data-pagina="${dados.pagina - 1}" ${dados.pagina <= 1 ? 'disabled' : ''}>${icone('chevron-left')} Anterior</button>
        <button class="btn btn-sm btn-ghost" data-pagina="${dados.pagina + 1}" ${dados.pagina >= dados.paginas ? 'disabled' : ''}>Próxima ${icone('chevron-right')}</button>
      </div>
    </div>`;

  const filtros = document.getElementById('filtros-agendamentos');
  filtros.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const valores = Object.fromEntries(new FormData(filtros).entries());
    estado.agendamentos = {
      pagina: 1,
      status: valores.status || '',
      de: valores.de || '',
      ate: valores.ate || '',
      busca: valores.busca || '',
      ativos: Boolean(valores.ativos),
    };
    carregarSecao('agendamentos');
  });
  alvoConteudo.querySelector('[data-limpar]')?.addEventListener('click', () => {
    estado.agendamentos = { pagina: 1, status: '', de: '', ate: '', busca: '', ativos: false };
    carregarSecao('agendamentos');
  });
  alvoConteudo.querySelectorAll('[data-pagina]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const novaPagina = Number(botao.dataset.pagina);
      if (novaPagina < 1 || novaPagina > dados.paginas) return;
      estado.agendamentos.pagina = novaPagina;
      carregarSecao('agendamentos');
    });
  });
  alvoConteudo.querySelectorAll('[data-status-id]').forEach((select) => {
    select.addEventListener('change', async () => {
      try {
        await api.patch(`/admin/agendamentos/${select.dataset.statusId}/status`, { status: select.value });
        toast('Status atualizado.', 'sucesso');
      } catch (erro) {
        toast(erro.message, 'erro');
        carregarSecao('agendamentos');
      }
    });
  });
  alvoConteudo.querySelectorAll('[data-reagendar]').forEach((botao) => {
    botao.addEventListener('click', () => abrirReagendamento(botao.dataset.reagendar, botao.dataset.data));
  });
  alvoConteudo.querySelectorAll('[data-pagar]').forEach((botao) => {
    botao.addEventListener('click', () => abrirConfirmarPagamento(botao.dataset.pagar));
  });
  alvoConteudo.querySelector('[data-novo-agendamento]')?.addEventListener('click', abrirNovoAgendamento);
}

function abrirReagendamento(id, dataHora) {
  const overlay = abrirModal({
    titulo: 'Reagendar atendimento',
    conteudo: `
      <form id="form-reagendar" class="form-grade">
        <div class="field"><label class="label">Nova data</label><input class="input" type="date" name="data" value="${escapar(dataSP(dataHora))}" required></div>
        <div class="field"><label class="label">Novo horário</label><input class="input" type="time" name="hora" value="${escapar(horaSP(dataHora))}" required></div>
        <div class="campo-largo modal-actions">
          <button type="button" class="btn btn-ghost" data-fechar-modal>Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar novo horário</button>
        </div>
      </form>`,
  });
  overlay.querySelector('[data-fechar-modal]').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#form-reagendar').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const botao = form.querySelector('button[type="submit"]');
    definirCarregando(botao, true, 'Salvando...');
    try {
      await api.patch(`/admin/agendamentos/${id}/reagendar`, { data: form.data.value, hora: form.hora.value });
      toast('Horário reagendado.', 'sucesso');
      overlay.remove();
      carregarSecao('agendamentos');
    } catch (erro) {
      definirCarregando(botao, false);
      toast(erro.message, 'erro', 6000);
    }
  });
}

async function abrirConfirmarPagamento(id) {
  let agendamento;
  try {
    const dados = await api.get(`/admin/agendamentos/${id}`);
    agendamento = dados.agendamento;
  } catch (erro) {
    toast(erro.message, 'erro');
    return;
  }
  const overlay = abrirModal({
    titulo: 'Confirmar pagamento',
    conteudo: `
      <p class="modal-text">${escapar(agendamento.nome_cliente)} · ${escapar(agendamento.servico_nome)} · ${brl(Number(agendamento.valor_original) - Number(agendamento.valor_desconto || 0))}</p>
      <form id="form-pagamento-admin">
        <div class="field">
          <label class="label">Forma de pagamento</label>
          <select class="select" name="metodo">
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="cartao">Cartão</option>
            <option value="legado">Legado / conciliação</option>
          </select>
        </div>
        <div class="field"><label class="label">Valor recebido</label><input class="input" name="valor" type="number" step="0.01" min="0" value="${Math.max(0, Number(agendamento.valor_original) - Number(agendamento.valor_desconto || 0)).toFixed(2)}" required></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-fechar-modal>Cancelar</button>
          <button type="submit" class="btn btn-primary">${icone('check')} Confirmar pagamento</button>
        </div>
      </form>`,
  });
  overlay.querySelector('[data-fechar-modal]').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#form-pagamento-admin').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    try {
      await api.post(`/admin/agendamentos/${id}/confirmar-pagamento`, {
        metodo: form.metodo.value,
        valor: Number(form.valor.value),
      });
      toast('Pagamento confirmado.', 'sucesso');
      overlay.remove();
      carregarSecao(estado.secao);
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  });
}

async function abrirNovoAgendamento() {
  let servicos = [];
  try {
    const dados = await api.get('/servicos');
    servicos = dados.servicos || [];
  } catch (erro) {
    toast(erro.message, 'erro');
    return;
  }
  const overlay = abrirModal({
    titulo: 'Novo agendamento manual',
    largura: 'modal-largo',
    conteudo: `
      <form id="form-novo-agendamento" class="form-grade">
        <div class="field campo-largo">
          <label class="label">Serviço</label>
          <select class="select" name="servico_id" required>
            ${servicos.map((servico) => `<option value="${servico.id}">${escapar(servico.nome)} · ${brl(servico.preco)} · ${servico.duracaoMin} min</option>`).join('')}
          </select>
        </div>
        <div class="field"><label class="label">Data</label><input class="input" type="date" name="data" required></div>
        <div class="field"><label class="label">Hora</label><input class="input" type="time" name="hora" required></div>
        <div class="field campo-largo"><label class="label">Nome do cliente</label><input class="input" name="nome" required minlength="2"></div>
        <div class="field"><label class="label">Telefone</label><input class="input" name="telefone" required placeholder="(11) 99999-9999"></div>
        <div class="field"><label class="label">E-mail (opcional)</label><input class="input" name="email" type="email"></div>
        <div class="field campo-largo"><label class="label">Observação</label><textarea class="textarea" name="observacao" maxlength="400"></textarea></div>
        <div class="field"><label class="label">Pagamento</label><select class="select" name="metodo"><option value="dinheiro">Dinheiro (no local)</option><option value="cartao">Cartão (no local)</option><option value="pix">Pix (no local)</option></select></div>
        <div class="field"><label class="label">Status</label><select class="select" name="status"><option value="confirmado">Confirmado</option><option value="pendente">Pendente</option></select></div>
        <div class="campo-largo modal-actions">
          <button type="button" class="btn btn-ghost" data-fechar-modal>Cancelar</button>
          <button type="submit" class="btn btn-primary">${icone('calendar')} Criar agendamento</button>
        </div>
      </form>`,
  });
  overlay.querySelector('[data-fechar-modal]').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#form-novo-agendamento').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const botao = form.querySelector('button[type="submit"]');
    definirCarregando(botao, true, 'Criando...');
    try {
      await api.post('/admin/agendamentos', {
        servico_id: form.servico_id.value,
        data: form.data.value,
        hora: form.hora.value,
        nome: form.nome.value,
        telefone: form.telefone.value,
        email: form.email.value || undefined,
        observacao: form.observacao.value || undefined,
        metodo: form.metodo.value,
        status: form.status.value,
      });
      toast('Agendamento criado.', 'sucesso');
      overlay.remove();
      carregarSecao('agendamentos');
    } catch (erro) {
      definirCarregando(botao, false);
      toast(erro.message, 'erro', 6000);
    }
  });
}

async function secaoServicos() {
  const dados = await api.get('/admin/servicos');
  estado.servicos = dados.servicos || [];
  alvoConteudo.innerHTML = `
    ${cabecalho('Serviços', 'Gerencie preços, duração, descrição e disponibilidade.', `<button class="btn btn-primary btn-sm" data-novo-servico>${icone('plus')} Novo serviço</button>`)}
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Serviço</th><th>Categoria</th><th>Preço</th><th>Duração</th><th>Agendamentos</th><th>Status</th><th style="text-align:right;">Ações</th></tr></thead>
        <tbody>
          ${estado.servicos.map((servico) => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span class="servico-icone" style="width:36px;height:36px;border-radius:10px;">${icone(servico.icone || 'scissors')}</span>
                  <div><strong>${escapar(servico.nome)}</strong><div class="muted" style="font-size:.72rem;">${escapar(servico.slug)}</div></div>
                </div>
              </td>
              <td>${escapar(servico.categoria)}</td>
              <td>${brl(servico.preco)}</td>
              <td>${servico.duracaoMin} min</td>
              <td>${servico.totalAgendamentos}</td>
              <td><span class="badge ${servico.ativo ? 'badge-success' : 'badge-muted'}">${servico.ativo ? 'Ativo' : 'Inativo'}</span></td>
              <td>
                <div class="acoes">
                  <button class="btn-icon" data-editar-servico="${servico.id}" title="Editar">${icone('edit')}</button>
                  <button class="btn-icon" data-excluir-servico="${servico.id}" title="Excluir">${icone('trash')}</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  alvoConteudo.querySelector('[data-novo-servico]')?.addEventListener('click', () => abrirServico());
  alvoConteudo.querySelectorAll('[data-editar-servico]').forEach((botao) => {
    botao.addEventListener('click', () => abrirServico(estado.servicos.find((item) => item.id === botao.dataset.editarServico)));
  });
  alvoConteudo.querySelectorAll('[data-excluir-servico]').forEach((botao) => {
    botao.addEventListener('click', () => excluirServico(botao.dataset.excluirServico));
  });
}

function abrirServico(servico = null) {
  const ehEdicao = Boolean(servico);
  const opcoesIcone = ['scissors', 'razor', 'eyebrow', 'combo', 'crown', 'highlights', 'droplet', 'flask', 'sparkles', 'star'];
  const overlay = abrirModal({
    titulo: ehEdicao ? 'Editar serviço' : 'Novo serviço',
    largura: 'modal-largo',
    conteudo: `
      <form id="form-servico" class="form-grade">
        <div class="field campo-largo"><label class="label">Nome</label><input class="input" name="nome" value="${escapar(servico?.nome || '')}" required maxlength="80"></div>
        <div class="field">
          <label class="label">Categoria</label>
          <select class="select" name="categoria">
            ${['individual', 'combo', 'outros'].map((categoria) => `<option value="${categoria}" ${servico?.categoria === categoria ? 'selected' : ''}>${categoria}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label class="label">Ícone</label>
          <select class="select" name="icone">
            ${opcoesIcone.map((nome) => `<option value="${nome}" ${servico?.icone === nome ? 'selected' : ''}>${nome}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label class="label">Preço (R$)</label><input class="input" name="preco" type="number" step="0.01" min="0" value="${Number(servico?.preco || 0).toFixed(2)}" required></div>
        <div class="field"><label class="label">Duração (min)</label><input class="input" name="duracaoMin" type="number" min="5" max="480" value="${servico?.duracaoMin || 30}" required></div>
        <div class="field"><label class="label">Ordem de exibição</label><input class="input" name="ordem" type="number" min="0" value="${servico?.ordem ?? 99}"></div>
        <div class="field campo-largo"><label class="label">Descrição</label><textarea class="textarea" name="descricao" maxlength="600">${escapar(servico?.descricao || '')}</textarea></div>
        <div class="field campo-largo">
          <label class="label">Avatar do serviço (opcional)</label>
          <div class="traits-grade">
            ${TRAITS_AVATAR.map((traco) => `
              <label class="checkbox">
                <input type="checkbox" name="traits" value="${traco.id}" ${servico?.avatarTraits?.[traco.id] ? 'checked' : ''}>
                ${traco.rotulo}
              </label>`).join('')}
          </div>
          <span class="hint">Deixe tudo desmarcado para o sistema detectar automaticamente pelo nome e ícone.</span>
        </div>
        <div class="field"><label class="checkbox"><input type="checkbox" name="destaque" ${servico?.destaque ? 'checked' : ''}> Destaque na página inicial</label></div>
        <div class="field"><label class="checkbox"><input type="checkbox" name="ativo" ${servico?.ativo !== false ? 'checked' : ''}> Serviço ativo</label></div>
        <div class="campo-largo modal-actions">
          <button type="button" class="btn btn-ghost" data-fechar-modal>Cancelar</button>
          <button type="submit" class="btn btn-primary">${icone('check')} Salvar serviço</button>
        </div>
      </form>`,
  });
  overlay.querySelector('[data-fechar-modal]').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#form-servico').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const botao = form.querySelector('button[type="submit"]');
    definirCarregando(botao, true, 'Salvando...');
    const traits = [...form.querySelectorAll('input[name="traits"]:checked')].map((input) => input.value);
    const payload = {
      nome: form.nome.value,
      categoria: form.categoria.value,
      icone: form.icone.value,
      preco: Number(form.preco.value),
      duracaoMin: Number(form.duracaoMin.value),
      ordem: Number(form.ordem.value),
      descricao: form.descricao.value,
      destaque: form.destaque.checked,
      ativo: form.ativo.checked,
      avatarTraits: traits.length ? traits : null,
    };
    try {
      if (ehEdicao) await api.put(`/admin/servicos/${servico.id}`, payload);
      else await api.post('/admin/servicos', payload);
      toast(ehEdicao ? 'Serviço atualizado.' : 'Serviço criado.', 'sucesso');
      overlay.remove();
      carregarSecao('servicos');
    } catch (erro) {
      definirCarregando(botao, false);
      toast(erro.message, 'erro', 6000);
    }
  });
}

async function excluirServico(id) {
  const servico = estado.servicos.find((item) => item.id === id);
  const confirmado = await confirmar({
    titulo: 'Excluir serviço',
    mensagem: `Deseja excluir "${servico?.nome || 'este serviço'}"? Se houver agendamentos, ele será apenas desativado.`,
    textoConfirmar: 'Excluir',
    perigo: true,
  });
  if (!confirmado) return;
  try {
    const dados = await api.delete(`/admin/servicos/${id}`);
    toast(dados.mensagem || 'Serviço excluído.', 'sucesso', 6000);
    carregarSecao('servicos');
  } catch (erro) {
    toast(erro.message, 'erro');
  }
}

async function secaoUsuarios() {
  const { pagina, busca, role } = estado.usuarios;
  const params = new URLSearchParams({ pagina, limite: 20 });
  if (busca) params.set('busca', busca);
  if (role) params.set('role', role);
  const dados = await api.get(`/admin/usuarios?${params.toString()}`);
  alvoConteudo.innerHTML = `
    ${cabecalho('Usuários', `${dados.total} conta(s) cadastrada(s).`)}
    <form class="filtros" id="filtros-usuarios">
      <div class="field" style="min-width:200px;"><label class="label">Buscar</label><input class="input" name="busca" value="${escapar(busca)}" placeholder="Nome, e-mail ou telefone"></div>
      <div class="field"><label class="label">Perfil</label><select class="select" name="role"><option value="">Todos</option><option value="cliente" ${role === 'cliente' ? 'selected' : ''}>Cliente</option><option value="admin" ${role === 'admin' ? 'selected' : ''}>Administrador</option></select></div>
      <button class="btn btn-ghost" type="submit">${icone('search')} Buscar</button>
    </form>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Usuário</th><th>Contato</th><th>Perfil</th><th>Agendamentos</th><th>Total pago</th><th>Status</th><th style="text-align:right;">Ações</th></tr></thead>
        <tbody>
          ${dados.usuarios.length ? dados.usuarios.map((usuario) => `
            <tr>
              <td><strong>${escapar(usuario.nome)}</strong><div class="muted" style="font-size:.72rem;">${escapar(usuario.email || 'sem e-mail')}</div></td>
              <td>${escapar(formatarTelefone(usuario.telefone || ''))}</td>
              <td>
                <select class="select" data-role-id="${usuario.id}" style="min-height:32px;padding:6px 8px;font-size:.76rem;">
                  <option value="cliente" ${usuario.role === 'cliente' ? 'selected' : ''}>Cliente</option>
                  <option value="admin" ${usuario.role === 'admin' ? 'selected' : ''}>Administrador</option>
                </select>
              </td>
              <td>${usuario.totalAgendamentos}</td>
              <td>${brl(usuario.totalPago)}</td>
              <td><span class="badge ${usuario.ativo ? 'badge-success' : 'badge-muted'}">${usuario.ativo ? 'Ativo' : 'Inativo'}</span></td>
              <td>
                <div class="acoes">
                  <button class="btn-icon" data-detalhe-usuario="${usuario.id}" title="Detalhes">${icone('eye')}</button>
                  <button class="btn-icon" data-ativo-usuario="${usuario.id}" data-ativo="${usuario.ativo}" title="${usuario.ativo ? 'Desativar' : 'Ativar'}">${icone(usuario.ativo ? 'ban' : 'check')}</button>
                  <button class="btn-icon" data-excluir-usuario="${usuario.id}" title="Excluir">${icone('trash')}</button>
                </div>
              </td>
            </tr>`).join('') : `<tr><td colspan="7">${estadoVazio({ icone: 'users', titulo: 'Nenhum usuário', texto: 'Nenhuma conta encontrada com esses filtros.' })}</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="paginacao">
      <span>Página ${dados.pagina} de ${dados.paginas} · ${dados.total} usuários</span>
      <div class="botoes">
        <button class="btn btn-sm btn-ghost" data-pagina="${dados.pagina - 1}" ${dados.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <button class="btn btn-sm btn-ghost" data-pagina="${dados.pagina + 1}" ${dados.pagina >= dados.paginas ? 'disabled' : ''}>Próxima</button>
      </div>
    </div>`;

  const filtros = document.getElementById('filtros-usuarios');
  filtros.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const valores = Object.fromEntries(new FormData(filtros).entries());
    estado.usuarios = { pagina: 1, busca: valores.busca || '', role: valores.role || '' };
    carregarSecao('usuarios');
  });
  alvoConteudo.querySelectorAll('[data-pagina]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const novaPagina = Number(botao.dataset.pagina);
      if (novaPagina < 1 || novaPagina > dados.paginas) return;
      estado.usuarios.pagina = novaPagina;
      carregarSecao('usuarios');
    });
  });
  alvoConteudo.querySelectorAll('[data-role-id]').forEach((select) => {
    select.addEventListener('change', async () => {
      try {
        await api.patch(`/admin/usuarios/${select.dataset.roleId}/role`, { role: select.value });
        toast('Permissão atualizada.', 'sucesso');
      } catch (erro) {
        toast(erro.message, 'erro');
        carregarSecao('usuarios');
      }
    });
  });
  alvoConteudo.querySelectorAll('[data-ativo-usuario]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      const ativar = botao.dataset.ativo !== 'true';
      try {
        await api.patch(`/admin/usuarios/${botao.dataset.ativoUsuario}/ativo`, { ativo: ativar });
        toast(ativar ? 'Usuário ativado.' : 'Usuário desativado.', 'sucesso');
        carregarSecao('usuarios');
      } catch (erro) {
        toast(erro.message, 'erro');
      }
    });
  });
  alvoConteudo.querySelectorAll('[data-detalhe-usuario]').forEach((botao) => {
    botao.addEventListener('click', () => abrirDetalheUsuario(botao.dataset.detalheUsuario));
  });
  alvoConteudo.querySelectorAll('[data-excluir-usuario]').forEach((botao) => {
    botao.addEventListener('click', () => excluirUsuario(botao.dataset.excluirUsuario));
  });
}

async function abrirDetalheUsuario(id) {
  let dados;
  try {
    dados = await api.get(`/admin/usuarios/${id}`);
  } catch (erro) {
    toast(erro.message, 'erro');
    return;
  }
  const u = dados.usuario;
  abrirModal({
    titulo: u.nome,
    largura: 'modal-largo',
    conteudo: `
      <div class="resumo" style="position:static;padding:0;border:0;background:transparent;">
        <div class="resumo-linha"><span>E-mail</span><strong>${escapar(u.email || '—')}</strong></div>
        <div class="resumo-linha"><span>Telefone</span><strong>${escapar(formatarTelefone(u.telefone || ''))}</strong></div>
        <div class="resumo-linha"><span>Perfil</span><strong>${escapar(u.role)}</strong></div>
        <div class="resumo-linha"><span>E-mail verificado</span><strong>${u.emailVerificado ? 'Sim' : 'Não'}</strong></div>
        <div class="resumo-linha"><span>Login Google</span><strong>${u.temGoogle ? 'Sim' : 'Não'}</strong></div>
        <div class="resumo-linha"><span>Criado em</span><strong>${escapar(formatarDataHora(u.criadoEm))}</strong></div>
        <div class="resumo-linha"><span>Último login</span><strong>${u.ultimoLoginEm ? escapar(formatarDataHora(u.ultimoLoginEm)) : '—'}</strong></div>
        <div class="resumo-linha"><span>Agendamentos</span><strong>${dados.resumo.total} (${dados.resumo.concluidos} concluídos)</strong></div>
        <div class="resumo-linha"><span>Total pago</span><strong>${brl(dados.resumo.total_pago)}</strong></div>
      </div>
      <h3 style="margin-top:20px;">Últimos agendamentos</h3>
      <div class="table-wrap">
        <table class="data-table" style="min-width:520px;">
          <thead><tr><th>Data</th><th>Serviço</th><th>Status</th><th>Valor</th></tr></thead>
          <tbody>
            ${dados.agendamentos.length ? dados.agendamentos.map((item) => `<tr><td>${escapar(formatarDataHora(item.data_hora_inicio))}</td><td>${escapar(item.servico)}</td><td><span class="badge ${statusInfo(item.status).classe}">${statusInfo(item.status).rotulo}</span></td><td>${brl(Number(item.valor_original) - Number(item.valor_desconto || 0))}</td></tr>`).join('') : '<tr><td colspan="4">Nenhum agendamento.</td></tr>'}
          </tbody>
        </table>
      </div>`,
  });
}

async function excluirUsuario(id) {
  const confirmado = await confirmar({
    titulo: 'Excluir usuário',
    mensagem: 'A conta será removida. Os agendamentos permanecem no histórico da barbearia, sem vínculo com a conta.',
    textoConfirmar: 'Excluir usuário',
    perigo: true,
  });
  if (!confirmado) return;
  try {
    const dados = await api.delete(`/admin/usuarios/${id}`);
    toast(dados.mensagem || 'Usuário excluído.', 'sucesso', 6000);
    carregarSecao('usuarios');
  } catch (erro) {
    toast(erro.message, 'erro');
  }
}

async function secaoFinanceiro() {
  const agora = new Date();
  const padraoDe = `${dataSP(agora).slice(0, 7)}-01`;
  const de = estado.financeiro?.de || padraoDe;
  const ate = estado.financeiro?.ate || dataSP(agora);
  estado.financeiro = { de, ate };
  const params = new URLSearchParams({ de, ate });
  const dados = await api.get(`/admin/financeiro?${params.toString()}`);
  const r = dados.resumo;
  const maxMetodo = Math.max(1, ...dados.porMetodo.map((item) => item.valor));
  const maxDia = Math.max(1, ...dados.porDia.map((item) => item.valor));

  alvoConteudo.innerHTML = `
    ${cabecalho('Financeiro', 'Receita conciliada, valores a receber e histórico.')}
    <form class="filtros" id="filtros-financeiro">
      <div class="field"><label class="label">De</label><input class="input" type="date" name="de" value="${escapar(de)}"></div>
      <div class="field"><label class="label">Até</label><input class="input" type="date" name="ate" value="${escapar(ate)}"></div>
      <button type="submit" class="btn btn-ghost">${icone('filter')} Aplicar</button>
    </form>
    <div class="grid-kpis">
      <div class="kpi-card gold"><span>${icone('wallet')} Receita conciliada</span><strong>${brl(r.receitaConciliada)}</strong><small>${r.concluidos} atendimento(s) concluído(s)</small></div>
      <div class="kpi-card"><span>${icone('cash')} A receber</span><strong>${brl(r.aReceber)}</strong><small>pendentes e pagamentos no local</small></div>
      <div class="kpi-card"><span>${icone('clock')} Histórico estimado</span><strong>${brl(r.historicoEstimado)}</strong><small>legado ainda não conciliado</small></div>
      <div class="kpi-card green"><span>${icone('chart')} Ticket médio</span><strong>${brl(r.ticketMedio)}</strong><small>${r.agendamentos} agendamento(s) no período</small></div>
      <div class="kpi-card"><span>${icone('sparkles')} Descontos concedidos</span><strong>${brl(r.descontosConcedidos)}</strong><small>promoções aplicadas no período</small></div>
    </div>
    <div class="admin-grid-2">
      <div class="admin-card">
        <h3>Receita por forma de pagamento</h3>
        ${dados.porMetodo.length ? `<div class="financeiro-barras">${dados.porMetodo.map((item) => `
          <div class="barra-item">
            <span>${escapar(rotuloMetodo(item.metodo))}</span>
            <div class="barra"><i style="width:${Math.max(3, (item.valor / maxMetodo) * 100)}%;"></i></div>
            <strong>${brl(item.valor)}</strong>
          </div>`).join('')}</div>` : '<p class="muted">Nenhum pagamento confirmado no período.</p>'}
        <p class="hint" style="margin-top:14px;">O histórico estimado não entra na receita conciliada até você confirmar o pagamento de cada atendimento.</p>
      </div>
      <div class="admin-card">
        <h3>Serviços mais procurados</h3>
        ${dados.topServicos.length ? dados.topServicos.map((item) => `
          <div class="linha-lista">
            <div><strong>${escapar(item.nome)}</strong><span>${item.quantidade} atendimento(s)</span></div>
            <strong>${brl(item.valor)}</strong>
          </div>`).join('') : '<p class="muted">Sem dados no período.</p>'}
      </div>
    </div>
    <div class="admin-card" style="margin-top:16px;">
      <h3>Receita por dia (pagamentos confirmados)</h3>
      ${dados.porDia.length ? `<div class="financeiro-barras">${dados.porDia.map((item) => `
        <div class="barra-item">
          <span>${escapar(formatarDataHora(`${item.dia}T12:00:00`).slice(0, 5))}</span>
          <div class="barra"><i style="width:${Math.max(3, (item.valor / maxDia) * 100)}%;"></i></div>
          <strong>${brl(item.valor)}</strong>
        </div>`).join('')}</div>` : '<p class="muted">Nenhuma receita confirmada no período.</p>'}
    </div>`;

  document.getElementById('filtros-financeiro').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const valores = Object.fromEntries(new FormData(evento.currentTarget).entries());
    estado.financeiro = { de: valores.de, ate: valores.ate };
    carregarSecao('financeiro');
  });
}

function paraDatetimeLocal(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  const pad = (numero) => String(numero).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

function periodoPromocao(promocao) {
  const inicio = formatarDataHora(promocao.inicio);
  const fim = promocao.fim ? formatarDataHora(promocao.fim) : 'sem data final';
  return `${inicio} → ${fim}`;
}

async function secaoPromocoes() {
  const [dados, servicosDados] = await Promise.all([
    api.get('/admin/promocoes'),
    api.get('/admin/servicos'),
  ]);
  estado.servicos = servicosDados.servicos || [];
  const promocoes = dados.promocoes || [];
  const ativas = promocoes.filter((item) => item.status === 'ativa').length;

  alvoConteudo.innerHTML = `
    ${cabecalho(
      'Promoções',
      `${ativas} promoção(ões) ativa(s). O desconto vale para novos agendamentos.`,
      `<button class="btn btn-primary btn-sm" data-nova-promocao>${icone('plus')} Aplicar promoção</button>`,
    )}
    <div class="admin-card" style="margin-bottom:16px;">
      <h3>Como o desconto é aplicado</h3>
      <p class="muted" style="font-size:.86rem;">
        Escolha um serviço específico ou "Todos os serviços". O site mostra o preço antigo riscado,
        o valor com desconto e o selo da porcentagem. Se existir uma promoção do serviço e uma global,
        vale a do serviço. Agendamentos já feitos mantêm o valor da época.
      </p>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Promoção</th><th>Onde vale</th><th>Desconto</th><th>Período</th><th>Status</th><th style="text-align:right;">Ações</th></tr></thead>
        <tbody>
          ${promocoes.length ? promocoes.map((promocao) => {
            const status = STATUS_PROMOCAO[promocao.status] || STATUS_PROMOCAO.encerrada;
            return `
              <tr>
                <td><strong>${escapar(promocao.rotulo)}</strong></td>
                <td>${escapar(promocao.servicoNome || 'Todos os serviços')}</td>
                <td><span class="badge badge-gold">-${promocao.percentual}%</span></td>
                <td><span class="muted" style="font-size:.76rem;">${escapar(periodoPromocao(promocao))}</span></td>
                <td><span class="badge ${status.classe}">${status.rotulo}</span></td>
                <td>
                  <div class="acoes">
                    <button class="btn-icon" data-editar-promocao="${promocao.id}" title="Editar">${icone('edit')}</button>
                    ${promocao.ativo
                      ? `<button class="btn-icon" data-encerrar-promocao="${promocao.id}" title="Encerrar agora">${icone('ban')}</button>`
                      : `<button class="btn-icon" data-reativar-promocao="${promocao.id}" title="Reativar">${icone('check')}</button>`}
                    <button class="btn-icon" data-excluir-promocao="${promocao.id}" title="Excluir">${icone('trash')}</button>
                  </div>
                </td>
              </tr>`;
          }).join('') : `<tr><td colspan="6">${estadoVazio({ icone: 'sparkles', titulo: 'Nenhuma promoção', texto: 'Crie a primeira promoção para destacar um serviço ou toda a barbearia.' })}</td></tr>`}
        </tbody>
      </table>
    </div>`;

  alvoConteudo.querySelector('[data-nova-promocao]')?.addEventListener('click', () => abrirPromocao());
  alvoConteudo.querySelectorAll('[data-editar-promocao]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const promocao = promocoes.find((item) => item.id === botao.dataset.editarPromocao);
      if (promocao) abrirPromocao(promocao);
    });
  });
  alvoConteudo.querySelectorAll('[data-encerrar-promocao]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      try {
        await api.put(`/admin/promocoes/${botao.dataset.encerrarPromocao}`, { ativo: false });
        toast('Promoção encerrada.', 'sucesso');
        sessionStorage.removeItem('bcity_config_cache');
        carregarSecao('promocoes');
      } catch (erro) {
        toast(erro.message, 'erro');
      }
    });
  });
  alvoConteudo.querySelectorAll('[data-reativar-promocao]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      try {
        await api.put(`/admin/promocoes/${botao.dataset.reativarPromocao}`, { ativo: true });
        toast('Promoção reativada.', 'sucesso');
        sessionStorage.removeItem('bcity_config_cache');
        carregarSecao('promocoes');
      } catch (erro) {
        toast(erro.message, 'erro');
      }
    });
  });
  alvoConteudo.querySelectorAll('[data-excluir-promocao]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      const confirmado = await confirmar({
        titulo: 'Excluir promoção',
        mensagem: 'A promoção será removida. Agendamentos já feitos não são alterados.',
        textoConfirmar: 'Excluir',
        perigo: true,
      });
      if (!confirmado) return;
      try {
        await api.delete(`/admin/promocoes/${botao.dataset.excluirPromocao}`);
        toast('Promoção removida.', 'sucesso');
        sessionStorage.removeItem('bcity_config_cache');
        carregarSecao('promocoes');
      } catch (erro) {
        toast(erro.message, 'erro');
      }
    });
  });
}


function abrirPromocao(promocao = null) {
  const edicao = Boolean(promocao);
  const opcoes = (estado.servicos || [])
    .map(
      (servico) =>
        `<option value="${servico.id}" ${promocao?.servicoId === servico.id ? 'selected' : ''}>${escapar(servico.nome)}${servico.ativo ? '' : ' (inativo)'}</option>`,
    )
    .join('');

  const overlay = abrirModal({
    titulo: edicao ? 'Editar promoção' : 'Aplicar promoção',
    largura: 'modal-largo',
    conteudo: `
      <form id="form-promocao" class="form-grade">
        <div class="field campo-largo">
          <label class="label">Nome da promoção</label>
          <input class="input" name="rotulo" value="${escapar(promocao?.rotulo || '')}" required minlength="2" maxlength="60" placeholder="Ex.: Mês das crianças">
        </div>
        <div class="field">
          <label class="label">Desconto (%)</label>
          <input class="input" name="percentual" type="number" min="1" max="90" step="1" value="${Number(promocao?.percentual || 10)}" required>
          <span class="hint">Entre 1% e 90%.</span>
        </div>
        <div class="field">
          <label class="label">Onde vale</label>
          <select class="select" name="servicoId">
            <option value="">Todos os serviços</option>
            ${opcoes}
          </select>
        </div>
        <div class="field">
          <label class="label">Início</label>
          <input class="input" type="datetime-local" name="inicio" value="${paraDatetimeLocal(promocao?.inicio || new Date())}" required>
        </div>
        <div class="field">
          <label class="label">Fim (opcional)</label>
          <input class="input" type="datetime-local" name="fim" value="${paraDatetimeLocal(promocao?.fim)}">
        </div>
        <div class="field campo-largo">
          <label class="checkbox"><input type="checkbox" name="ativo" ${promocao?.ativo === false ? '' : 'checked'}> Promoção ativa</label>
        </div>
        <div class="campo-largo modal-actions">
          <button type="button" class="btn btn-ghost" data-fechar-modal>Cancelar</button>
          <button type="submit" class="btn btn-primary">${icone('check')} ${edicao ? 'Salvar promoção' : 'Aplicar promoção'}</button>
        </div>
      </form>`,
  });

  overlay.querySelector('[data-fechar-modal]').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#form-promocao').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const botao = form.querySelector('button[type="submit"]');
    definirCarregando(botao, true, 'Salvando...');
    const valores = Object.fromEntries(new FormData(form).entries());
    const payload = {
      rotulo: valores.rotulo,
      percentual: Number(valores.percentual),
      servicoId: valores.servicoId || null,
      inicio: valores.inicio ? new Date(valores.inicio).toISOString() : undefined,
      fim: valores.fim ? new Date(valores.fim).toISOString() : null,
      ativo: form.ativo.checked,
    };
    try {
      if (edicao) await api.put(`/admin/promocoes/${promocao.id}`, payload);
      else await api.post('/admin/promocoes', payload);
      toast(edicao ? 'Promoção atualizada.' : 'Promoção aplicada.', 'sucesso');
      sessionStorage.removeItem('bcity_config_cache');
      overlay.remove();
      carregarSecao('promocoes');
    } catch (erro) {
      definirCarregando(botao, false);
      toast(erro.message, 'erro', 6000);
    }
  });
}


const STATUS_TEMA = {
  rascunho: { rotulo: 'Rascunho', classe: 'badge-warning' },
  ativo: { rotulo: 'Aplicado', classe: 'badge-success' },
  arquivado: { rotulo: 'Arquivado', classe: 'badge-muted' },
};

const AREA_CURTA = {
  faixa_topo: 'Faixa no topo',
  card_landing: 'Card na página inicial',
  ambos: 'Faixa + card',
};

function montarDocTema(tema) {
  if (!tema?.html) return '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    html, body { margin: 0; background: #0b0b0c; color: #f5f0e6; font-family: Inter, system-ui, sans-serif; }
    .mock-topo { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #2e2e33; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #d4af37; }
    .mock-site { padding: 18px; }
    .mock-rodape { margin-top: 24px; padding: 16px; border-top: 1px solid #2e2e33; color: #9c968b; font-size: 12px; text-align: center; }
    ${tema.css || ''}
  </style>
</head>
<body>
  <div class="mock-topo"><span>BARBE CITY JARAGUÁ</span><span>Prévia isolada</span></div>
  <div class="mock-site"><div id="bcity-tema-ativo">${tema.html}</div></div>
  <div class="mock-rodape">O restante do site não é alterado por esta prévia.</div>
</body>
</html>`;
}


async function secaoTema() {
  const dados = await api.get('/admin/tema');
  const temas = dados.temas || [];
  const previa = estado.temaRascunho || dados.ativo || null;
  const iaOk = Boolean(dados.ia?.configurada);

  alvoConteudo.innerHTML = `
    ${cabecalho('Tema do site (IA)', 'Descreva a decoração que você quer. A IA monta uma máscara segura e nada entra no site antes de você aprovar.')}
    <div class="admin-grid-2">
      <div class="admin-card">
        <h3>O que você quer no site?</h3>
        <form id="form-tema" class="form-grade">
          <div class="field campo-largo">
            <label class="label">Descrição do tema</label>
            <textarea class="textarea" name="prompt" minlength="20" maxlength="600" rows="5" required placeholder="Ex.: Neste mês das crianças quero uma faixa no topo com presentes, brilhos e o texto 'Feliz Dia das Crianças'. Use vermelho e dourado e avise o desconto de 20% para as crianças."></textarea>
            <span class="hint">Sem imagens externas, sem scripts, sem alterar tamanhos e sem mexer no restante do site.</span>
          </div>
          <div class="field campo-largo">
            <label class="label">Onde aplicar</label>
            <select class="select" name="area">
              ${(dados.areas || []).map((area) => `<option value="${area.id}" ${previa?.area === area.id ? 'selected' : ''}>${escapar(AREA_CURTA[area.id] || area.descricao)}</option>`).join('')}
            </select>
          </div>
          <div class="campo-largo">
            <button type="submit" class="btn btn-primary" ${iaOk ? '' : 'disabled'}>${icone('sparkles')} Gerar tema</button>
            ${iaOk ? '' : '<p class="hint">Configure GEMINI_API_KEYS no servidor para liberar a geração.</p>'}
          </div>
        </form>
        <p class="hint" style="margin-top:14px;">A geração pode levar até 40 segundos. O tema é salvo como rascunho.</p>
      </div>
      <div class="admin-card">
        <h3>Prévia isolada</h3>
        ${previa
          ? `<iframe id="tema-preview" class="tema-preview" sandbox="" title="Prévia do tema"></iframe>`
          : '<p class="muted">Nenhum tema gerado ainda. Descreva o visual ao lado e clique em “Gerar tema”.</p>'}
        <div class="modal-actions" style="justify-content:flex-start;flex-wrap:wrap;margin-top:12px;">
          ${previa && previa.status !== 'ativo' ? `<button type="button" class="btn btn-primary btn-sm" data-ativar-tema="${previa.id}">${icone('check')} Ativar no site</button>` : ''}
          ${previa?.status === 'ativo' ? '<span class="badge badge-success">Aplicado no site</span>' : ''}
          <button type="button" class="btn btn-danger btn-sm" data-resetar-tema ${dados.ativo ? '' : 'disabled'}>${icone('x')} Voltar ao site original</button>
          ${previa && previa.status !== 'ativo' ? `<button type="button" class="btn btn-ghost btn-sm" data-excluir-tema="${previa.id}">${icone('trash')} Excluir</button>` : ''}
        </div>
      </div>
    </div>
    <div class="admin-card" style="margin-top:16px;">
      <h3>Histórico de temas</h3>
      <div class="table-wrap" style="border:0;">
        <table class="data-table" style="min-width:680px;">
          <thead><tr><th>Gerado em</th><th>Resumo</th><th>Status</th><th style="text-align:right;">Ações</th></tr></thead>
          <tbody>
            ${temas.length ? temas.map((tema) => {
              const status = STATUS_TEMA[tema.status] || STATUS_TEMA.arquivado;
              return `
                <tr>
                  <td>${escapar(formatarDataHora(tema.criado_em))}</td>
                  <td><strong>${escapar(tema.resumo || tema.prompt.slice(0, 60))}</strong><div class="muted" style="font-size:.72rem;">${escapar(AREA_CURTA[tema.area] || tema.area)} · ${escapar(tema.modelo || '—')}</div></td>
                  <td><span class="badge ${status.classe}">${status.rotulo}</span></td>
                  <td>
                    <div class="acoes">
                      <button class="btn-icon" data-ver-tema="${tema.id}" title="Ver prévia">${icone('eye')}</button>
                      ${tema.status !== 'ativo' ? `<button class="btn-icon" data-ativar-tema="${tema.id}" title="Ativar no site">${icone('check')}</button>` : ''}
                      ${tema.status !== 'ativo' ? `<button class="btn-icon" data-excluir-tema="${tema.id}" title="Excluir">${icone('trash')}</button>` : ''}
                    </div>
                  </td>
                </tr>`;
            }).join('') : '<tr><td colspan="4">Nenhum tema gerado até agora.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;

  const frame = document.getElementById('tema-preview');
  if (frame && previa) frame.srcdoc = montarDocTema(previa);

  document.getElementById('form-tema')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const botao = form.querySelector('button[type="submit"]');
    definirCarregando(botao, true, 'Gerando tema...');
    try {
      const resposta = await api.post('/admin/tema/gerar', {
        prompt: form.prompt.value,
        area: form.area.value,
      });
      estado.temaRascunho = resposta.tema;
      sessionStorage.removeItem('bcity_config_cache');
      toast('Tema gerado. Confira a prévia antes de ativar.', 'sucesso', 6000);
      carregarSecao('tema');
    } catch (erro) {
      definirCarregando(botao, false);
      toast(erro.message, 'erro', 8000);
    }
  });

  ligarAcoesTema(dados);
}


function ligarAcoesTema(dados) {
  const limparCache = () => sessionStorage.removeItem('bcity_config_cache');

  async function ativar(id) {
    try {
      await api.post(`/admin/tema/${id}/ativar`);
      estado.temaRascunho = null;
      limparCache();
      toast('Tema aplicado no site.', 'sucesso', 5000);
      carregarSecao('tema');
    } catch (erro) {
      toast(erro.message, 'erro', 6000);
    }
  }

  alvoConteudo.querySelectorAll('[data-ativar-tema]').forEach((botao) => {
    botao.addEventListener('click', () => ativar(botao.dataset.ativarTema));
  });

  alvoConteudo.querySelector('[data-resetar-tema]')?.addEventListener('click', async (evento) => {
    const botao = evento.currentTarget;
    const confirmado = await confirmar({
      titulo: 'Voltar ao site original',
      mensagem: 'A máscara atual será removida e o site volta ao visual padrão. Você pode reativar um tema depois.',
      textoConfirmar: 'Voltar ao original',
    });
    if (!confirmado) return;
    definirCarregando(botao, true, 'Restaurando...');
    try {
      await api.post('/admin/tema/reset');
      estado.temaRascunho = null;
      limparCache();
      toast('Site restaurado para o visual original.', 'sucesso', 5000);
      carregarSecao('tema');
    } catch (erro) {
      definirCarregando(botao, false);
      toast(erro.message, 'erro', 6000);
    }
  });

  alvoConteudo.querySelectorAll('[data-excluir-tema]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      const confirmado = await confirmar({
        titulo: 'Excluir tema',
        mensagem: 'O tema será removido do histórico. O site não é afetado.',
        textoConfirmar: 'Excluir',
        perigo: true,
      });
      if (!confirmado) return;
      try {
        await api.delete(`/admin/tema/${botao.dataset.excluirTema}`);
        if (estado.temaRascunho?.id === botao.dataset.excluirTema) estado.temaRascunho = null;
        toast('Tema excluído.', 'sucesso');
        carregarSecao('tema');
      } catch (erro) {
        toast(erro.message, 'erro');
      }
    });
  });

  alvoConteudo.querySelectorAll('[data-ver-tema]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      try {
        const resposta = await api.get(`/admin/tema/${botao.dataset.verTema}`);
        estado.temaRascunho = resposta.tema;
        carregarSecao('tema');
      } catch (erro) {
        toast(erro.message, 'erro');
      }
    });
  });

  void dados;
}


async function secaoHorarios() {
  const dados = await api.get('/admin/horarios');
  const mapa = new Map(dados.horarios.map((item) => [Number(item.diaSemana), item]));
  alvoConteudo.innerHTML = `
    ${cabecalho('Horários de funcionamento', 'Defina os dias, janelas de atendimento e intervalo entre horários.')}
    <form class="admin-card" id="form-horarios">
      <div class="table-wrap" style="border:0;">
        <table class="data-table" style="min-width:640px;">
          <thead><tr><th>Dia</th><th>Abre</th><th>Fecha</th><th>Intervalo</th><th>Ativo</th></tr></thead>
          <tbody>
            ${DIAS.map((nome, dia) => {
              const horario = mapa.get(dia) || { abertura: '09:00', fechamento: '18:00', intervaloMin: 15, ativo: false };
              return `
                <tr data-dia="${dia}">
                  <td><strong>${nome}</strong></td>
                  <td><input class="input" type="time" name="abertura-${dia}" value="${escapar(String(horario.abertura).slice(0, 5))}" style="min-height:36px;padding:7px 10px;"></td>
                  <td><input class="input" type="time" name="fechamento-${dia}" value="${escapar(String(horario.fechamento).slice(0, 5))}" style="min-height:36px;padding:7px 10px;"></td>
                  <td><input class="input" type="number" min="5" max="120" name="intervalo-${dia}" value="${horario.intervaloMin || 15}" style="min-height:36px;padding:7px 10px;"></td>
                  <td><label class="checkbox"><input type="checkbox" name="ativo-${dia}" ${horario.ativo ? 'checked' : ''}> Abre</label></td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">${icone('check')} Salvar horários</button>
      </div>
    </form>`;
  document.getElementById('form-horarios').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const horarios = DIAS.map((_, dia) => ({
      diaSemana: dia,
      abertura: form[`abertura-${dia}`].value,
      fechamento: form[`fechamento-${dia}`].value,
      intervaloMin: Number(form[`intervalo-${dia}`].value),
      ativo: form[`ativo-${dia}`].checked,
    }));
    const botao = form.querySelector('button[type="submit"]');
    definirCarregando(botao, true, 'Salvando...');
    try {
      const resposta = await api.put('/admin/horarios', { horarios });
      toast(resposta.mensagem || 'Horários atualizados.', 'sucesso');
      carregarSecao('horarios');
    } catch (erro) {
      definirCarregando(botao, false);
      toast(erro.message, 'erro', 6000);
    }
  });
}


async function secaoBloqueios() {
  const dados = await api.get('/admin/bloqueios');
  alvoConteudo.innerHTML = `
    ${cabecalho('Bloqueios de agenda', 'Marque férias, almoços, compromissos ou horários indisponíveis.')}
    <div class="admin-grid-2">
      <div class="admin-card">
        <h3>Novo bloqueio</h3>
        <form id="form-bloqueio" class="form-grade">
          <div class="field campo-largo"><label class="label">Data</label><input class="input" type="date" name="data" value="${dataSP(new Date())}" required></div>
          <div class="field"><label class="label">Início</label><input class="input" type="time" name="horaInicio" value="12:00" required></div>
          <div class="field"><label class="label">Fim</label><input class="input" type="time" name="horaFim" value="13:00" required></div>
          <div class="field campo-largo"><label class="label">Motivo</label><input class="input" name="motivo" maxlength="300" placeholder="Ex.: almoço, compromisso pessoal"></div>
          <div class="campo-largo"><button type="submit" class="btn btn-primary">${icone('ban')} Bloquear período</button></div>
        </form>
      </div>
      <div class="admin-card">
        <h3>Orientações</h3>
        <p class="muted" style="font-size:.84rem;">O bloqueio impede novos agendamentos no período. Se já existirem clientes marcados, o sistema avisa antes de salvar.</p>
        <p class="hint">Bloqueios valem para a agenda inteira (um barbeiro).</p>
      </div>
    </div>
    <div class="admin-card" style="margin-top:16px;">
      <h3>Períodos bloqueados</h3>
      <div class="table-wrap" style="border:0;">
        <table class="data-table" style="min-width:560px;">
          <thead><tr><th>Início</th><th>Fim</th><th>Motivo</th><th>Criado por</th><th style="text-align:right;">Ação</th></tr></thead>
          <tbody>
            ${dados.bloqueios.length ? dados.bloqueios.map((item) => `
              <tr>
                <td>${escapar(formatarDataHora(item.inicio))}</td>
                <td>${escapar(formatarDataHora(item.fim))}</td>
                <td>${escapar(item.motivo || '—')}</td>
                <td>${escapar(item.criado_por || '—')}</td>
                <td><div class="acoes"><button class="btn-icon" data-excluir-bloqueio="${item.id}" title="Remover">${icone('trash')}</button></div></td>
              </tr>`).join('') : '<tr><td colspan="5">Nenhum bloqueio futuro.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('form-bloqueio').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const payload = {
      data: form.data.value,
      horaInicio: form.horaInicio.value,
      horaFim: form.horaFim.value,
      motivo: form.motivo.value,
    };
    const salvar = async (forcar = false) => {
      try {
        await api.post('/admin/bloqueios', { ...payload, forcar });
        toast('Período bloqueado.', 'sucesso');
        carregarSecao('bloqueios');
        return true;
      } catch (erro) {
        if (erro.codigo === 'bloqueio_com_agendamentos' && !forcar) {
          const confirmado = await confirmar({
            titulo: 'Existem agendamentos',
            mensagem: `${erro.message} Deseja bloquear mesmo assim? Os clientes já marcados não serão cancelados automaticamente.`,
            textoConfirmar: 'Bloquear mesmo assim',
            perigo: true,
          });
          if (confirmado) return salvar(true);
          return false;
        }
        toast(erro.message, 'erro', 6000);
        return false;
      }
    };
    await salvar();
  });

  alvoConteudo.querySelectorAll('[data-excluir-bloqueio]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      const confirmado = await confirmar({
        titulo: 'Remover bloqueio',
        mensagem: 'O período voltará a ficar disponível para agendamentos.',
        textoConfirmar: 'Remover',
        perigo: true,
      });
      if (!confirmado) return;
      try {
        await api.delete(`/admin/bloqueios/${botao.dataset.excluirBloqueio}`);
        toast('Bloqueio removido.', 'sucesso');
        carregarSecao('bloqueios');
      } catch (erro) {
        toast(erro.message, 'erro');
      }
    });
  });
}

async function secaoConfig() {
  const dados = await api.get('/admin/configuracoes');
  const mapa = Object.fromEntries(dados.configuracoes.map((item) => [item.chave, item.valor]));
  const campo = (chave, rotulo, { tipo = 'text', largo = false, hint = '' } = {}) => `
    <div class="field ${largo ? 'campo-largo' : ''}">
      <label class="label" for="cfg-${chave}">${escapar(rotulo)}</label>
      <input class="input" id="cfg-${chave}" name="${chave}" type="${tipo}" value="${escapar(mapa[chave] || '')}">
      ${hint ? `<span class="hint">${escapar(hint)}</span>` : ''}
    </div>`;
  const area = (chave, rotulo) => `
    <div class="field campo-largo">
      <label class="label" for="cfg-${chave}">${escapar(rotulo)}</label>
      <textarea class="textarea" id="cfg-${chave}" name="${chave}" maxlength="2000">${escapar(mapa[chave] || '')}</textarea>
    </div>`;

  alvoConteudo.innerHTML = `
    ${cabecalho('Configurações', 'Dados exibidos no site, contato e informações da barbearia.')}
    <form class="admin-card" id="form-config">
      <div class="form-grade">
        ${campo('nome_barbearia', 'Nome da barbearia')}
        ${campo('subtitulo', 'Subtítulo')}
        ${campo('slogan', 'Slogan', { largo: true })}
        ${campo('telefone', 'Telefone exibido')}
        ${campo('whatsapp', 'WhatsApp (somente números)', { hint: 'Ex.: 5511915040871' })}
        ${campo('email_contato', 'E-mail de contato', { tipo: 'email' })}
        ${campo('horario_texto', 'Resumo dos horários')}
        ${campo('endereco', 'Endereço', { largo: true })}
        ${campo('mapa_url', 'Link do Google Maps', { largo: true })}
        ${campo('instagram', 'Instagram (URL)', { largo: true })}
        ${area('sobre', 'Sobre a barbearia')}
        ${area('aviso_agendamento', 'Aviso no agendamento')}
        ${campo('versiculo', 'Versículo (destaque)')}
        ${campo('versiculo_ref', 'Referência do versículo')}
        ${area('versiculo_texto', 'Texto do versículo')}
        ${campo('anos_experiencia', 'Anos de experiência')}
        <div class="campo-largo modal-actions">
          <button type="submit" class="btn btn-primary">${icone('check')} Salvar configurações</button>
        </div>
      </div>
    </form>
    <div class="admin-card" style="margin-top:16px;">
      <h3>Chaves de integração</h3>
      <p class="muted" style="font-size:.84rem;">Google, Pix, Brevo e WhatsApp Cloud API são configurados no arquivo <code>.env</code> (ou nas variáveis da Vercel), não pelo painel.</p>
      <p class="hint">Depois de alterar o <code>.env</code>, reinicie o servidor local ou faça um novo deploy.</p>
    </div>`;

  document.getElementById('form-config').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const botao = form.querySelector('button[type="submit"]');
    definirCarregando(botao, true, 'Salvando...');
    const configuracoes = {};
    form.querySelectorAll('[name]').forEach((campoInput) => {
      configuracoes[campoInput.name] = campoInput.value;
    });
    try {
      const resposta = await api.put('/admin/configuracoes', { configuracoes });
      toast(resposta.mensagem || 'Configurações salvas.', 'sucesso');
      sessionStorage.removeItem('bcity_config_cache');
    } catch (erro) {
      toast(erro.message, 'erro', 6000);
    } finally {
      definirCarregando(botao, false);
    }
  });
}

async function secaoLogs() {
  const dados = await api.get(`/admin/logs?pagina=${estado.logs.pagina}&limite=30`);
  alvoConteudo.innerHTML = `
    ${cabecalho('Logs administrativos', `${dados.total} ação(ões) registradas.`)}
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Data</th><th>Administrador</th><th>Ação</th><th>Entidade</th><th>Detalhes</th></tr></thead>
        <tbody>
          ${dados.logs.length ? dados.logs.map((item) => `
            <tr>
              <td>${escapar(formatarDataHora(item.criado_em))}</td>
              <td>${escapar(item.admin || 'sistema')}</td>
              <td><strong>${escapar(item.acao)}</strong></td>
              <td>${escapar(item.entidade || '—')}</td>
              <td><span class="muted" style="font-size:.75rem;">${escapar(JSON.stringify(item.detalhes || {}).slice(0, 120))}</span></td>
            </tr>`).join('') : '<tr><td colspan="5">Nenhum log registrado.</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="paginacao">
      <span>Página ${dados.pagina} de ${dados.paginas}</span>
      <div class="botoes">
        <button class="btn btn-sm btn-ghost" data-pagina="${dados.pagina - 1}" ${dados.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <button class="btn btn-sm btn-ghost" data-pagina="${dados.pagina + 1}" ${dados.pagina >= dados.paginas ? 'disabled' : ''}>Próxima</button>
      </div>
    </div>`;
  alvoConteudo.querySelectorAll('[data-pagina]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const pagina = Number(botao.dataset.pagina);
      if (pagina < 1 || pagina > dados.paginas) return;
      estado.logs.pagina = pagina;
      carregarSecao('logs');
    });
  });
}

async function secaoNotificacoes() {
  const dados = await api.get('/admin/notificacoes?limite=100');
  alvoConteudo.innerHTML = `
    ${cabecalho('Notificações', 'Histórico de avisos por WhatsApp e e-mail enviados pelo sistema.')}
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Data</th><th>Canal</th><th>Destino</th><th>Status</th><th>Agendamento</th><th style="text-align:right;">Ação</th></tr></thead>
        <tbody>
          ${dados.notificacoes.length ? dados.notificacoes.map((item) => `
            <tr>
              <td>${escapar(formatarDataHora(item.criado_em))}</td>
              <td>${escapar(item.canal)}</td>
              <td>${escapar(item.destino || '—')}</td>
              <td><span class="badge ${statusInfo(item.status).classe}">${statusInfo(item.status).rotulo}</span></td>
              <td>${escapar(item.codigo_publico || '—')}</td>
              <td>
                <div class="acoes">
                  ${item.canal === 'whatsapp' && item.link_wa ? `<a class="btn-icon" href="${escapar(item.link_wa)}" target="_blank" rel="noopener" title="Abrir WhatsApp">${icone('whatsapp')}</a>` : ''}
                </div>
              </td>
            </tr>`).join('') : '<tr><td colspan="6">Nenhuma notificação registrada.</td></tr>'}
        </tbody>
      </table>
    </div>
    <p class="hint" style="margin-top:12px;">Sem WhatsApp Cloud API configurada, o sistema gera o link pronto para envio manual. O envio automático exige WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID.</p>`;
}

async function iniciarAdmin() {
  alvoConteudo = document.getElementById('admin-conteudo');
  const alvoNav = document.getElementById('admin-nav');
  if (!alvoConteudo || !alvoNav) return;

  const usuario = state.usuario || (await carregarSessao());
  if (!usuario || usuario.role !== 'admin') {
    alvoConteudo.innerHTML = `
      <div class="empty" style="margin-top:50px;">
        <div class="empty-icon">${icone('shield')}</div>
        <h3>Acesso restrito</h3>
        <p>Esta área é exclusiva do administrador da barbearia. Entre com uma conta de administrador.</p>
        <div class="sucesso-acoes">
          <a class="btn btn-primary" href="/login.html?next=/admin.html">Entrar como administrador</a>
          <a class="btn btn-outline" href="/">Voltar ao site</a>
        </div>
      </div>`;
    return;
  }

  const secaoInicial = window.location.hash.replace('#', '');
  const valida = SECOES.some((secao) => secao.id === secaoInicial);
  renderizarNav();
  await carregarSecao(valida ? secaoInicial : 'dashboard');

  window.addEventListener('bcity:nao-autenticado', () => {
    toast('Sua sessão expirou. Entre novamente.', 'aviso', 6000);
    setTimeout(() => {
      window.location.href = '/login.html?next=/admin.html';
    }, 1200);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarAdmin);
else iniciarAdmin();
