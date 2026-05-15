// ============================================
// SYNAP - SERVICIO DE PUNTOS DE FIDELIZACION
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

class PuntosService {

  async configurarPrograma(datos: {
    negocio_id: string;
    nombre: string;
    puntos_por_compra: number;
    monto_por_punto: number;
  }) {
    const existente = await DatabaseConnection.query(
      `SELECT id FROM crm.programa_puntos WHERE negocio_id = $1 AND activo = true`,
      [datos.negocio_id]
    );

    if (existente.rows.length > 0) {
      await DatabaseConnection.query(
        `UPDATE crm.programa_puntos SET activo = false WHERE negocio_id = $1`,
        [datos.negocio_id]
      );
    }

    const result = await DatabaseConnection.query(
      `INSERT INTO crm.programa_puntos (negocio_id, nombre, puntos_por_compra, monto_por_punto)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [datos.negocio_id, datos.nombre, datos.puntos_por_compra, datos.monto_por_punto]
    );

    return result.rows[0];
  }

  async canjearPuntos(datos: {
    cliente_id: string;
    puntos_a_canjear: number;
    usuario_id: string;
    negocio_id: string;
  }) {
    return await DatabaseConnection.transaction(async (client) => {
      const cliente = await client.query(
        `SELECT id, puntos_acumulados FROM pos.clientes WHERE id = $1 AND negocio_id = $2 AND activo = true`,
        [datos.cliente_id, datos.negocio_id]
      );

      if (cliente.rows.length === 0) throw new AppError('Cliente no encontrado', 404);

      const puntosDisponibles = parseInt(cliente.rows[0].puntos_acumulados);
      if (datos.puntos_a_canjear > puntosDisponibles) {
        throw new AppError(`Puntos insuficientes. Disponibles: ${puntosDisponibles}`, 400);
      }

      const programa = await client.query(
        `SELECT * FROM crm.programa_puntos WHERE negocio_id = $1 AND activo = true`,
        [datos.negocio_id]
      );

      if (programa.rows.length === 0) throw new AppError('No hay programa de puntos activo', 400);

      const montoCanje = (datos.puntos_a_canjear / programa.rows[0].puntos_por_compra) * programa.rows[0].monto_por_punto;

      await client.query(
        `INSERT INTO crm.puntos_transacciones (cliente_id, puntos_canjeados, saldo_puntos, tipo)
         VALUES ($1,$2,$3,'canjeado')`,
        [datos.cliente_id, datos.puntos_a_canjear, puntosDisponibles - datos.puntos_a_canjear]
      );

      await client.query(
        `UPDATE pos.clientes SET puntos_acumulados = puntos_acumulados - $1 WHERE id = $2`,
        [datos.puntos_a_canjear, datos.cliente_id]
      );

      return {
        puntos_canjeados: datos.puntos_a_canjear,
        puntos_restantes: puntosDisponibles - datos.puntos_a_canjear,
        monto_canje: montoCanje,
        moneda: 'PYG'
      };
    });
  }

  async historialPuntos(cliente_id: string, negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT pt.*, v.numero_venta
       FROM crm.puntos_transacciones pt
       LEFT JOIN pos.ventas v ON pt.venta_id = v.id
       WHERE pt.cliente_id = $1
       ORDER BY pt.created_at DESC
       LIMIT 100`,
      [cliente_id]
    );

    return result.rows;
  }

  async rankingClientes(negocio_id: string, limite: number = 20) {
    const result = await DatabaseConnection.query(
      `SELECT id, nombre, apellido, telefono, puntos_acumulados,
              (SELECT COALESCE(SUM(v.total), 0) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as total_gastado,
              (SELECT COUNT(*) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as total_compras
       FROM pos.clientes c
       WHERE c.negocio_id = $1 AND c.activo = true AND c.puntos_acumulados > 0
       ORDER BY c.puntos_acumulados DESC
       LIMIT $2`,
      [negocio_id, limite]
    );

    return result.rows;
  }
}

export default new PuntosService();
