import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function texto(chave, padrao = '') {
  const valor = process.env[chave];
  return valor === undefined || valor === null || valor === '' ? padrao : String(valor).trim();
}

function numero(chave, padrao) {
  const valor = Number(process.env[chave]);
  return Number.isFinite(valor) ? valor : padrao;
}

function booleano(chave, padrao = false) {
  const valor = texto(chave).toLowerCase();
  if (!valor) return padrao;
  return ['1', 'true', 'sim', 'yes', 'on'].includes(valor);
}

function lista(chave, padrao = []) {
  const valor = texto(chave);
  if (!valor) return padrao;
  return [...new Set(valor.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean))];
}

/**
 * O driver `pg` não entende o parâmetro `channel_binding` (exclusivo do libpq).
 * Removemos para evitar falha de conexão com o Neon.
 */
export function limparUrlBanco(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('channel_binding');
    return parsed.toString();
  } catch {
    return url;
  }
}

const nodeEnv = texto('NODE_ENV', 'development');
const porta = numero('PORT', 3000);
const baseUrl = texto('BASE_URL', `http://localhost:${porta}`).replace(/\/$/, '');

export const config = {
  nodeEnv,
  producao: nodeEnv === 'production',
  porta,
  baseUrl,
  frontendUrl: texto('FRONTEND_URL', baseUrl).replace(/\/$/, ''),
  trustProxy: numero('TRUST_PROXY', 0),

  databaseUrl: limparUrlBanco(texto('DATABASE_URL')),

  sessionSecret: texto('SESSION_SECRET'),
  sessionDias: numero('SESSION_DAYS', 30),
  cookieSecure: booleano('COOKIE_SECURE', nodeEnv === 'production'),
  cookieName: 'bcity_session',
  csrfCookieName: 'bcity_csrf',

  brevo: {
    apiKey: texto('BREVO_API_KEY'),
    remetenteEmail: texto('BREVO_SENDER_EMAIL'),
    remetenteNome: texto('BREVO_SENDER_NAME', 'Barbe City Jaraguá'),
  },

  google: {
    clientId: texto('GOOGLE_CLIENT_ID'),
    clientSecret: texto('GOOGLE_CLIENT_SECRET'),
    redirectUri: texto('GOOGLE_REDIRECT_URI', `${baseUrl}/api/auth/google/callback`),
  },

  pix: {
    gateway: texto('PIX_GATEWAY', 'mercadopago'),
    accessToken: texto('PIX_ACCESS_TOKEN'),
    publicKey: texto('PIX_PUBLIC_KEY'),
    webhookSecret: texto('PIX_WEBHOOK_SECRET'),
  },

  whatsapp: {
    numero: texto('WHATSAPP_NUMBER').replace(/\D/g, ''),
    token: texto('WHATSAPP_TOKEN'),
    phoneNumberId: texto('WHATSAPP_PHONE_NUMBER_ID'),
  },

  gemini: {
    chaves: [...new Set([...lista('GEMINI_API_KEYS'), texto('GEMINI_API_KEY')].filter(Boolean))],
    modelos: lista('GEMINI_MODELOS', ['gemini-2.5-flash', 'gemini-2.5-flash-lite']),
    timeoutMs: Math.max(5000, numero('GEMINI_TIMEOUT_MS', 40000)),
    maxChavesPorRequisicao: Math.max(1, numero('GEMINI_MAX_KEYS_PER_REQUEST', 3)),
    cooldownMin: Math.max(1, numero('GEMINI_COOLDOWN_MIN', 5)),
    maxTokens: Math.max(512, numero('GEMINI_MAX_TOKENS', 4096)),
  },

  admin: {
    nome: texto('ADMIN_NOME', 'Administrador'),
    email: texto('ADMIN_EMAIL').toLowerCase(),
    senha: texto('ADMIN_SENHA'),
  },

  donoEmail: texto('OWNER_EMAIL').toLowerCase(),

  timezone: texto('APP_TIMEZONE', 'America/Sao_Paulo'),
  slotMinutos: Math.max(5, numero('BOOKING_SLOT_MINUTES', 15)),
  agendamentoMaxDias: Math.max(1, numero('BOOKING_MAX_DIAS', 60)),

  barberia: {
    nome: texto('BARBEARIA_NOME', 'Barbe City Jaraguá'),
    telefone: texto('BARBEARIA_TELEFONE', '(11) 91504-0871'),
    endereco: texto('BARBEARIA_ENDERECO', 'R. Jairo de Almeida Machado, 220 - Jaraguá, São Paulo - SP'),
  },
};

export const recursos = {
  googleAtivo: Boolean(config.google.clientId && config.google.clientSecret),
  pixAtivo: Boolean(config.pix.accessToken),
  brevoAtivo: Boolean(config.brevo.apiKey && config.brevo.remetenteEmail),
  whatsappApiAtiva: Boolean(config.whatsapp.token && config.whatsapp.phoneNumberId),
  geminiAtivo: config.gemini.chaves.length > 0,
};

const obrigatorias = ['DATABASE_URL', 'SESSION_SECRET'];
const ausentes = obrigatorias.filter((chave) => !texto(chave));

if (ausentes.length > 0) {
  throw new Error(
    `Variáveis de ambiente obrigatórias ausentes: ${ausentes.join(', ')}. Confira o arquivo .env (use .env.example como base).`,
  );
}

if (config.sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET precisa ter pelo menos 32 caracteres.');
}

if (!config.brevo.remetenteEmail) {
  console.warn('[env] BREVO_SENDER_EMAIL não configurado — e-mails serão desativados.');
}

if (!config.admin.email || !config.admin.senha) {
  console.warn('[env] ADMIN_EMAIL/ADMIN_SENHA não configurados — nenhum admin será criado no seed.');
}
