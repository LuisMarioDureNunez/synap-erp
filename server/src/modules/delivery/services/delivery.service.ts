// ============================================
// SYNAP - SERVICIO DE DELIVERY
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ZONAS, REPARTIDORES, PEDIDOS, TRACKING
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

class DeliveryService {

  async crearZona(datos: {
    negocio_id: string;
    nombre: string;
    costo: number;
    tiempo_estimado_minutos?: number;
  }) {
    const result = await DatabaseConnection.query(
      `INSERT INTO delivery.zonas (negocio_id, nombre, costo, tiempo_estimado_minutos)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [datos.negocio_id, datos.nombre, datos.costo, datos.tiempo_estimado_minutos || 30]
    );
    return result.rows[0];
  }

  async listarZonas(negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT z.*,
        (SELECT COUNT(*) FROM delivery.pedidos p WHERE p.zona_id = z.id AND DATE(p.created_at) = CURRENT_DATE) as pedidos_hoy,
        (SELECT COUNT(*) FROM delivery.pedidos p WHERE p.zona_id = z.id AND p.estado IN ('pendiente','confirmado','preparando','en_camino')) as pedidos_activos
       FROM delivery.zonas z
       WHERE z.negocio_id = $1 AND z.activo = true
       ORDER BY z.nombre`,
      [negocio_id]
    );
    return result.rows;
  }

  async actualizarZona(id: string, negocio_id: string, datos: Partial<{ nombre: string; costo: number; tiempo_estimado_minutos: number; activo: boolean }>) {
    const campos: string[] = [];
    const valores: any[] = [];
    let contador = 1;

    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined) {
        campos.push(`${clave} = $${contador}`);
        valores.push(valor);
        contador++;
      }
    }

    if (campos.length === 0) throw new AppError('No hay campos para actualizar', 400);

    valores.push(id, negocio_id);
    const result = await DatabaseConnection.query(
      `UPDATE delivery.zonas SET ${campos.join(', ')} WHERE id = $${contador} AND negocio_id = $${contador + 1} RETURNING *`,
      valores
    );

    if (result.rows.length === 0) throw new AppError('Zona no encontrada', 404);
    return result.rows[0];
  }

  async crearRepartidor(datos: {
    negocio_id: string;
    nombre: string;
    telefono?: string;
    vehiculo?: string;
  }) {
    const result = await DatabaseConnection.query(
      `INSERT INTO delivery.repartidores (negocio_id, nombre, telefono, vehiculo)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [datos.negocio_id, datos.nombre, datos.telefono, datos.vehiculo]
    );
    return result.rows[0];
  }

  async listarRepartidores(negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM delivery.pedidos p WHERE p.repartidor_id = r.id AND p.estado IN ('en_camino')) as entregas_en_curso,
        (SELECT COUNT(*) FROM delivery.pedidos p WHERE p.repartidor_id = r.id AND p.estado = 'entregado' AND DATE(p.hora_entrega) = CURRENT_DATE) as entregas_hoy,
        (SELECT COALESCE(SUM(p.costo_envio), 0) FROM delivery.pedidos p WHERE p.repartidor_id = r.id AND p.estado = 'entregado' AND DATE(p.hora_entrega) = CURRENT_DATE) as total_cobrado_hoy
       FROM delivery.repartidores r
       WHERE r.negocio_id = $1 AND r.activo = true
       ORDER BY r.nombre`,
      [negocio_id]
    );
    return result.rows;
  }

  async actualizarRepartidor(id: string, negocio_id: string, datos: Partial<{ nombre: string; telefono: string; vehiculo: string; activo: boolean }>) {
    const campos: string[] = [];
    const valores: any[] = [];
    let contador = 1;

    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined) {
        campos.push(`${clave} = $${contador}`);
        valores.push(valor);
        contador++;
      }
    }

    if (campos.length === 0) throw new AppError('No hay campos para actualizar', 400);

    valores.push(id, negocio_id);
    const result = await DatabaseConnection.query(
      `UPDATE delivery.repartidores SET ${campos.join(', ')} WHERE id = $${contador} AND negocio_id = $${contador + 1} RETURNING *`,
      valores
    );

    if (result.rows.length === 0) throw new AppError('Repartidor no encontrado', 404);
    return result.rows[0];
  }
}

export default new DeliveryService();
