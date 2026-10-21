import { criarApp } from '../server/app.js';

/**
 * Uma única função serverless atende TODA a API (/api/*).
 *
 * O roteador da Vercel não casa caminhos com mais de um segmento em arquivos
 * `[...slug].js` neste projeto (ex.: /api/auth/me). Por isso o vercel.json
 * reescreve `/api/:path*` para `/api?__caminho=:path*` e aqui reconstruímos a
 * URL original antes de entregar ao Express.
 */
const app = criarApp();

export default function handler(req, res) {
  try {
    const url = new URL(req.url || '/api', 'http://localhost');
    if (url.searchParams.has('__caminho')) {
      const caminho = (url.searchParams.get('__caminho') || '').replace(/^\/+/, '');
      url.searchParams.delete('__caminho');
      const busca = url.searchParams.toString();
      req.url = `/api/${caminho}` + (busca ? `?${busca}` : '');
    }
  } catch {
    /* mantém a URL original */
  }
  return app(req, res);
}
