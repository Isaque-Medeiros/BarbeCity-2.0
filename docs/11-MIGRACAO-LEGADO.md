# 11 · Migração do Banco Legado

## 1. Origem
Os arquivos originais foram preservados na raiz e copiados para [`legacy/`](../legacy):

| Arquivo | Conteúdo | SHA-256 |
|---|---|---|
| `servicos.json` | 9 serviços | `506307299F80139733CBAC635005A14CBDEA481ABE91A9D455124BA74048DE79` |
| `agendamentos.json` | 135 agendamentos | `6FB06B1970722B86D7B5AA1F8743D0460A08FC835CAD4E46FCFE782D97C27296` |
| `configuracao_horarios.json` | 7 dias | `73F665109B69B496F9D053224B18260DA3D108B7C3AAFC6C347825A4E2738C38` |
| `bloqueios.json` | vazio | `4F53CDA18C2BAA0C0354BB5F9A3ECBE5ED12AB4D8E11BA873C2F11161202B945` |

## 2. Regra aprovada de status
| Legado | Destino |
|---|---|
| `agendado` + fim no passado | `concluido` |
| `agendado` + fim no futuro | `confirmado` |
| `concluido` | `concluido` |
| `cancelado` | `cancelado` |
| `ausente` | `ausente` |
| outro | concluído se passado; confirmado se futuro |

O status original é preservado em `agendamentos.legado_status`.

## 3. Mapeamento de campos
| Legado | Novo |
|---|---|
| `servicos.id` | `servicos.legado_id` |
| `valor` | `servicos.preco` |
| `duracao_minutos` | `servicos.duracao_min` |
| `tipo` principal/adicional/combo | `categoria` individual/outros/combo |
| `agendamentos.id` | `agendamentos.id` (UUID preservado) |
| `hash_id` | `codigo_publico` |
| `cliente_nome` | `nome_cliente` |
| `telefone_contato` | `telefone_cliente` (E.164 `55…`) |
| `data_hora_inicio/fim` (local) | `TIMESTAMPTZ` (UTC) |
| `valor_original` / `valor_pago` | preservados |
| `nota_opcional` | `observacao` |
| `status` | `status` + `legado_status` |
| registro completo | `dados_origem` (JSONB) |
| `configuracao_horarios` | `horarios_funcionamento` |
| `bloqueios` | `bloqueios` |

## 4. Conversões importantes
- **Fuso**: datas legadas sem offset foram interpretadas como `America/Sao_Paulo` e convertidas para UTC (`-03:00` em 2026).
- **Dia da semana**: o legado usava `0 = segunda … 6 = domingo`; o novo padrão é `0 = domingo … 6 = sábado`. Ex.: segunda fechada e domingo aberto foram preservados corretamente.
- **Telefones**: `11 96287 1086`, `55 11 91450-3034`, `11064225508` etc. foram normalizados para `55…`; nenhum ficou inválido.
- **Pagamentos**: todos os 135 registros tinham `valor_pago = 0`; **nenhum pagamento foi inventado**. O dashboard mostra o histórico estimado separado da receita conciliada.

## 5. Serviços finais
| Legado | Nome atual | Preço | Duração | Categoria |
|---|---|---|---|---|
| 6 | Corte | 30 | 30 | individual |
| 7 | Barba | 20 | 20 | individual |
| 9 | Sobrancelha | 10 | 15 | individual |
| 14 | Corte + Barba | 50 | 50 | combo |
| 15 | Barba + Sobrancelha | 30 | 35 | combo |
| 16 | Corte + Sobrancelha | 40 | 45 | combo |
| 17 | Corte + Barba + Sobrancelha | 60 | 65 | combo |
| 10 | Luzes | 60 | 70 | outros |
| 11 | Botox Capilar | 50 | 40 | outros |
| — | **Hidratação Capilar** (novo) | 45 | 40 | outros |

> O serviço “Hidratação Capilar” não existia no JSON; foi criado como sugestão editável no admin.

## 6. Resultado da importação
```
Serviços mapeados ........: 9
Horários inseridos .......: 0 (já semeados)
Bloqueios inseridos ......: 0
Agendamentos lidos .......: 135
Agendamentos importados ..: 135
Já existentes (ignorados) : 0
Telefones a revisar ......: 0
Status: 129 concluídos, 4 confirmados, 1 cancelado, 1 ausente
Valor histórico estimado .: R$ 4.230,00
```

## 7. Como repetir
```bash
npm run db:migrate
npm run db:seed
npm run db:import
```
O script é idempotente (`ON CONFLICT DO NOTHING`) e aborta se encontrar sobreposições. Para reimportar do zero, é preciso limpar as tabelas de agendamentos/pagamentos (não recomendado em produção).

## 8. Verificações automáticas
`tests/migracao.test.js` valida:
- 135 agendamentos e 9 serviços;
- todos os `servico_id` existem;
- nenhuma sobreposição de intervalos;
- status sempre válidos;
- preservação de id, código, telefone e valores;
- conversão de horários e categorias.
