// ============================================
// SYNAP - RUTAS DE AUTENTICACION
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import AuthController from './auth.controller';
import { autenticar } from '../../middleware/auth.middleware';

const router = Router();

router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', autenticar, AuthController.logout);
router.get('/perfil', autenticar, AuthController.perfil);
router.put('/cambiar-password', autenticar, AuthController.cambiarPassword);

export default router;
