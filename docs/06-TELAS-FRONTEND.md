# 06 · Telas do Front-end — implementadas

Navegação principal: **Landing → Serviços → Confirmação → Pagamento → Sucesso**. Áreas separadas para **cliente** e **admin**.

## 1. Landing (`/`)
- Header com marca, navegação, tema claro/escuro e CTA.
- Hero com emblema SVG, slogan, endereço, telefone, horário e botões.
- **Faixa automática de promoção** (quando não há tema IA com faixa ativa): rótulo, % e serviço.
- **Máscara visual do tema IA** (opcional) aplicada após o header, com botão de fechar.
- Serviços em destaque (dinâmicos da API, 6 cards) com preço antigo riscado e selo de desconto.
- Sobre Anderson Barbeiro + valores.
- Diferenciais, galeria (placeholders), versículo “Deus é fiel”.
- Contato com mapa incorporado, WhatsApp e horários.
- Rodapé com direitos, links, LGPD e créditos.

## 2. Serviços (`/servicos.html`)
- Abas: Todos, Individuais, Combos, Tratamentos.
- Cards com nome, descrição, preço, duração e ícone; desconto mostra valor antigo riscado e selo `-X%`.
- Seleção do serviço principal.
- **Avatar de barbearia ao vivo** (`/js/avatar-barbearia.js`): cabelo, barba, sobrancelha, luzes e tratamento mudam conforme principal + adicionais.
- Painel opcional de adicionais (até 4; ex.: Luzes, Hidratação, Botox).
- Barra fixa com total/duração, desconto e botão continuar.

## 3. Confirmação (`/confirmacao.html`)
- Calendário mensal com vagas por dia e slots de 15 min.
- Bloqueios, dias fechados e horários passados desabilitados.
- Formulário de dados (pré-preenchido se logado) + aceite LGPD.
- Resumo lateral com serviço, extras, data, horário e total.
- Checkout salvo em `sessionStorage` para a próxima etapa.

## 4. Pagamento (`/pagamento.html`)
- Resumo do cliente e do horário.
- Métodos: **Pix**, **Dinheiro**, **Cartão**.
- Dinheiro: nota + prévia de troco + opção de troco via Pix.
- Cartão: pagamento presencial na maquininha.
- Pix: **pagar agora** (QR + copia-e-cola + polling) ou **na hora**.
- Se Pix online não estiver configurado, a opção é desabilitada sem quebrar o fluxo.
- Ao confirmar, cria agendamento + pagamento, reserva o slot e redireciona para sucesso.

## 5. Sucesso (`/sucesso.html`)
- Código público, serviço, data, duração, valor, desconto e status do pagamento.
- **Sticker-card** do atendimento (avatar + serviços + traços) para o cliente guardar.
- Botão “Avisar a barbearia” (link WhatsApp), “Enviar para mim” e download `.ics`.
- Atalhos para consultar/cancelar e novo agendamento.

## 6. Meu agendamento (`/consultar.html`)
- Busca por código + telefone.
- Exibe status, pagamento, valor, endereço e observações.
- Cancelamento com confirmação (quando permitido).
- Rate limit e mensagem genérica para não expor dados.

## 7. Login (`/login.html`) e Cadastro (`/cadastro.html`)
- Login por e-mail/senha, Google (quando configurado) e código de 6 dígitos (Brevo).
- Recuperação de senha por código.
- Cadastro com nome, e-mail, telefone opcional, senha/confirmação e aceite LGPD.
- Área lateral com identidade visual.

## 8. Minha conta (`/usuario.html`)
- Perfil e indicadores (próximos, concluídos, total investido).
- Abas: Próximos, Histórico, Meus dados.
- Cancelamento de horário, edição de nome/telefone.
- Alterar/criar senha, sair e excluir conta (LGPD).

## 9. Painel admin (`/admin.html`)
Seções: **Visão geral, Agendamentos, Serviços, Promoções, Tema do site (IA), Usuários, Financeiro, Horários, Bloqueios, Configurações, Logs, Notificações**.
- Dashboard com agenda do dia, pagamentos pendentes e descontos concedidos.
- Agendamentos com filtros, avatar do serviço (sticker mini), mudança de status, reagendamento, criação manual e conciliação de pagamento.
- Serviços com CRUD completo e escolha dos traços do avatar (ou detecção automática).
- **Promoções**: aplicar % em um serviço ou em todos, com início/fim, encerrar, reativar e excluir.
- **Tema IA**: descrever o visual, gerar rascunho, conferir prévia em iframe isolado, ativar e voltar ao site original.
- Usuários com busca, perfil, ativação e exclusão.
- Financeiro com período, receita conciliada, a receber, histórico estimado e gráficos em barras.
- Horários e bloqueios editáveis; bloqueio avisa se há clientes marcados.
- Configurações do site; logs e notificações.

## 10. Outras páginas
- `/privacidade.html` — política LGPD.
- `/404.html` — página não encontrada.

## 11. Estados e responsividade
- Skeleton, vazio, erro, toast, modal, loading de botão.
- Tema escuro padrão + claro persistido em `localStorage`.
- Breakpoints: desktop ≥1024, tablet 768–1023, mobile <768.
- Menu hambúrguer, cards em 1 coluna, tabelas com rolagem horizontal.
- `aria-label`, foco visível, `prefers-reduced-motion` e link “pular para o conteúdo”.

## 12. Avatar e stickers

- **Avatar ao vivo** na seleção: o servidor envia `avatar.traits` em cada serviço; o front mescla principal + adicionais.
- Regras dos traços (`server/utils/avatar.js`): corte → cabelo; barba → barba; sobrancelha → sobrancelha; luzes → cabelo + luzes; hidratação/botox → cabelo + tratamento; combos unem os traços; só barba/sobrancelha = **careca**.
- O dono pode sobrescrever pelo painel (`servicos.avatar_traits`).
- **Sticker-card** no histórico do cliente, na consulta, no sucesso e no painel do dono.
- O snapshot do avatar é gravado em `agendamentos.avatar` no momento da reserva, então o histórico não muda depois.
