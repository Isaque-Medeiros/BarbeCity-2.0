import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as usuario from '../controllers/usuario.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', usuario.perfil);
router.put('/', usuario.atualizarPerfil);
router.put('/senha', usuario.alterarSenha);
router.delete('/', usuario.excluirConta);

export default router;
