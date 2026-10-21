import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { limitadorAgendamento, limitadorConsulta } from '../middlewares/rateLimit.js';
import * as agendamentos from '../controllers/agendamentos.controller.js';

const router = Router();

router.get('/disponibilidade', limitadorConsulta, agendamentos.consultarDisponibilidade);
router.get('/disponibilidade/mes', limitadorConsulta, agendamentos.consultarDisponibilidadeMes);
router.get('/consulta', limitadorConsulta, agendamentos.consultar);
router.post('/consulta/cancelar', limitadorConsulta, agendamentos.cancelarPublico);
router.get('/meus', requireAuth, agendamentos.meus);
router.post('/', limitadorAgendamento, agendamentos.criar);
router.get('/:id', requireAuth, agendamentos.detalhar);
router.patch('/:id/cancelar', requireAuth, agendamentos.cancelar);

export default router;
