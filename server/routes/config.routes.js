import { Router } from 'express';
import * as config from '../controllers/config.controller.js';

const router = Router();

router.get('/publica', config.publica);

export default router;
