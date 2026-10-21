import { config, recursos } from '../config/env.js';
import { fetchJson } from '../utils/fetch.js';
import { HttpError } from '../utils/http.js';

export function googleConfigurado() {
  return recursos.googleAtivo;
}

export function urlConsentimento(state) {
  if (!recursos.googleAtivo) throw new HttpError(503, 'Login com Google não está configurado.', 'google_indisponivel');
  const parametros = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${parametros.toString()}`;
}

export async function trocarCodigoPorToken(code) {
  if (!recursos.googleAtivo) throw new HttpError(503, 'Login com Google não está configurado.', 'google_indisponivel');
  const corpo = new URLSearchParams({
    code,
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    redirect_uri: config.google.redirectUri,
    grant_type: 'authorization_code',
  });
  return fetchJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo.toString(),
  });
}

export async function obterPerfilGoogle(accessToken) {
  return fetchJson('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
