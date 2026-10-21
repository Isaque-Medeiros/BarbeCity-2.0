import { criarApp } from './app.js';
import { config } from './config/env.js';
import { testarConexao, encerrarPool } from './config/db.js';

const app = criarApp();

const servidor = app.listen(config.porta, async () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   BARBE CITY JARAGUÁ · SERVIDOR ONLINE   ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log(`  Ambiente : ${config.nodeEnv}`);
  console.log(`  Endereço : ${config.baseUrl}`);
  console.log(`  Painel   : ${config.baseUrl}/admin.html`);
  try {
    const conexao = await testarConexao();
    console.log(`  Banco    : ${conexao.banco} (conectado)`);
  } catch (erro) {
    console.error(`  Banco    : indisponível — ${erro.message}`);
    console.error('  Dica: verifique DATABASE_URL e a conectividade com o Neon.');
  }
  console.log('');
});

function encerrar(sinal) {
  console.log(`\n[server] recebido ${sinal}, encerrando...`);
  servidor.close(async () => {
    await encerrarPool().catch(() => {});
    process.exit(0);
  });
}

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));
process.on('unhandledRejection', (motivo) => {
  console.error('[server] promise rejeitada sem tratamento:', motivo);
});
