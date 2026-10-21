import { pool, encerrarPool } from '../config/db.js';
import { config } from '../config/env.js';

/**
 * Cria/atualiza o administrador inicial a partir do .env.
 * Útil para produção: `npm run db:admin`.
 */
async function main() {
  if (!config.admin.email || !config.admin.senha) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_SENHA no .env.');
  }
  const { gerarHashSenha } = await import('../utils/senha.js');
  const hash = await gerarHashSenha(config.admin.senha);
  const existente = await pool.query('SELECT id FROM usuarios WHERE lower(email) = $1', [config.admin.email]);
  if (existente.rows[0]) {
    await pool.query(
      `UPDATE usuarios SET nome = $1, senha_hash = $2, role = 'admin', ativo = TRUE, email_verificado = TRUE
       WHERE id = $3`,
      [config.admin.nome, hash, existente.rows[0].id],
    );
    console.log(`[admin] atualizado: ${config.admin.email}`);
  } else {
    await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, role, email_verificado, ativo)
       VALUES ($1, $2, $3, 'admin', TRUE, TRUE)`,
      [config.admin.nome, config.admin.email, hash],
    );
    console.log(`[admin] criado: ${config.admin.email}`);
  }
}

main()
  .catch((erro) => {
    console.error('[admin] erro:', erro.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await encerrarPool();
  });
