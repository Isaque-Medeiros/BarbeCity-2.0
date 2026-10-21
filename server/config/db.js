import { Pool, neonConfig } from '@neondatabase/serverless';
import WebSocket from 'ws';
import { config } from './env.js';

// A rede local (e a Vercel) bloqueiam a porta 5432. O driver serverless do Neon
// usa WebSocket sobre HTTPS (443), mantendo a mesma API de Pool/transações.
// Em desenvolvimento aceitamos certificados do proxy local; em produção a
// verificação TLS permanece ativa.
class WebSocketNeon extends WebSocket {
  constructor(endereco, protocolos) {
    super(endereco, protocolos, { rejectUnauthorized: config.producao });
  }
}

neonConfig.webSocketConstructor = WebSocketNeon;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;


export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pool.on('error', (erro) => {
  console.error('[db] erro inesperado no pool:', erro.message);
});

export async function query(texto, parametros = []) {
  const inicio = Date.now();
  try {
    return await pool.query(texto, parametros);
  } finally {
    const duracao = Date.now() - inicio;
    if (duracao > 1500) {
      console.warn(`[db] consulta lenta (${duracao}ms): ${texto.slice(0, 120)}`);
    }
  }
}

export async function um(texto, parametros = []) {
  const resultado = await query(texto, parametros);
  return resultado.rows[0] ?? null;
}

export async function varios(texto, parametros = []) {
  const resultado = await query(texto, parametros);
  return resultado.rows;
}

export async function comTransacao(fn) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    try {
      await cliente.query('ROLLBACK');
    } catch (erroRollback) {
      console.error('[db] falha no rollback:', erroRollback.message);
    }
    throw erro;
  } finally {
    cliente.release();
  }
}

export async function testarConexao() {
  const resultado = await pool.query(
    'SELECT now() AS agora, current_database() AS banco, version() AS versao',
  );
  return resultado.rows[0];
}

export async function encerrarPool() {
  await pool.end();
}

