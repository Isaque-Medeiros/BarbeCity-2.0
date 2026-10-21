import { pool, encerrarPool, testarConexao } from '../config/db.js';

async function main() {
  const conexao = await testarConexao();
  console.log('══════════════════════════════════════════════');
  console.log('  BARBE CITY JARAGUÁ · STATUS DO BANCO');
  console.log('══════════════════════════════════════════════');
  console.log(`  Banco  : ${conexao.banco}`);
  console.log(`  Hora   : ${conexao.agora}`);
  console.log(`  Versão : ${String(conexao.versao).split(',')[0]}`);
  console.log('');

  const tabelas = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  );
  console.log(`  Tabelas (${tabelas.rowCount}): ${tabelas.rows.map((linha) => linha.table_name).join(', ')}`);
  console.log('');

  const contagens = await pool.query(
    `SELECT
       (SELECT count(*) FROM usuarios)::int AS usuarios,
       (SELECT count(*) FROM servicos)::int AS servicos,
       (SELECT count(*) FROM agendamentos)::int AS agendamentos,
       (SELECT count(*) FROM pagamentos)::int AS pagamentos,
       (SELECT count(*) FROM horarios_funcionamento)::int AS horarios,
       (SELECT count(*) FROM bloqueios)::int AS bloqueios,
       (SELECT count(*) FROM configuracoes)::int AS configuracoes`,
  );
  console.log('  Contagens:', contagens.rows[0]);
  console.log('');

  const status = await pool.query(
    `SELECT status, count(*)::int AS total FROM agendamentos GROUP BY status ORDER BY status`,
  );
  console.log('  Agendamentos por status:', Object.fromEntries(status.rows.map((linha) => [linha.status, linha.total])));
  console.log('');

  const servicos = await pool.query(
    `SELECT nome, preco, duracao_min, categoria, ativo, legado_id
     FROM servicos ORDER BY ordem, nome`,
  );
  console.table(servicos.rows);
  console.log('');

  const proximos = await pool.query(
    `SELECT a.codigo_publico, a.nome_cliente, s.nome AS servico, a.data_hora_inicio, a.status, a.valor_original
     FROM agendamentos a JOIN servicos s ON s.id = a.servico_id
     WHERE a.status IN ('pendente', 'confirmado')
     ORDER BY a.data_hora_inicio ASC LIMIT 10`,
  );
  console.log('  Próximos agendamentos ativos:');
  console.table(proximos.rows);
  console.log('══════════════════════════════════════════════');
}

main()
  .catch((erro) => {
    console.error('[db-status] erro:', erro.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await encerrarPool();
  });
