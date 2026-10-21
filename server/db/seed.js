import { pool, encerrarPool } from '../config/db.js';
import { config } from '../config/env.js';
import { gerarHashSenha } from '../utils/senha.js';

/**
 * Serviços iniciais (espelham os dados legados + Hidratação capilar, que faltava).
 * `legadoId` mantém o vínculo com os agendamentos antigos.
 */
export const SERVICOS_SEED = [
  {
    legadoId: 6,
    slug: 'corte',
    nome: 'Corte',
    descricao:
      'Corte tradicional na tesoura e máquina, com acabamento personalizado, lavagem e finalização com produtos profissionais.',
    preco: 30,
    duracaoMin: 30,
    categoria: 'individual',
    icone: 'scissors',
    destaque: true,
    ordem: 1,
  },
  {
    legadoId: 7,
    slug: 'barba',
    nome: 'Barba',
    descricao:
      'Aparação, modelagem e hidratação da barba com toalha quente, óleo e finalização alinhada ao formato do rosto.',
    preco: 20,
    duracaoMin: 20,
    categoria: 'individual',
    icone: 'razor',
    destaque: true,
    ordem: 2,
  },
  {
    legadoId: 9,
    slug: 'sobrancelha',
    nome: 'Sobrancelha',
    descricao:
      'Design de sobrancelha com pinça e navalha, respeitando o formato do rosto e o estilo de cada cliente.',
    preco: 10,
    duracaoMin: 15,
    categoria: 'individual',
    icone: 'eyebrow',
    destaque: false,
    ordem: 3,
  },
  {
    legadoId: 14,
    slug: 'corte-barba',
    nome: 'Corte + Barba',
    descricao:
      'O clássico da casa: corte completo e barba com toalha quente, finalizados com produtos profissionais.',
    preco: 50,
    duracaoMin: 50,
    categoria: 'combo',
    icone: 'combo',
    destaque: true,
    ordem: 4,
  },
  {
    legadoId: 15,
    slug: 'barba-sobrancelha',
    nome: 'Barba + Sobrancelha',
    descricao:
      'Barba modelada com toalha quente e design de sobrancelha para um visual alinhado do início ao fim.',
    preco: 30,
    duracaoMin: 35,
    categoria: 'combo',
    icone: 'combo',
    destaque: false,
    ordem: 5,
  },
  {
    legadoId: 16,
    slug: 'corte-sobrancelha',
    nome: 'Corte + Sobrancelha',
    descricao:
      'Corte personalizado com acabamento na navalha e design de sobrancelha incluso.',
    preco: 40,
    duracaoMin: 45,
    categoria: 'combo',
    icone: 'combo',
    destaque: false,
    ordem: 6,
  },
  {
    legadoId: 17,
    slug: 'combo-total',
    nome: 'Corte + Barba + Sobrancelha',
    descricao:
      'Experiência completa: corte, barba com toalha quente e design de sobrancelha em um único atendimento.',
    preco: 60,
    duracaoMin: 65,
    categoria: 'combo',
    icone: 'crown',
    destaque: true,
    ordem: 7,
  },
  {
    legadoId: 10,
    slug: 'luzes',
    nome: 'Luzes',
    descricao:
      'Luzes com técnica profissional para iluminar o visual, com avaliação prévia do tom e do tipo de cabelo.',
    preco: 60,
    duracaoMin: 70,
    categoria: 'outros',
    icone: 'highlights',
    destaque: false,
    ordem: 8,
  },
  {
    legadoId: null,
    slug: 'hidratacao-capilar',
    nome: 'Hidratação Capilar',
    descricao:
      'Hidratação profunda com produtos profissionais para devolver brilho, maciez e força aos fios.',
    preco: 45,
    duracaoMin: 40,
    categoria: 'outros',
    icone: 'droplet',
    destaque: false,
    ordem: 9,
  },
  {
    legadoId: 11,
    slug: 'botox-capilar',
    nome: 'Botox Capilar',
    descricao:
      'Tratamento de reconstrução que reduz o volume, sela as cutículas e devolve o brilho natural aos fios.',
    preco: 50,
    duracaoMin: 40,
    categoria: 'outros',
    icone: 'flask',
    destaque: false,
    ordem: 10,
  },
];

/**
 * Horários no padrão PostgreSQL/JS: 0 = domingo ... 6 = sábado.
 * Convertidos do banco legado (que usava 0 = segunda ... 6 = domingo).
 */
export const HORARIOS_SEED = [
  { diaSemana: 0, abertura: '09:00', fechamento: '20:20', intervaloMin: 15, ativo: true },
  { diaSemana: 1, abertura: '00:00', fechamento: '00:00', intervaloMin: 15, ativo: false },
  { diaSemana: 2, abertura: '13:00', fechamento: '20:20', intervaloMin: 15, ativo: true },
  { diaSemana: 3, abertura: '13:00', fechamento: '20:20', intervaloMin: 15, ativo: true },
  { diaSemana: 4, abertura: '13:00', fechamento: '20:20', intervaloMin: 15, ativo: true },
  { diaSemana: 5, abertura: '13:00', fechamento: '20:20', intervaloMin: 15, ativo: true },
  { diaSemana: 6, abertura: '09:00', fechamento: '20:20', intervaloMin: 15, ativo: true },
];

export const CONFIGURACOES_SEED = {
  nome_barbearia: 'Barbe City Jaraguá',
  slogan: 'Tradição e estilo em cada corte.',
  subtitulo: 'Barbearia Premium',
  sobre:
    'Anderson Barbeiro transforma o visual dos clientes com cortes modernos e tradicionais. Na Barbe City Jaraguá, cada visita é uma experiência única de cuidado e estilo, com produtos profissionais de alta qualidade e técnicas atualizadas.',
  endereco: 'R. Jairo de Almeida Machado, 220 — Jaraguá, São Paulo — SP',
  telefone: '(11) 91504-0871',
  whatsapp: '5511915040871',
  email_contato: config.brevo.remetenteEmail || config.donoEmail,
  horario_texto: 'Ter a Sex: 13h às 20h · Sáb e Dom: 09h às 20h',
  mapa_url:
    'https://www.google.com/maps/search/?api=1&query=R.+Jairo+de+Almeida+Machado,+220+-+Jaragu%C3%A1,+S%C3%A3o+Paulo+-+SP',
  versiculo: 'Deus é fiel',
  versiculo_ref: 'Atos 17:28',
  versiculo_texto: 'Porque nele vivemos, e nos movemos, e existimos.',
  instagram: '',
  aviso_agendamento:
    'Chegue com 10 minutos de antecedência. Em caso de imprevisto, cancele pelo site.',
  anos_experiencia: '10',
};

async function semearServicos(cliente) {
  for (const servico of SERVICOS_SEED) {
    await cliente.query(
      `INSERT INTO servicos
         (legado_id, slug, nome, descricao, preco, duracao_min, categoria, icone, destaque, ativo, ordem)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)
       ON CONFLICT (slug) DO NOTHING`,
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
        servico.ordem,
      ],
    );
  }
}

async function semearHorarios(cliente) {
  for (const horario of HORARIOS_SEED) {
    await cliente.query(
      `INSERT INTO horarios_funcionamento
         (dia_semana, abertura, fechamento, intervalo_min, ativo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (dia_semana) DO NOTHING`,
      [horario.diaSemana, horario.abertura, horario.fechamento, horario.intervaloMin, horario.ativo],
    );
  }
}

async function semearConfiguracoes(cliente) {
  for (const [chave, valor] of Object.entries(CONFIGURACOES_SEED)) {
    await cliente.query(
      `INSERT INTO configuracoes (chave, valor, descricao)
       VALUES ($1, $2, $3)
       ON CONFLICT (chave) DO NOTHING`,
      [chave, String(valor), null],
    );
  }
}

async function semearAdmin(cliente) {
  const { nome, email, senha } = config.admin;
  if (!email || !senha) {
    console.warn('[seed] ADMIN_EMAIL/ADMIN_SENHA ausentes — admin não criado.');
    return null;
  }
  if (senha.length < 8) {
    throw new Error('ADMIN_SENHA precisa ter no mínimo 8 caracteres.');
  }
  const hash = await gerarHashSenha(senha);
  const existente = await cliente.query('SELECT id FROM usuarios WHERE lower(email) = $1', [email]);
  if (existente.rows[0]) {
    await cliente.query(
      `UPDATE usuarios
       SET nome = $2, senha_hash = $3, role = 'admin', ativo = TRUE, email_verificado = TRUE
       WHERE id = $1`,
      [existente.rows[0].id, nome, hash],
    );
    return existente.rows[0].id;
  }
  const criado = await cliente.query(
    `INSERT INTO usuarios (nome, email, senha_hash, role, email_verificado, ativo)
     VALUES ($1, $2, $3, 'admin', TRUE, TRUE)
     RETURNING id`,
    [nome, email, hash],
  );
  return criado.rows[0].id;
}

async function main() {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await semearServicos(cliente);
    await semearHorarios(cliente);
    await semearConfiguracoes(cliente);
    const adminId = await semearAdmin(cliente);
    await cliente.query('COMMIT');

    const totais = await cliente.query(
      `SELECT
         (SELECT count(*) FROM servicos) AS servicos,
         (SELECT count(*) FROM horarios_funcionamento) AS horarios,
         (SELECT count(*) FROM configuracoes) AS configuracoes`,
    );
    console.log('[seed] concluído:', totais.rows[0]);
    if (adminId) console.log(`[seed] admin garantido: ${config.admin.email}`);
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

main()
  .catch((erro) => {
    console.error('[seed] erro:', erro.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await encerrarPool();
  });
