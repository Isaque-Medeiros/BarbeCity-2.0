import { HttpError } from './http.js';

export async function fetchJson(url, { timeoutMs = 15_000, ...opcoes } = {}) {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const resposta = await fetch(url, { ...opcoes, signal: controlador.signal });
    const texto = await resposta.text();
    let dados = null;
    if (texto) {
      try {
        dados = JSON.parse(texto);
      } catch {
        dados = texto;
      }
    }
    if (!resposta.ok) {
      const mensagem =
        dados?.message ||
        dados?.error_description ||
        dados?.error ||
        (typeof dados === 'string' ? dados.slice(0, 300) : '');
      throw new HttpError(
        502,
        `Falha na comunicação com o serviço externo (${resposta.status})${mensagem ? `: ${mensagem}` : '.'}`,
        'servico_externo',
      );
    }
    return dados;
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new HttpError(504, 'O serviço externo demorou demais para responder. Tente novamente.', 'timeout_externo');
    }
    throw erro;
  } finally {
    clearTimeout(timer);
  }
}
