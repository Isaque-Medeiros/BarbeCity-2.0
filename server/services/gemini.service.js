import { config } from '../config/env.js';
import { HttpError } from '../utils/http.js';
import { RotacaoChaves } from '../utils/rotacao-chaves.js';

/**
 * Cliente do Gemini com rotação de chaves.
 *
 * Ideia portada do `MultiGeminiService` (C#):
 * - 429 → chave em cooldown de 5 min e próxima chave assume;
 * - 401/403 → chave inválida no processo;
 * - 5xx/timeout → tenta o próximo modelo/chave;
 * - todas esgotadas → 503 amigável (o site nunca quebra).
 *
 * A cota do Gemini é por PROJETO, não por chave. Para a rotação realmente
 * aumentar o limite, as chaves precisam vir de projetos/contas diferentes.
 */

let rotacao = null;

function obterRotacao() {
  if (!rotacao) {
    rotacao = new RotacaoChaves({
      chaves: config.gemini.chaves,
      cooldownMs: config.gemini.cooldownMin * 60 * 1000,
    });
  }
  return rotacao;
}

export function iaConfigurada() {
  return config.gemini.chaves.length > 0;
}

export function estadoIA() {
  const estado = obterRotacao();
  return { configurada: estado.total > 0, chaves: estado.total, disponiveis: estado.disponiveis().length };
}

async function chamarModelo({ chave, modelo, sistema, prompt, esquema, maxTokens, timeoutMs }) {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), Math.max(5000, timeoutMs));

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(chave)}`;
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controlador.signal,
      body: JSON.stringify({
        ...(sistema ? { systemInstruction: { parts: [{ text: sistema }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json',
          ...(esquema ? { responseSchema: esquema } : {}),
        },
      }),
    });

    const textoResposta = await resposta.text();
    let corpo = null;
    try {
      corpo = textoResposta ? JSON.parse(textoResposta) : null;
    } catch {
      corpo = null;
    }

    if (!resposta.ok) {
      return {
        ok: false,
        status: resposta.status,
        mensagem: corpo?.error?.message || `HTTP ${resposta.status}`,
      };
    }

    const candidato = corpo?.candidates?.[0];
    if (candidato?.finishReason === 'SAFETY') {
      return { ok: false, status: 422, mensagem: 'A resposta foi bloqueada pelos filtros do Gemini.' };
    }

    const partes = candidato?.content?.parts || [];
    const conteudo = partes.map((parte) => parte.text).filter(Boolean).join('').trim();
    if (!conteudo) {
      return { ok: false, status: 502, mensagem: 'O Gemini respondeu vazio.' };
    }

    try {
      return { ok: true, dados: JSON.parse(conteudo), uso: corpo?.usageMetadata || null };
    } catch {
      return { ok: false, status: 502, mensagem: 'O Gemini não devolveu um JSON válido.' };
    }
  } catch (erro) {
    if (erro?.name === 'AbortError') {
      return { ok: false, status: 0, mensagem: 'O Gemini demorou demais para responder.' };
    }
    return { ok: false, status: 0, mensagem: erro?.message || 'Falha de conexão com o Gemini.' };
  } finally {
    clearTimeout(timer);
  }
}

export async function gerarJson({ prompt, sistema = '', esquema = null, maxTokens = null }) {
  const estado = obterRotacao();
  if (estado.total === 0) {
    throw new HttpError(
      503,
      'A geração por IA ainda não está configurada. Adicione GEMINI_API_KEYS no servidor.',
      'ia_nao_configurada',
    );
  }

  const maxTentativas = Math.min(config.gemini.maxChavesPorRequisicao, estado.total);
  const prazo = Date.now() + config.gemini.timeoutMs;
  let ultimoMotivo = 'sem_chave_disponivel';

  for (let tentativa = 0; tentativa < maxTentativas; tentativa += 1) {
    if (Date.now() >= prazo - 3000) {
      ultimoMotivo = 'tempo_esgotado';
      break;
    }
    const chave = estado.proxima();
    if (!chave) break;

    for (const modelo of config.gemini.modelos) {
      const restante = prazo - Date.now();
      if (restante < 3000) {
        ultimoMotivo = 'tempo_esgotado';
        break;
      }
      const resultado = await chamarModelo({
        chave,
        modelo,
        sistema,
        prompt,
        esquema,
        maxTokens: maxTokens || config.gemini.maxTokens,
        timeoutMs: restante,
      });

      if (resultado.ok) {
        console.log(`[gemini] resposta de ${modelo} com a chave ${estado.indiceDe(chave)}/${estado.total}`);
        return {
          dados: resultado.dados,
          meta: { modelo, chaveIndice: estado.indiceDe(chave), uso: resultado.uso },
        };
      }

      ultimoMotivo = resultado.mensagem;
      console.warn(`[gemini] ${modelo} falhou (status ${resultado.status}): ${resultado.mensagem}`);

      if (resultado.status === 429) {
        estado.marcarCooldown(chave);
        break;
      }
      if (resultado.status === 401 || resultado.status === 403) {
        estado.invalidar(chave);
        break;
      }
    }
  }

  throw new HttpError(
    503,
    'A IA está temporariamente indisponível. Tente novamente em alguns minutos.',
    'ia_indisponivel',
    { motivo: ultimoMotivo },
  );
}
