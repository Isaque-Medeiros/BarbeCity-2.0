import { api } from './api.js';
import { hojeISO, escapar, icone } from './core.js';

const NOMES_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function tituloMes(mes) {
  const [ano, numero] = mes.split('-');
  return `${MESES[Number(numero) - 1]} de ${ano}`;
}

function adicionarMes(mes, delta) {
  const [ano, numero] = mes.split('-').map(Number);
  const data = new Date(Date.UTC(ano, numero - 1 + delta, 15, 12));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
}

function urlDisponibilidade(servicoId, adicionais, data) {
  const params = new URLSearchParams({ servico_id: servicoId, data });
  if (adicionais.length) params.set('adicionais', adicionais.join(','));
  return `/agendamentos/disponibilidade?${params.toString()}`;
}

function urlMes(servicoId, adicionais, mes) {
  const params = new URLSearchParams({ servico_id: servicoId, mes });
  if (adicionais.length) params.set('adicionais', adicionais.join(','));
  return `/agendamentos/disponibilidade/mes?${params.toString()}`;
}

export function iniciarAgenda({ alvoCalendario, alvoHorarios, servicoId, adicionais = [], onSelecionar }) {
  const hoje = hojeISO();
  let mesAtual = hoje.slice(0, 7);
  let dataSelecionada = null;
  let horaSelecionada = null;
  let selecao = null;

  function notificar() {
    if (typeof onSelecionar === 'function') {
      onSelecionar(selecao ? { ...selecao } : null);
    }
  }

  function renderCarregando(mensagem = 'Carregando agenda...') {
    alvoCalendario.innerHTML = `<div class="horarios-vazio">${escapar(mensagem)}</div>`;
    alvoHorarios.innerHTML = '';
  }

  function renderCalendario(dados) {
    const primeiroDiaSemana = new Date(`${dados.dias[0].data}T12:00:00Z`).getUTCDay();
    const celulas = [];
    for (let i = 0; i < primeiroDiaSemana; i += 1) {
      celulas.push('<span class="dia is-vazio" aria-hidden="true"></span>');
    }
    for (const dia of dados.dias) {
      const numero = Number(dia.data.slice(8, 10));
      const fechado = !dia.aberto || dia.disponiveis === 0;
      const classes = [
        'dia',
        fechado ? 'is-fechado' : '',
        dia.data === hoje ? 'is-hoje' : '',
        dia.data === dataSelecionada ? 'is-selecionado' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const rotulo = fechado ? `${numero} — sem horários` : `${numero} — ${dia.disponiveis} horário(s)`;
      celulas.push(`
        <button type="button" class="${classes}" data-data="${dia.data}" ${fechado ? 'disabled' : ''} aria-label="${rotulo}" title="${rotulo}">
          <span>${numero}</span>
          ${!fechado ? `<span class="dia-vagas">${dia.disponiveis} vagas</span>` : ''}
        </button>`);
    }

    alvoCalendario.innerHTML = `
      <div class="calendario-topo">
        <button type="button" class="btn-icon" data-mes-anterior aria-label="Mês anterior">${icone('chevron-left')}</button>
        <div class="calendario-titulo">${escapar(tituloMes(dados.mes))}</div>
        <button type="button" class="btn-icon" data-mes-seguinte aria-label="Próximo mês">${icone('chevron-right')}</button>
      </div>
      <div class="calendario-semana">${NOMES_SEMANA.map((dia) => `<span>${dia}</span>`).join('')}</div>
      <div class="calendario-dias">${celulas.join('')}</div>
      <p class="hint" style="margin:14px 0 0;">Horários no fuso de São Paulo. Duração total: ${dados.duracaoTotal} min.</p>`;

    alvoCalendario.querySelector('[data-mes-anterior]').addEventListener('click', () => mudarMes(-1));
    alvoCalendario.querySelector('[data-mes-seguinte]').addEventListener('click', () => mudarMes(1));
    alvoCalendario.querySelectorAll('[data-data]').forEach((botao) => {
      botao.addEventListener('click', () => selecionarDia(botao.dataset.data, dados));
    });
  }

  function renderHorarios(dados) {
    const disponiveis = dados.slots.filter((slot) => slot.disponivel);
    if (!dados.aberto) {
      alvoHorarios.innerHTML = '<div class="horarios-vazio">A barbearia não atende neste dia. Escolha outra data.</div>';
      return;
    }
    if (disponiveis.length === 0) {
      alvoHorarios.innerHTML =
        '<div class="horarios-vazio">Todos os horários deste dia já foram preenchidos. Escolha outra data.</div>';
      return;
    }
    alvoHorarios.innerHTML = `
      <div class="horarios-grid">
        ${dados.slots
          .map(
            (slot) => `
          <button type="button" class="slot ${slot.hora === horaSelecionada ? 'is-selecionado' : ''}"
            data-hora="${slot.hora}" ${slot.disponivel ? '' : 'disabled'}
            title="${slot.disponivel ? `Reservar às ${slot.hora}` : 'Horário indisponível'}">${slot.hora}</button>`,
          )
          .join('')}
      </div>`;
    alvoHorarios.querySelectorAll('[data-hora]').forEach((botao) => {
      botao.addEventListener('click', () => {
        horaSelecionada = botao.dataset.hora;
        const slot = dados.slots.find((item) => item.hora === horaSelecionada);
        selecao = { data: dados.data, hora: horaSelecionada, inicio: slot.inicio, fim: slot.fim };
        alvoHorarios.querySelectorAll('.slot').forEach((item) => item.classList.remove('is-selecionado'));
        botao.classList.add('is-selecionado');
        notificar();
      });
    });
  }

  async function selecionarDia(data, dadosMes = null) {
    dataSelecionada = data;
    horaSelecionada = null;
    selecao = null;
    notificar();
    if (dadosMes) {
      alvoCalendario.querySelectorAll('[data-data]').forEach((botao) => {
        botao.classList.toggle('is-selecionado', botao.dataset.data === data);
      });
    }
    alvoHorarios.innerHTML = '<div class="horarios-vazio">Carregando horários...</div>';
    try {
      const dados = await api.get(urlDisponibilidade(servicoId, adicionais, data));
      renderHorarios(dados);
    } catch (erro) {
      alvoHorarios.innerHTML = `<div class="horarios-vazio">${escapar(erro.message)}</div>`;
    }
  }

  async function carregarMes() {
    renderCarregando();
    try {
      const dados = await api.get(urlMes(servicoId, adicionais, mesAtual));
      renderCalendario(dados);
      const primeiroLivre = dados.dias.find((dia) => dia.aberto && dia.disponiveis > 0);
      if (primeiroLivre && !dataSelecionada) {
        await selecionarDia(primeiroLivre.data, dados);
      } else if (dataSelecionada && dados.mes === dataSelecionada.slice(0, 7)) {
        await selecionarDia(dataSelecionada);
      }
    } catch (erro) {
      alvoCalendario.innerHTML = `<div class="horarios-vazio">${escapar(erro.message)}</div>`;
    }
  }

  function mudarMes(delta) {
    const novo = adicionarMes(mesAtual, delta);
    if (novo < hoje.slice(0, 7)) return;
    mesAtual = novo;
    dataSelecionada = null;
    horaSelecionada = null;
    selecao = null;
    notificar();
    carregarMes();
  }

  carregarMes();

  return {
    obterSelecao: () => (selecao ? { ...selecao } : null),
    recarregar: carregarMes,
  };
}
