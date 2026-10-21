import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { limitadorEmail, limitadorLogin } from '../middlewares/rateLimit.js';
import * as auth from '../controllers/auth.controller.js';

const router = Router();

router.get('/csrf', auth.csrf);
router.post('/cadastro', limitadorLogin, auth.cadastro);
router.post('/login', limitadorLogin, auth.login);
router.post('/solicitar-token', limitadorEmail, auth.solicitarToken);
router.post('/validar-token', limitadorLogin, auth.validarTokenLogin);
router.get('/google', auth.googleIniciar);
router.get('/google/callback', auth.googleCallback);
router.post('/logout', auth.logout);
router.get('/me', auth.me);
router.post('/esqueci-senha', limitadorEmail, auth.esqueciSenha);
router.post('/redefinir-senha', limitadorLogin, auth.redefinirSenha);
router.post('/reenviar-verificacao', requireAuth, auth.reenviarVerificacao);
router.post('/verificar-email', requireAuth, auth.verificarEmail);

export default router;
