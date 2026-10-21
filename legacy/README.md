# Dados legados (somente leitura)

Cópia fiel dos arquivos usados pelo sistema anterior. **Não edite** estes arquivos: eles são a fonte histórica da migração.

| Arquivo | Registros | SHA-256 |
|---|---|---|
| `servicos.json` | 9 serviços | `506307299F80139733CBAC635005A14CBDEA481ABE91A9D455124BA74048DE79` |
| `agendamentos.json` | 135 agendamentos | `6FB06B1970722B86D7B5AA1F8743D0460A08FC835CAD4E46FCFE782D97C27296` |
| `configuracao_horarios.json` | 7 dias | `73F665109B69B496F9D053224B18260DA3D108B7C3AAFC6C347825A4E2738C38` |
| `bloqueios.json` | 0 | `4F53CDA18C2BAA0C0354BB5F9A3ECBE5ED12AB4D8E11BA873C2F11161202B945` |

Importação:
```bash
npm run db:import
```
Regras e mapeamento: [`docs/11-MIGRACAO-LEGADO.md`](../docs/11-MIGRACAO-LEGADO.md).
