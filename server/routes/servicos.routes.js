import { Router } from 'express';
import * as servicos from '../controllers/servicos.controller.js';

const router = Router();

router.get('/', servicos.listar);
router.get('/:id', servicos.detalhar);

export default router;
