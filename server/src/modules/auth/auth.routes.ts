import { Router } from 'express';
import AuthController from './auth.controller';
import { autenticar } from '../../middleware/auth.middleware';

const router = Router();

router.post('/login', (req, res, next) => AuthController.login(req, res, next));
router.post('/refresh', (req, res, next) => AuthController.refreshToken(req, res, next));
router.post('/logout', autenticar, (req, res, next) => AuthController.logout(req, res, next));
router.get('/perfil', autenticar, (req, res, next) => AuthController.perfil(req, res, next));
router.put('/cambiar-password', autenticar, (req, res, next) => AuthController.cambiarPassword(req, res, next));

export default router;
