# 07 · Design System — implementado

## 1. Direção visual
Escuro premium por padrão, com **preto quente + vermelho + dourado**, sem neon. Bordas suaves, sombras discretas, tipografia serifada nos títulos e layout limpo.

## 2. Tokens reais
Definidos em [`public/css/tokens.css`](../public/css/tokens.css).

| Token | Escuro | Claro |
|---|---|---|
| `--bg` | `#0b0b0c` | `#faf8f5` |
| `--bg-elevated` | `#151517` | `#ffffff` |
| `--surface` | `#1b1b1e` | `#f6f2eb` |
| `--border` | `#2e2e33` | `#e3dccf` |
| `--text` | `#f5f0e6` | `#1c1a17` |
| `--text-muted` | `#9c968b` | `#6f675c` |
| `--red` | `#b91c1c` | `#a71717` |
| `--gold` | `#d4af37` | `#a5801f` |
| `--green` | `#2f9e5a` | `#2f9e5a` |
| `--amber` | `#d99a2b` | `#d99a2b` |

Raios: 8/10/14/20/28 px + pill. Sombras `--shadow-sm`, `--shadow`, `--shadow-gold`. Transições de 180/320 ms.

## 3. Tipografia
- Títulos: **Playfair Display** 600/700 (fallback Georgia).
- Corpo/UI: **Inter** 400/500/600/700 (fallback system-ui).
- Escala hero `clamp(2.2rem, 5vw, 4rem)`, títulos `1.7–2.5rem`, corpo 1rem, pequeno 0.78–0.9rem.

## 4. Componentes
- Botões: primário (vermelho), dourado, outline, ghost, danger, icon, sm/lg/block.
- Inputs com foco em anel vermelho; labels em caixa alta; hint/erro.
- Cards de serviço com ícone, categoria, preço, duração e selo de destaque.
- Calendário mensal, slots, barra de resumo fixa.
- Resumo lateral, opções de pagamento, painel Pix, QR e copia-e-cola.
- Badges de status (pago/confirmado/pendente/cancelado/ausente).
- Tabelas administrativas, filtros, paginação, KPI cards, barras financeiras.
- Toast, modal, skeleton, estados vazios, spinner.
- Header sticky com menu mobile e toggle de tema; footer completo.

## 5. Ícones e logo
- Sprite SVG em [`public/assets/icons/sprite.svg`](../public/assets/icons/sprite.svg) com 57 símbolos.
- `logo.svg`: emblema detalhado original recriado.
- `logo-mark.svg`: marca circular (favicon/header).
- `logo-horizontal.svg`: lockup horizontal com “BARBE City / JARAGUÁ / Deus é fiel”.
- `favicon.svg`.

## 6. Tema
- Atributo `data-theme="dark|light"` no `<html>`.
- `theme-init.js` evita flash; `layout.js` alterna e persiste em `localStorage` (`bcity_tema`).
- Meta `theme-color` atualizada.

## 7. Responsividade
Desktop ≥1024: menu horizontal, hero em 2 colunas, grid de 3–4.
Tablet 768–1023: hero/agenda/checkout em 1 coluna, grid 2.
Mobile <768: menu hambúrguer, cards 1 coluna, botões largos, tabelas roláveis.

## 8. Acessibilidade
Contraste adequado, foco visível, `aria-label` em ícones/botões, `aria-live` nos toasts, skip link, `prefers-reduced-motion`, formulários com `label` e `autocomplete`.
