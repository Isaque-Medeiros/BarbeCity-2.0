import { criarApp } from '../server/app.js';

/**
 * Uma única função serverless atende TODA a API (/api/*).
 * Isso mantém o projeto dentro do limite de funções do plano gratuito da Vercel.
 */
const app = criarApp();

export default function handler(req, res) {
  return app(req, res);
}
