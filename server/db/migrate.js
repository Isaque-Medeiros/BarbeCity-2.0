import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, encerrarPool, testarConexao } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const conexao = await testarConexao();
  console.log(`[migrate] conectado ao banco "${conexao.banco}"`);
  console.log(`[migrate] servidor: ${String(conexao.versao).split(',')[0]}`);

  const sql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);

  const tabelas = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  );
  console.log(`[migrate] schema aplicado. Tabelas: ${tabelas.rows.map((linha) => linha.table_name).join(', ')}`);
}

main()
  .catch((erro) => {
    console.error('[migrate] erro:', erro.message);
    if (erro.code) console.error('[migrate] código:', erro.code);
    process.exitCode = 1;
  })
  .finally(async () => {
    await encerrarPool();
  });
