# Redesign v2 — Barbe City Jaraguá

Data: 2026-11-06 · Escopo: site público (home, serviços, login, cadastro, consulta, pagamento, área do cliente) + cabeçalhos de segurança.

## O que mudou

### Camada visual nova
- `public/css/v2.css` — fundação: tokens, reset, tipografia, layout, header, gaveta, botões, formulários, superfícies, rodapé, utilidades.
- `public/css/v2-pages.css` — seções: hero, cards de serviço, sobre, diferenciais, galeria, versículo, contato, passos, agenda, checkout, pagamento, auth, área do cliente, admin.
- Carregadas **depois** de `tokens.css`, `base.css` e `components.css` em todas as páginas.

### Linguagem visual (referência: deepseek.com/en/harness, sem copiar as cores)
- Botões em pílula (100px), altura 44/50px, peso 500, transição de 0,24s.
- Cards com superfície translúcida `rgba(255,255,255,.022)`, hairline `1px rgba(255,255,255,.075)` e raio de 16–22px.
- Ritmo de seção de 64–124px (fluido) e container de 1200px.
- Tipografia: Playfair Display para títulos, Inter para interface; escala fluida com `clamp()`.
- Header fixo com blur em pseudo-elemento, hairline dourada ao rolar.
- Microinterações: hover de -1px nos botões, reveal no scroll com `IntersectionObserver`, flutuação do selo do hero.

### Paleta mantida
Vermelho `#b91c1c`, ouro `#d4af37`, fundo `#09090a` e texto `#f4efe4`. Tema claro também revisado.

## Bugs corrigidos (com causa raiz)

| Sintoma | Causa | Correção |
|---|---|---|
| Header sumia ao rolar | `body { overflow-x: hidden }` + wrapper `#site-header` de 74px limitando o `sticky` | header `position: fixed` + `body.tem-header { padding-top }` |
| Gaveta do menu presa/fora da tela | `.primary-nav` era `position: fixed` dentro de um header com `backdrop-filter` — o filtro vira containing block | blur movido para `::before`; gaveta reparentada para o `body` no mobile |
| Layout viewport inflava para ~742px | gaveta fixa de 335px em `x=406` dentro do header | mesma correção acima; hoje `overflow-x: 0` em 390px |
| Gabaritos de estilo conflitantes | `base.css` e `components.css` têm 2–4 camadas duplicadas cada | camada v2 por cima, com especificidade controlada |
| Tela de login "não aparecia" no celular | header invisível + gaveta quebrada impediam chegar ao login | ambos corrigidos; login validado em 390×844 sem erros de console |
| CTA "Agendar" espremido no header mobile | `.header-cta` vencia por ordem de cascata | regra com especificidade maior oculta o CTA no mobile |

## Segurança aplicada
- `vercel.json` agora envia: CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Referrer-Policy`, COOP.
- Cache imutável para `/css`, `/js`, `/assets` (todos versionados com `?v=`) e `no-cache` para HTML.
- CSP compatível com o que o site usa: `script-src 'self'` (não há script inline nem `eval`), `style-src` com `unsafe-inline` (atributos de estilo), fontes do Google e iframe do Google Maps.
- O Express local já usa Helmet; na Vercel apenas `/api/*` passa pela função, por isso os cabeçalhos estáticos precisavam estar no `vercel.json`.

## SEO / compartilhamento
- Open Graph e Twitter Card com imagem `public/assets/og.png` (1200×630).
- `robots.txt` e `sitemap.xml`.
- JSON-LD `HairSalon` com endereço, telefone, faixa de preço e horários.

## Como testar
```bash
npm start          # http://127.0.0.1:3000
```

## Logo nova no hero (2026-11-06)

- Arte recebida (`LogoInicialnova.png`, 1033×1024) processada para `public/assets/hero-logo.jpg` (880×880, ~148 KB).
- O PNG original tinha fundo branco opaco; a arte foi composta sobre um círculo escuro (`#09090a`) com recorte circular, eliminando a faixa branca nas bordas.
- Aplicada em dois pontos: a "bola brilhante" do hero (`.hero-emblem`) e o medalhão da seção Sobre (`.sobre-visual`).
- O medalhão do hero ganhou anel tracejado girando bem devagar, halo dourado e respiração sutil (`v2-badge-breathe`).
- Os dois selos flutuantes que ficavam sobre a arte foram removidos — eles cobriam a logo. A informação de preço virou um chip dourado na fileira de chips ("Corte + Barba R$ 50").
- `public/assets/og.png` regerado com a logo nova (prévia de compartilhamento no WhatsApp).

## Pendências / próximos passos
1. **Avatar 3D** (estilo Xbox) — aguardando o site de referência.
2. **Painel administrativo** segue com o visual legado; falta uma passada de v2.
3. Deploy: o projeto não tem repositório git local — publique com `vercel --prod` ou conecte o repositório.
4. Ao trocar para domínio próprio, atualizar `canonical`, `og:url`, `sitemap.xml` e `robots.txt`.

## Backup
Cópia do estado anterior em `.backup-2026-11-06/`.
