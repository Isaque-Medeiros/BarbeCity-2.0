const BASE = '/api';

function lerCookie(nome) {
  const par = document.cookie.split('; ').find((item) => item.startsWith(`${nome}=`));
  return par ? decodeURIComponent(par.split('=').slice(1).join('=')) : null;
}

export async function garantirCsrf() {
  if (lerCookie('bcity_csrf')) return;
  try {
    await fetch(`${BASE}/auth/csrf`, { credentials: 'same-origin' });
  } catch {
    /* a próxima requisição tentará novamente */
  }
}

async function requisitar(caminho, { method = 'GET', body, headers = {} } = {}) {
  await garantirCsrf();
  const opcoes = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...headers },
  };
  if (body !== undefined) {
    opcoes.headers['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(body);
  }
  if (!['GET', 'HEAD'].includes(method)) {
    opcoes.headers['X-CSRF-Token'] = lerCookie('bcity_csrf') || '';
  }

  let resposta;
  try {
    resposta = await fetch(`${BASE}${caminho}`, opcoes);
  } catch {
    const erro = new Error('Não foi possível conectar ao servidor. Verifique sua internet.');
    erro.codigo = 'sem_conexao';
    throw erro;
  }

  let dados = null;
  const texto = await resposta.text();
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = { erro: texto };
    }
  }

  if (!resposta.ok) {
    if (resposta.status === 401) window.dispatchEvent(new CustomEvent('bcity:nao-autenticado'));
    const erro = new Error(dados?.erro || `Erro ${resposta.status}`);
    erro.status = resposta.status;
    erro.codigo = dados?.codigo;
    erro.detalhes = dados?.detalhes;
    erro.dados = dados;
    throw erro;
  }
  return dados;
}

export const api = {
  get: (caminho) => requisitar(caminho),
  post: (caminho, body) => requisitar(caminho, { method: 'POST', body }),
  put: (caminho, body) => requisitar(caminho, { method: 'PUT', body }),
  patch: (caminho, body) => requisitar(caminho, { method: 'PATCH', body }),
  delete: (caminho, body) => requisitar(caminho, { method: 'DELETE', body }),
};

export { lerCookie };
