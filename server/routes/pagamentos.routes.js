import { Router } from 'express';
import { limitadorConsulta, limitadorWebhook } from '../middlewares/rateLimit.js';
import * as pagamentos from '../controllers/pagamentos.controller.js';

const router = Router();

router.post('/', pagamentos.registrar);
router.post('/pix/criar', limitadorConsulta, pagamentos.criarPix);
router.get('/pix/:agendamentoId/status', limitadorConsulta, pagamentos.statusPix);
router.post('/pix/webhook', limitadorWebhook, pagamentos.webhookPix);

export default router;
