import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, encerrarPool } from '../config/db.js';
import { localParaUtc } from '../utils/datas.js';
import {
  mapearDiaSemanaLegado,
  normalizarAgendamentoLegado,
  normalizarServicoLegado,
} from './legado.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '../..');

function lerJson(nome, { opcional = false } = {}) {
  const candidatos = [path.join(RAIZ, 'legacy', nome), path.join(RAIZ, nome)];
  for (const caminho of candidatos) {
    if (fs.existsSync(caminho)) {
      const conteudo = fs.readFileSync(caminho, 'utf8').replace(/^\uFEFF/, '');
      return JSON.parse(conteudo);
    }
  }
  if (opcional) {
    console.warn(`[import] ${nome} não encontrado — etapa ignorada (dados pessoais não são versionados).`);
    return [];
  }
  throw new Error(`Arquivo legado não encontrado: ${nome}`);
}

function detectarSobreposicoes(itens) {
  const ordenados = [...itens].sort((a, b) => a.inicio - b.inicio);
  const conflitos = [];
  for (let i = 1; i < ordenados.length; i += 1) {
    if (ordenados[i].inicio < ordenados[i - 1].fim) {
      conflitos.push({
        anterior: ordenados[i - 1].dadosOrigem,
        atual: ordenados[i].dadosOrigem,
      });
    }
  }
  return conflitos;
}

async function importarServicos(cliente, servicosLegado) {
  for (const bruto of servicosLegado) {
    const servico = normalizarServicoLegado(bruto);
    await cliente.query(
      `INSERT INTO servicos
         (legado_id, slug, nome, descricao, preco, duracao_min, categoria, icone, destaque, ativo, ordem)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT DO NOTHING`,
      [
        servico.legadoId,
        servico.slug,
        servico.nome,
        servico.descricao,
        servico.preco,
        servico.duracaoMin,
        servico.categoria,
        servico.icone,
        servico.destaque,
        servico.ativo,
        servico.ordem,
      ],
    );
  }
  const mapa = await cliente.query('SELECT id, legado_id FROM servicos WHERE legado_id IS NOT NULL');
  return new Map(mapa.rows.map((linha) => [Number(linha.legado_id), linha.id]));
}

async function importarHorarios(cliente, horariosLegado) {
  let inseridos = 0;
  for (const horario of horariosLegado) {
    const diaSemana = mapearDiaSemanaLegado(horario.dia_semana);
    if (diaSemana === null) continue;
    const ativo = Boolean(horario.ativo);
    const resultado = await cliente.query(
      `INSERT INTO horarios_funcionamento
         (dia_semana, abertura, fechamento, intervalo_min, ativo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (dia_semana) DO NOTHING`,
      [
        diaSemana,
        horario.abertura || '09:00',
        horario.fechamento || '18:00',
        Number(horario.intervalo_corte_minutos) || 15,
        ativo,
      ],
    );
    inseridos += resultado.rowCount;
  }
  return inseridos;
}

async function importarBloqueios(cliente, bloqueiosLegado) {
  let inseridos = 0;
  for (const bloqueio of bloqueiosLegado) {
    const inicioTexto = bloqueio.inicio || bloqueio.data_hora_inicio || bloqueio.data;
    const fimTexto = bloqueio.fim || bloqueio.data_hora_fim || bloqueio.data;
    if (!inicioTexto || !fimTexto) continue;
    const inicio = localParaUtc(String(inicioTexto).replace(/(\.\d+)?$/, ''));
    const fim = localParaUtc(String(fimTexto).replace(/(\.\d+)?$/, ''));
    const resultado = await cliente.query(
      `INSERT INTO bloqueios (inicio, fim, motivo)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM bloqueios WHERE inicio = $1 AND fim = $2
       )`,
      [inicio, fim, bloqueio.motivo || bloqueio.descricao || null],
    );
    inseridos += resultado.rowCount;
  }
  return inseridos;
}


async function importarAgendamentos(cliente, brutos, mapaServicos, agora) {
  const normalizados = brutos.map((bruto) => {
    const inicio = localParaUtc(bruto.data_hora_inicio);
    const fim = localParaUtc(bruto.data_hora_fim);
    return normalizarAgendamentoLegado(bruto, { agora, dataInicio: inicio, dataFim: fim });
  });

  const conflitos = detectarSobreposicoes(normalizados);
  if (conflitos.length > 0) {
    console.error(`[import] ${conflitos.length} sobreposição(ões) encontradas no histórico:`);
    for (const conflito of conflitos.slice(0, 5)) {
      console.error(
        `  - ${conflito.anterior.cliente_nome} (${conflito.anterior.data_hora_inicio}) x ${conflito.atual.cliente_nome} (${conflito.atual.data_hora_inicio})`,
      );
    }
    throw new Error('Importação abortada: resolva as sobreposições antes de continuar.');
  }

  let inseridos = 0;
  let ignorados = 0;
  let adicionaisInseridos = 0;
  const telefonesInvalidos = [];

  for (const item of normalizados) {
    const servicoId = mapaServicos.get(item.servicoLegadoId);
    if (!servicoId) {
      throw new Error(
        `Serviço legado ${item.servicoLegadoId} não encontrado (agendamento ${item.codigoPublico}). Rode npm run db:seed antes.`,
      );
    }
    if (!item.telefoneValido) telefonesInvalidos.push({ codigo: item.codigoPublico, telefone: item.telefoneCliente });

    const resultado = await cliente.query(
      `INSERT INTO agendamentos
         (id, codigo_publico, servico_id, nome_cliente, telefone_cliente,
          data_hora_inicio, data_hora_fim, duracao_min, valor_original, valor_pago,
          status, observacao, origem, legado_status, dados_origem, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'legado', $13, $14::jsonb, $15, $16)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        item.id,
        item.codigoPublico,
        servicoId,
        item.nomeCliente,
        item.telefoneCliente || String(item.dadosOrigem.telefone_contato ?? ''),
        item.inicio,
        item.fim,
        item.duracaoMin,
        item.valorOriginal,
        item.valorPago,
        item.status,
        item.observacao,
        item.legadoStatus,
        JSON.stringify(item.dadosOrigem),
        item.criadoEm ?? new Date(),
        item.atualizadoEm ?? new Date(),
      ],
    );

    if (resultado.rowCount === 0) {
      ignorados += 1;
      continue;
    }
    inseridos += 1;

    if (item.adicionaisLegado) {
      const ids = item.adicionaisLegado
        .split(',')
        .map((valor) => Number(valor.trim()))
        .filter((valor) => Number.isInteger(valor) && valor > 0 && valor !== item.servicoLegadoId);
      for (const id of [...new Set(ids)]) {
        const adicionalId = mapaServicos.get(id);
        if (!adicionalId) continue;
        const servico = await cliente.query('SELECT nome, preco, duracao_min FROM servicos WHERE id = $1', [adicionalId]);
        if (!servico.rows[0]) continue;
        const linha = servico.rows[0];
        await cliente.query(
          `INSERT INTO agendamento_itens (agendamento_id, servico_id, nome_snapshot, preco, duracao_min)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (agendamento_id, servico_id) DO NOTHING`,
          [item.id, adicionalId, linha.nome, linha.preco, linha.duracao_min],
        );
        adicionaisInseridos += 1;
      }
    }
  }

  return { inseridos, ignorados, telefonesInvalidos, adicionaisInseridos, normalizados };
}


async function relatorio(cliente) {
  const resumo = await cliente.query(
    `SELECT status, count(*)::int AS total
     FROM agendamentos GROUP BY status ORDER BY status`,
  );
  const totais = await cliente.query(
    `SELECT
       count(*)::int AS agendamentos,
       count(*) FILTER (WHERE origem = 'legado')::int AS legados,
       count(*) FILTER (WHERE origem = 'legado' AND status = 'concluido')::int AS legados_concluidos,
       count(*) FILTER (WHERE origem = 'legado' AND status = 'confirmado')::int AS legados_confirmados,
       count(*) FILTER (WHERE origem = 'legado' AND status = 'cancelado')::int AS legados_cancelados,
       count(*) FILTER (WHERE origem = 'legado' AND status = 'ausente')::int AS legados_ausentes,
       COALESCE(sum(valor_original) FILTER (WHERE origem = 'legado' AND status = 'concluido'), 0)::numeric(10,2) AS valor_historico_estimado
     FROM agendamentos`,
  );
  const extras = await cliente.query(
    `SELECT
       (SELECT count(*) FROM servicos)::int AS servicos,
       (SELECT count(*) FROM horarios_funcionamento)::int AS horarios,
       (SELECT count(*) FROM bloqueios)::int AS bloqueios,
       (SELECT count(*) FROM usuarios)::int AS usuarios,
       (SELECT count(*) FROM pagamentos)::int AS pagamentos`,
  );
  return { resumo: resumo.rows, totais: totais.rows[0], extras: extras.rows[0] };
}

async function main() {
  console.log('[import] lendo arquivos legados...');
  const servicosLegado = lerJson('servicos.json');
  const agendamentosLegado = lerJson('agendamentos.json', { opcional: true });
  const horariosLegado = lerJson('configuracao_horarios.json');
  const bloqueiosLegado = lerJson('bloqueios.json');

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const mapaServicos = await importarServicos(cliente, servicosLegado);
    const horariosInseridos = await importarHorarios(cliente, horariosLegado);
    const bloqueiosInseridos = await importarBloqueios(cliente, bloqueiosLegado);
    const resultado = await importarAgendamentos(cliente, agendamentosLegado, mapaServicos, new Date());

    await cliente.query('COMMIT');

    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('  IMPORTAÇÃO DO BANCO LEGADO — RESUMO');
    console.log('══════════════════════════════════════════════');
    console.log(`  Serviços mapeados ........: ${mapaServicos.size}`);
    console.log(`  Horários inseridos .......: ${horariosInseridos}`);
    console.log(`  Bloqueios inseridos ......: ${bloqueiosInseridos}`);
    console.log(`  Agendamentos lidos .......: ${agendamentosLegado.length}`);
    console.log(`  Agendamentos importados ..: ${resultado.inseridos}`);
    console.log(`  Já existentes (ignorados) : ${resultado.ignorados}`);
    console.log(`  Itens adicionais .........: ${resultado.adicionaisInseridos}`);
    console.log(`  Telefones a revisar ......: ${resultado.telefonesInvalidos.length}`);
    if (resultado.telefonesInvalidos.length > 0) {
      for (const item of resultado.telefonesInvalidos.slice(0, 10)) {
        console.log(`    · ${item.codigo} — "${item.telefone}"`);
      }
    }
    console.log('');
    const dados = await relatorio(cliente);
    console.log('  Status do histórico:');
    for (const linha of dados.resumo) console.log(`    · ${linha.status}: ${linha.total}`);
    console.log('');
    console.log('  Totais:', dados.totais);
    console.log('  Outros:', dados.extras);
    console.log('══════════════════════════════════════════════');
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

main()
  .catch((erro) => {
    console.error('[import] erro:', erro.message);
    if (erro.detail) console.error('[import] detalhe:', erro.detail);
    process.exitCode = 1;
  })
  .finally(async () => {
    await encerrarPool();
  });
