import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';
import { limitadorGeracaoIA } from '../middlewares/rateLimit.js';
import * as servicos from '../controllers/admin.servicos.controller.js';
import * as usuarios from '../controllers/admin.usuarios.controller.js';
import * as agendamentos from '../controllers/admin.agendamentos.controller.js';
import * as financeiro from '../controllers/admin.financeiro.controller.js';
import * as config from '../controllers/admin.config.controller.js';
import * as promocoes from '../controllers/admin.promocoes.controller.js';
import * as tema from '../controllers/admin.tema.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/dashboard', financeiro.dashboard);
router.get('/financeiro', financeiro.financeiro);

router.get('/servicos', servicos.listar);
router.post('/servicos', servicos.criar);
router.put('/servicos/:id', servicos.editar);
router.delete('/servicos/:id', servicos.excluir);

router.get('/promocoes', promocoes.listar);
router.post('/promocoes', promocoes.criar);
router.put('/promocoes/:id', promocoes.editar);
router.delete('/promocoes/:id', promocoes.excluir);

router.get('/tema', tema.listar);
router.get('/tema/:id', tema.detalhar);
router.post('/tema/gerar', limitadorGeracaoIA, tema.gerar);
router.post('/tema/reset', tema.resetar);
router.post('/tema/:id/ativar', tema.ativar);
router.delete('/tema/:id', tema.excluir);

router.get('/usuarios', usuarios.listar);
router.get('/usuarios/:id', usuarios.detalhar);
router.patch('/usuarios/:id/role', usuarios.alterarRole);
router.patch('/usuarios/:id/ativo', usuarios.alterarAtivo);
router.delete('/usuarios/:id', usuarios.excluir);

router.get('/agendamentos', agendamentos.listar);
router.post('/agendamentos', agendamentos.criarManual);
router.get('/agendamentos/:id', agendamentos.detalhar);
router.patch('/agendamentos/:id/status', agendamentos.alterarStatus);
router.patch('/agendamentos/:id/reagendar', agendamentos.reagendar);
router.post('/agendamentos/:id/confirmar-pagamento', agendamentos.confirmarPagamento);

router.get('/configuracoes', config.obterConfiguracoes);
router.put('/configuracoes', config.salvarConfiguracoes);
router.get('/horarios', config.obterHorarios);
router.put('/horarios', config.salvarHorarios);
router.get('/bloqueios', config.listarBloqueios);
router.post('/bloqueios', config.criarBloqueio);
router.delete('/bloqueios/:id', config.excluirBloqueio);
router.get('/logs', config.listarLogs);
router.get('/notificacoes', config.listarNotificacoes);
router.post('/notificacoes/:id/reenviar', config.reenviarNotificacao);

export default router;
