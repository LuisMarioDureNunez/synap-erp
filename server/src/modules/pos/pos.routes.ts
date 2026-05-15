// ============================================
// SYNAP - RUTAS DEL MODULO POS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth.middleware';
import { auditoriaMiddleware } from '../../middleware/auditoria.middleware';

const router = Router();

router.use(autenticar);

router.get('/productos', async (req, res, next) => {
  try {
    const { default: DatabaseConnection } = await import('../../config/database');
    const result = await DatabaseConnection.query(
      `SELECT * FROM pos.productos WHERE negocio_id = $1 AND activo = true ORDER BY nombre`,
      [req.usuario?.negocio_id]
    );
    res.json({ success: true, data: result.rows, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

router.get('/categorias', async (req, res, next) => {
  try {
    const { default: DatabaseConnection } = await import('../../config/database');
    const result = await DatabaseConnection.query(
      `SELECT * FROM pos.categorias WHERE negocio_id = $1 AND activo = true ORDER BY orden`,
      [req.usuario?.negocio_id]
    );
    res.json({ success: true, data: result.rows, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

export default router;
