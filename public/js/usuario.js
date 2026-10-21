import { api } from './api.js';
import {
  brl,
  carregarSessao,
  definirUsuario,
  escapar,
  formatarDataHora,
  formatarTelefone,
  icone,
  iniciais,
  rotuloMetodo,
  state,
  statusInfo,
} from './core.js';
import { abrirModal, confirmar, definirCarregando, estadoVazio, lerQuery, mascararTelefone, toast } from './ui.js';
import { stickerCard } from './avatar-barbearia.js';

function separarAgendamentos(agendamentos) {
  const agora = Date.now();
  const proximos = [];
  const historico = [];
  for (const item of agendamentos) {
    const ativo = ['pendente', 'confirmado'].includes(item.status) && new Date(item.inicio).getTime() >= agora;
    (ativo ? proximos : historico).push(item);
  }
  proximos.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  return { proximos, historico };
}

function itemAgendamento(agendamento, { cancelavel = false } = {}) {
  const status = statusInfo(agendamento.status);
  const data = new Date(agendamento.inicio);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(data).replace('.', '');
  const pagamento = agendamento.pagamento;
  return `
    <article class="historico-item">
      <div class="historico-data"><strong>${dia}</strong><span>${escapar(mes)}</span></div>
      <div class="historico-info">
        ${stickerCard(agendamento, { compacto: true, titulo: 'Atendimento' })}
        <span>${escapar(formatarDataHora(agendamento.inicio))} · ${agendamento.duracaoMin} min</span>
        <span>${pagamento ? `${escapar(rotuloMetodo(pagamento.metodo))} · ${statusInfo(pagamento.status).rotulo}` : 'Pagamento a definir'} · Código ${escapar(agendamento.codigo)}</span>
        ${Number(agendamento.valorDesconto) > 0 ? `<span class="muted">Desconto de ${brl(agendamento.valorDesconto)} aplicado</span>` : ''}
      </div>
      <div class="historico-valor">${brl(agendamento.valorOriginal)}<small>${agendamento.valorPago > 0 ? `${brl(agendamento.valorPago)} pago` : 'a pagar'}</small></div>
      <div class="acoes" style="display:flex;gap:6px;align-items:center;">
        <span class="badge ${status.classe}">${status.rotulo}</span>
        ${cancelavel ? `<button type="button" class="btn btn-sm btn-danger" data-cancelar="${agendamento.id}">${icone('x')} Cancelar</button>` : ''}
      </div>
    </article>`;
}

function renderPerfil(usuario, resumo) {
  return `
    <div class="perfil-topo">
      <span class="avatar">${escapar(iniciais(usuario.nome))}</span>
      <div>
        <h1>Olá, ${escapar(usuario.nome.split(' ')[0])}</h1>
        <p>${escapar(usuario.email || '')}${usuario.telefone ? ` · ${escapar(formatarTelefone(usuario.telefone))}` : ''}</p>
        <p style="margin-top:6px;">
          <span class="badge ${usuario.emailVerificado ? 'badge-success' : 'badge-warning'}">${usuario.emailVerificado ? 'E-mail verificado' : 'E-mail não verificado'}</span>
          ${usuario.role === 'admin' ? ' <span class="badge badge-gold">Administrador</span>' : ''}
        </p>
      </div>
      <div class="perfil-acoes">
        <a class="btn btn-primary" href="/servicos.html">${icone('calendar')} Agendar</a>
        <button type="button" class="btn btn-ghost" data-editar-perfil>${icone('edit')} Editar dados</button>
        <button type="button" class="btn btn-ghost" data-alterar-senha>${icone('lock')} Senha</button>
        ${usuario.role === 'admin' ? `<a class="btn btn-gold" href="/admin.html">${icone('settings')} Painel admin</a>` : ''}
        <button type="button" class="btn btn-outline" data-sair>${icone('logout')} Sair</button>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi gold"><span>Próximos</span><strong>${resumo.proximos}</strong></div>
      <div class="kpi"><span>Atendimentos concluídos</span><strong>${resumo.concluidos}</strong></div>
      <div class="kpi green"><span>Total investido</span><strong>${brl(resumo.totalPago)}</strong></div>
    </div>`;

function renderAba(agendamentos, aba, resumo) {
  if (aba === 'perfil') return renderPerfilForm(state.usuario);
  const { proximos, historico } = separarAgendamentos(agendamentos);
  const lista = aba === 'historico' ? historico : proximos;
  if (lista.length === 0) {
    return estadoVazio({
      icone: aba === 'historico' ? 'clock' : 'calendar',
      titulo: aba === 'historico' ? 'Seu histórico ainda está vazio' : 'Nenhum horário agendado',
      texto:
        aba === 'historico'
          ? 'Quando você concluir um atendimento, ele aparecerá aqui.'
          : 'Escolha um serviço e reserve seu próximo horário.',
      acao: aba === 'proximos' ? '<a class="btn btn-primary" href="/servicos.html">Agendar agora</a>' : '',
    });
  }
  return `<div class="historico">${lista
    .map((item) => itemAgendamento(item, { cancelavel: aba === 'proximos' }))
    .join('')}</div>`;
}

function renderPerfilForm(usuario) {
  return `
    <div class="painel">
      <div class="painel-titulo"><h2>Meus dados</h2></div>
      <form id="form-perfil" class="form-grade">
        <div class="field campo-largo">
          <label class="label" for="perfil-nome">Nome completo</label>
          <input class="input" id="perfil-nome" name="nome" value="${escapar(usuario.nome)}" required minlength="2">
        </div>
        <div class="field campo-largo">
          <label class="label" for="perfil-telefone">Telefone</label>
          <input class="input" id="perfil-telefone" name="telefone" value="${escapar(usuario.telefone || '')}" placeholder="(11) 99999-9999">
        </div>
        <div class="field campo-largo">
          <label class="label">E-mail</label>
          <input class="input" value="${escapar(usuario.email || '')}" disabled>
          <span class="hint">O e-mail é usado para entrar na conta e receber confirmações.</span>
        </div>
        <div class="campo-largo" style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-primary" type="submit">${icone('check')} Salvar alterações</button>
          <button class="btn btn-danger" type="button" data-excluir-conta>${icone('trash')} Excluir minha conta</button>
        </div>
      </form>
    </div>`;
}

async function iniciar() {
  const alvo = document.getElementById('usuario-conteudo');
  if (!alvo) return;
  alvo.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';

  const usuario = state.usuario || (await carregarSessao());
  if (!usuario) {
    alvo.innerHTML = `
      <div class="empty" style="margin-top:40px;">
        <div class="empty-icon">${icone('user')}</div>
        <h3>Entre para ver sua área</h3>
        <p>Com uma conta você acompanha seus horários, histórico e dados de pagamento.</p>
        <div class="sucesso-acoes">
          <a class="btn btn-primary" href="/login.html?next=/usuario.html">Entrar</a>
          <a class="btn btn-outline" href="/cadastro.html">Criar conta</a>
        </div>
      </div>`;
    return;
  }

  let aba = 'proximos';
  let agendamentos = [];
  let resumo = { proximos: 0, concluidos: 0, total: 0, totalPago: 0 };

  try {
    const [perfil, lista] = await Promise.all([api.get('/usuario'), api.get('/agendamentos/meus')]);
    definirUsuario(perfil.usuario);
    resumo = perfil.resumo;
    agendamentos = lista.agendamentos || [];
  } catch (erro) {
    toast(erro.message, 'erro', 6000);
    alvo.innerHTML = `<div class="empty"><h3>Não foi possível carregar sua área</h3><p>${escapar(erro.message)}</p><button class="btn btn-primary" data-recarregar>Tentar novamente</button></div>`;
    alvo.querySelector('[data-recarregar]')?.addEventListener('click', () => window.location.reload());
    return;
  }

  function renderizarTudo() {
    const { proximos } = separarAgendamentos(agendamentos);
    resumo.proximos = proximos.length;
    alvo.innerHTML = `
      ${renderPerfil(state.usuario, resumo)}
      <div class="painel-abas" style="margin-top:22px;">
        <button type="button" class="painel-aba ${aba === 'proximos' ? 'is-active' : ''}" data-aba="proximos">${icone('calendar')} Próximos</button>
        <button type="button" class="painel-aba ${aba === 'historico' ? 'is-active' : ''}" data-aba="historico">${icone('clock')} Histórico</button>
        <button type="button" class="painel-aba ${aba === 'perfil' ? 'is-active' : ''}" data-aba="perfil">${icone('user')} Meus dados</button>
      </div>
      <div id="aba-conteudo">${renderAba(agendamentos, aba, resumo)}</div>`;

    alvo.querySelectorAll('[data-aba]').forEach((botao) => {
      botao.addEventListener('click', () => {
        aba = botao.dataset.aba;
        renderizarTudo();
      });
    });
    alvo.querySelector('[data-sair]')?.addEventListener('click', sair);
    alvo.querySelector('[data-editar-perfil]')?.addEventListener('click', editarPerfil);
    alvo.querySelector('[data-alterar-senha]')?.addEventListener('click', alterarSenha);
    alvo.querySelector('[data-excluir-conta]')?.addEventListener('click', excluirConta);
    alvo.querySelectorAll('[data-cancelar]').forEach((botao) => {
      botao.addEventListener('click', () => cancelarAgendamento(botao.dataset.cancelar));
    });
    alvo.querySelector('#form-perfil')?.addEventListener('submit', salvarPerfil);
    mascararTelefone(alvo.querySelector('#perfil-telefone'));
  }

  async function sair() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    definirUsuario(null);
    sessionStorage.clear();
    window.location.href = '/';
  }

  async function cancelarAgendamento(id) {
    const confirmado = await confirmar({
      titulo: 'Cancelar agendamento',
      mensagem: 'Tem certeza que deseja cancelar este horário? Ele voltará a ficar disponível para outros clientes.',
      textoConfirmar: 'Sim, cancelar',
      perigo: true,
    });
    if (!confirmado) return;
    try {
      await api.patch(`/agendamentos/${id}/cancelar`, { motivo: 'Cancelado pelo cliente' });
      toast('Agendamento cancelado.', 'sucesso');
      const item = agendamentos.find((agendamento) => agendamento.id === id);
      if (item) item.status = 'cancelado';
      const perfil = await api.get('/usuario');
      resumo = perfil.resumo;
      renderizarTudo();
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  }

  async function salvarPerfil(evento) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const botao = form.querySelector('button[type="submit"]');
    definirCarregando(botao, true, 'Salvando...');
    try {
      const dados = await api.put('/usuario', {
        nome: form.nome.value,
        telefone: form.telefone.value || undefined,
      });
      definirUsuario(dados.usuario);
      toast(dados.mensagem || 'Dados atualizados.', 'sucesso');
      renderizarTudo();
    } catch (erro) {
      toast(erro.message, 'erro');
    } finally {
      definirCarregando(botao, false);
    }
  }

  function editarPerfil() {
    const overlay = abrirModal({
      titulo: 'Editar meus dados',
      conteudo: `
        <form id="modal-perfil" class="form-grade">
          <div class="field campo-largo">
            <label class="label">Nome completo</label>
            <input class="input" name="nome" value="${escapar(state.usuario.nome)}" required minlength="2">
          </div>
          <div class="field campo-largo">
            <label class="label">Telefone</label>
            <input class="input" name="telefone" value="${escapar(state.usuario.telefone || '')}" placeholder="(11) 99999-9999">
          </div>
          <div class="campo-largo modal-actions">
            <button type="button" class="btn btn-ghost" data-fechar-modal>Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar</button>
          </div>
        </form>`,
    });
    overlay.querySelector('[data-fechar-modal]').addEventListener('click', () => overlay.remove());
    mascararTelefone(overlay.querySelector('input[name="telefone"]'));
    overlay.querySelector('#modal-perfil').addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const form = evento.currentTarget;
      try {
        const dados = await api.put('/usuario', {
          nome: form.nome.value,
          telefone: form.telefone.value || undefined,
        });
        definirUsuario(dados.usuario);
        toast('Dados atualizados.', 'sucesso');
        overlay.remove();
        renderizarTudo();
      } catch (erro) {
        toast(erro.message, 'erro');
      }
    });
  }

  function alterarSenha() {
    const temSenha = state.usuario.temSenha;
    const overlay = abrirModal({
      titulo: temSenha ? 'Alterar senha' : 'Criar uma senha',
      conteudo: `
        <form id="modal-senha">
          ${
            temSenha
              ? '<div class="field"><label class="label">Senha atual</label><input class="input" type="password" name="senhaAtual" required autocomplete="current-password"></div>'
              : '<p class="hint">Sua conta ainda não tem senha. Defina uma para entrar sem depender do código por e-mail.</p>'
          }
          <div class="field"><label class="label">Nova senha</label><input class="input" type="password" name="novaSenha" required minlength="8" autocomplete="new-password"><span class="hint">Mínimo de 8 caracteres, com pelo menos uma letra e um número.</span></div>
          <div class="field"><label class="label">Confirmar nova senha</label><input class="input" type="password" name="confirmar" required minlength="8" autocomplete="new-password"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-fechar-modal>Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar senha</button>
          </div>
        </form>`,
    });
    overlay.querySelector('[data-fechar-modal]').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#modal-senha').addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const form = evento.currentTarget;
      if (form.novaSenha.value !== form.confirmar.value) {
        toast('As senhas não conferem.', 'aviso');
        return;
      }
      try {
        const dados = await api.put('/usuario/senha', {
          senhaAtual: form.senhaAtual?.value || undefined,
          novaSenha: form.novaSenha.value,
        });
        toast(dados.mensagem || 'Senha atualizada.', 'sucesso');
        overlay.remove();
      } catch (erro) {
        toast(erro.message, 'erro');
      }
    });
  }

  function excluirConta() {
    const overlay = abrirModal({
      titulo: 'Excluir minha conta',
      conteudo: `
        <p class="modal-text">Esta ação desativa sua conta e remove seus dados de acesso. Seus agendamentos permanecem apenas no histórico da barbearia. Para confirmar, digite sua senha.</p>
        <form id="modal-excluir">
          <div class="field"><label class="label">Senha</label><input class="input" type="password" name="senha" required autocomplete="current-password"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-fechar-modal>Cancelar</button>
            <button type="submit" class="btn btn-danger">Excluir definitivamente</button>
          </div>
        </form>`,
    });
    overlay.querySelector('[data-fechar-modal]').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#modal-excluir').addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const form = evento.currentTarget;
      try {
        const dados = await api.delete('/usuario', { senha: form.senha.value });
        toast(dados.mensagem || 'Conta removida.', 'sucesso');
        definirUsuario(null);
        setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      } catch (erro) {
        toast(erro.message, 'erro');
      }
    });
  }

  if (lerQuery('bemvindo') === '1') {
    toast(`Que bom ter você por aqui, ${state.usuario.nome.split(' ')[0]}!`, 'sucesso', 5000);
  }

  renderizarTudo();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();


}
