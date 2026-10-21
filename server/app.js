import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { carregarUsuario } from './middlewares/auth.js';
import { csrf } from './middlewares/csrf.js';
import { limitadorGlobal } from './middlewares/rateLimit.js';
import { rotaApiNaoEncontrada, tratarErros } from './middlewares/errors.js';
import authRoutes from './routes/auth.routes.js';
import servicosRoutes from './routes/servicos.routes.js';
import agendamentosRoutes from './routes/agendamentos.routes.js';
import pagamentosRoutes from './routes/pagamentos.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import adminRoutes from './routes/admin.routes.js';
import configRoutes from './routes/config.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.resolve(__dirname, '../public');

export function criarApp() {
  const app = express();

  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: config.producao ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Segurança e sessão apenas na API (evita consultar o banco a cada asset estático).
  app.use('/api', limitadorGlobal, csrf, carregarUsuario);

  app.get('/api/health', async (req, res) => {
    const { testarConexao } = await import('./config/db.js');
    try {
      const conexao = await testarConexao();
      res.json({
        ok: true,
        servidor: 'online',
        banco: conexao.banco,
        hora: conexao.agora,
        ambiente: config.nodeEnv,
        recursos: {
          google: Boolean(config.google.clientId && config.google.clientSecret),
          pix: Boolean(config.pix.accessToken),
          brevo: Boolean(config.brevo.apiKey),
          whatsappApi: Boolean(config.whatsapp.token && config.whatsapp.phoneNumberId),
          gemini: Boolean(config.gemini.chaves.length),
        },
      });
    } catch (erro) {
      res.status(503).json({ ok: false, servidor: 'online', banco: 'offline', erro: erro.message });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/servicos', servicosRoutes);
  app.use('/api/agendamentos', agendamentosRoutes);
  app.use('/api/pagamentos', pagamentosRoutes);
  app.use('/api/usuario', usuarioRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api', rotaApiNaoEncontrada);

  app.use(
    express.static(PUBLICO, {
      extensions: ['html'],
      maxAge: config.producao ? '1h' : 0,
      setHeaders: (res, arquivo) => {
        if (arquivo.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    if (path.extname(req.path)) return next();
    return res.sendFile(path.join(PUBLICO, 'index.html'));
  });

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return rotaApiNaoEncontrada(req, res);
    return res.status(404).sendFile(path.join(PUBLICO, '404.html'));
  });

  app.use(tratarErros);

  return app;
}
