import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '../..');
const publico = path.join(raiz, 'public');
const paginas = fs.readdirSync(publico).filter((arquivo) => arquivo.endsWith('.html'));
const problemas = [];

function existe(caminho) {
  const limpo = caminho.split('?')[0].split('#')[0];
  if (!limpo || limpo === '/') return true;
  if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(limpo)) return true;
  if (limpo.startsWith('/api/')) return true;
  const alvo = path.join(publico, limpo);
  return fs.existsSync(alvo);
}

for (const pagina of paginas) {
  const arquivo = path.join(publico, pagina);
  const html = fs.readFileSync(arquivo, 'utf8');

  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const alvo = match[1];
    if (!alvo.startsWith('/') && !alvo.startsWith('#')) continue;
    if (!existe(alvo) && alvo !== '#') problemas.push(`${pagina}: recurso ausente ${alvo}`);
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const duplicados = ids.filter((id, indice) => ids.indexOf(id) !== indice);
  for (const id of new Set(duplicados)) problemas.push(`${pagina}: id duplicado "${id}"`);

  if (!html.includes('id="site-header"')) problemas.push(`${pagina}: sem header`);
  if (!html.includes('id="site-footer"')) problemas.push(`${pagina}: sem footer`);
  if (!html.includes('/js/layout.js')) problemas.push(`${pagina}: sem layout.js`);
  if (!html.includes('/css/tokens.css') || !html.includes('/css/base.css') || !html.includes('/css/components.css')) {
    problemas.push(`${pagina}: CSS incompleto`);
  }
}

const sprite = fs.readFileSync(path.join(publico, 'assets/icons/sprite.svg'), 'utf8');
const simbolos = new Set([...sprite.matchAll(/<symbol id="i-([^"]+)"/g)].map((m) => m[1]));
const js = fs
  .readdirSync(path.join(publico, 'js'))
  .filter((arquivo) => arquivo.endsWith('.js'))
  .map((arquivo) => fs.readFileSync(path.join(publico, 'js', arquivo), 'utf8'))
  .join('\n');
const html = paginas.map((pagina) => fs.readFileSync(path.join(publico, pagina), 'utf8')).join('\n');

const usados = new Set();
for (const match of `${js}\n${html}`.matchAll(/(?:icone\('([^']+)'|href="#i-([^"]+)")/g)) {
  if (match[1]) usados.add(match[1]);
  if (match[2]) usados.add(match[2]);
}
for (const usado of usados) {
  if (usado.includes('${')) continue;
  if (!simbolos.has(usado)) problemas.push(`sprite: ícone "i-${usado}" não existe`);
}

console.log(`Páginas verificadas: ${paginas.length}`);
console.log(`Ícones no sprite: ${simbolos.size}`);
console.log(`Ícones usados: ${usados.size}`);
if (problemas.length) {
  console.error('PROBLEMAS:');
  for (const problema of problemas) console.error(' -', problema);
  process.exitCode = 1;
} else {
  console.log('HTML_OK');
}
