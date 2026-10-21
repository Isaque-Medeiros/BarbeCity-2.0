# 01 · Visão Geral do Projeto

## 1. O que é
Sistema web de **agendamento para barbearia** feito para o pai do desenvolvedor.
É uma versão **remasterizada** de um site inicial já existente, agora com **banco de dados**, **login**, **pagamento**, **painel administrativo** e **visual moderno**.

## 2. Objetivos
- Apresentar a barbearia (landing page) com nome, local, cortes, serviços e telefones.
- Permitir agendamento de serviços de forma simples e intuitiva.
- Permitir pagamento (Dinheiro, Cartão, Pix) com validação automática do Pix.
- Oferecer área do cliente (histórico, agendamentos, dados).
- Oferecer área administrativa (usuários, serviços, financeiro).
- Ter visual escuro premium (preto + vermelho + dourado), clean e responsivo.
- Notificar o dono via WhatsApp a cada agendamento concluído.

## 3. Público-alvo (personas)
| Persona | Descrição | Necessidades |
|---------|-----------|--------------|
| **Cliente** | Qualquer pessoa que quer cortar cabelo/barba | Ver serviços, agendar, pagar, acompanhar histórico |
| **Dono/Admin** | O pai (barbeiro/proprietário) | Gerenciar serviços, usuários e finanças |
| **Visitante** | Não cadastrado | Ver a landing e agendar preenchendo dados na hora |

## 4. Serviços oferecidos
### Individuais
- Corte
- Barba
- Sobrancelha

### Combos
- Corte + Barba
- Corte + Sobrancelha
- Barba + Sobrancelha
- Total (Corte + Barba + Sobrancelha)

### Outros
- Luzes
- Hidratação capilar
- Botox Capilar

> ⚠️ Os serviços **podem ser criados, editados e excluídos** pelo admin no painel de gestão. Portanto o banco deve suportar CRUD dinâmico (não hard-coded).

## 5. Regras de negócio essenciais
1. **Login opcional**: o usuário pode agendar sem cadastro, mas deve informar os dados na tela de confirmação.
2. **Login com e-mail/senha** ou **Google OAuth**.
3. **Token de login enviado por e-mail** via Brevo (limite ~300/dia, suficiente).
4. **Pagamento**:
   - **Dinheiro**: informar a nota específica e perguntar se aceita troco em Pix.
   - **Cartão**: registro do pagamento.
   - **Pix**: perguntar se quer pagar **agora** ou **na hora**; se agora, uma API valida o pagamento e atualiza o status para "pago" automaticamente no banco.
5. Ao concluir o serviço, enviar **mensagem no WhatsApp** do dono com dados organizados do agendamento e status do pagamento.
6. Tema **escuro por padrão**, com opção de alternar para claro.

## 6. Tecnologias definidas (resumo)
- **Front-end**: JavaScript (HTML/CSS/JS, podendo usar Node para tooling).
- **Back-end/API**: Node.js (necessário para esconder chaves e conectar no Neon/Brevo/Pix).
- **Banco**: Neon PostgreSQL.
- **E-mail**: Brevo.
- **Login social**: Google OAuth.
- **Hospedagem**: Vercel (front), GitHub private (código), domínio próprio depois.
- **Node local**: `C:\Users\isaque.medeiros\Documents\node-v24.21.0-win-x64`.

## 7. Fora de escopo (por enquanto)
- Aplicativo mobile nativo (o site será responsivo, basta).
- Multi-barbearias / multi-unidades.
- Pagamento recorrente / assinaturas.

---

## 8. Atualização v2 (implementado)

- **Endereço real:** R. Jairo de Almeida Machado, 220 — Jaraguá, São Paulo/SP (próximo à ETEC Jaraguá).
- **Funcionamento:** segunda fechada; terça a sexta 13:00–20:20; sábado e domingo 09:00–20:20; intervalos de 15 min.
- **Contato:** (11) 91504-0871.
- **Serviços extras:** Hidratação Capilar adicionada (R$ 45 / 40 min) — valor editável no painel.
- **Login opcional:** sim; o cliente anônimo informa nome, telefone e e-mail opcional.
- **Multi-serviço:** o agendamento aceita até 4 adicionais além do principal.
- **Histórico:** 135 registros importados; ver [11-MIGRACAO-LEGADO.md](./11-MIGRACAO-LEGADO.md).
- **Fora de escopo mantido:** app nativo, multi-unidades, assinaturas.

