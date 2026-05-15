// ============================================
// SYNAP - SERVICIO DE PEDIDOS DELIVERY
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ASIGNACION, TRACKING, ENTREGA
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

class PedidoService {

  async crearPedido(datos: {
    venta_id: string;
    zona_id?: string;
    direccion_entrega: string;
    costo_envio?: number;
    negocio_id: string;
  }) {
    const venta = await DatabaseConnection.query(
      `SELECT id, total, estado FROM pos.ventas WHERE id = $1 AND negocio_id = $2`,
      [datos.venta_id, datos.negocio_id]
    );

    if (venta.rows.length === 0) throw new AppError('Venta no encontrada', 404);

    let costoEnvio = datos.costo_envio || 0;

    if (datos.zona_id && !datos.costo_envio) {
      const zona = await DatabaseConnection.query(
        `SELECT costo FROM delivery.zonas WHERE id = $1 AND negocio_id = $2`,
        [datos.zona_id, datos.negocio_id]
      );
      if (zona.rows.length > 0) {
        costoEnvio = parseFloat(zona.rows[0].costo);
      }
    }

    const result = await DatabaseConnection.query(
      `INSERT INTO delivery.pedidos (venta_id, zona_id, direccion_entrega, costo_envio, estado)
       VALUES ($1,$2,$3,$4,'pendiente') RETURNING *`,
      [datos.venta_id, datos.zona_id || null, datos.direccion_entrega, costoEnvio]
    );

    return {
      ...result.rows[0],
      venta_total: parseFloat(venta.rows[0].total),
      total_con_envio: parseFloat(venta.rows[0].total) + costoEnvio
    };
  }

  async asignarRepartidor(pedido_id: string, repartidor_id: string, negocio_id: string) {
    const pedido = await DatabaseConnection.query(
      `SELECT p.*, v.negocio_id FROM delivery.pedidos p
       JOIN pos.ventas v ON p.venta_id = v.id
       WHERE p.id = $1 AND v.negocio_id = $2`,
      [pedido_id, negocio_id]
    );

    if (pedido.rows.length === 0) throw new AppError('Pedido no encontrado', 404);
    if (!['pendiente', 'confirmado'].includes(pedido.rows[0].estado)) {
      throw new AppError('El pedido no puede ser asignado en su estado actual', 400);
    }

    const repartidor = await DatabaseConnection.query(
      `SELECT id, nombre, activo FROM delivery.repartidores WHERE id = $1 AND negocio_id = $2`,
      [repartidor_id, negocio_id]
    );

    if (repartidor.rows.length === 0) throw new AppError('Repartidor no encontrado', 404);
    if (!repartidor.rows[0].activo) throw new AppError('Repartidor inactivo', 400);

    const result = await DatabaseConnection.query(
      `UPDATE delivery.pedidos SET repartidor_id = $1, estado = 'en_camino', hora_asignacion = NOW()
       WHERE id = $2 RETURNING *`,
      [repartidor_id, pedido_id]
    );

    return {
      ...result.rows[0],
      repartidor_nombre: repartidor.rows[0].nombre
    };
  }

  async actualizarEstado(pedido_id: string, estado: string, negocio_id: string, notas?: string) {
    const estadosValidos = ['pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      throw new AppError(`Estado invalido. Validos: ${estadosValidos.join(', ')}`, 400);
    }

    const pedido = await DatabaseConnection.query(
      `SELECT p.*, v.negocio_id FROM delivery.pedidos p
       JOIN pos.ventas v ON p.venta_id = v.id
       WHERE p.id = $1 AND v.negocio_id = $2`,
      [pedido_id, negocio_id]
    );

    if (pedido.rows.length === 0) throw new AppError('Pedido no encontrado', 404);

    let query = `UPDATE delivery.pedidos SET estado = $1`;
    const valores: any[] = [estado];
    let contador = 2;

    if (estado === 'entregado') {
      query += `, hora_entrega = NOW()`;
    }

    query += ` WHERE id = $${contador} RETURNING *`;
    valores.push(pedido_id);

    const result = await DatabaseConnection.query(query, valores);
    return result.rows[0];
  }

  async listarPedidos(filtros: {
    negocio_id: string;
    estado?: string;
    repartidor_id?: string;
    zona_id?: string;
    fecha?: string;
    pagina?: number;
    limite?: number;
  }) {
    const { negocio_id, estado, repartidor_id, zona_id, fecha, pagina = 1, limite = 20 } = filtros;
    const condiciones: string[] = ['v.negocio_id = $1'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (estado) {
      condiciones.push(`p.estado = $${contador}`);
      valores.push(estado);
      contador++;
    }

    if (repartidor_id) {
      condiciones.push(`p.repartidor_id = $${contador}`);
      valores.push(repartidor_id);
      contador++;
    }

    if (zona_id) {
      condiciones.push(`p.zona_id = $${contador}`);
      valores.push(zona_id);
      contador++;
    }

    if (fecha) {
      condiciones.push(`DATE(p.created_at) = $${contador}`);
      valores.push(fecha);
      contador++;
    }

    const offset = (pagina - 1) * limite;

    const countResult = await DatabaseConnection.query(
      `SELECT COUNT(*) FROM delivery.pedidos p
       JOIN pos.ventas v ON p.venta_id = v.id
       WHERE ${condiciones.join(' AND ')}`,
      valores
    );

    const datosResult = await DatabaseConnection.query(
      `SELECT p.*, 
        v.numero_venta, v.total as venta_total,
        c.nombre as cliente_nombre, c.telefono as cliente_telefono,
        z.nombre as zona_nombre,
        r.nombre as repartidor_nombre, r.telefono as repartidor_telefono,
        CASE 
          WHEN p.estado = 'entregado' THEN EXTRACT(EPOCH FROM (p.hora_entrega - p.hora_asignacion))/60
          WHEN p.estado = 'en_camino' THEN EXTRACT(EPOCH FROM (NOW() - p.hora_asignacion))/60
          ELSE NULL
        END as tiempo_entrega_minutos
       FROM delivery.pedidos p
       JOIN pos.ventas v ON p.venta_id = v.id
       JOIN pos.clientes c ON v.cliente_id = c.id
       LEFT JOIN delivery.zonas z ON p.zona_id = z.id
       LEFT JOIN delivery.repartidores r ON p.repartidor_id = r.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY p.created_at DESC
       LIMIT $${contador} OFFSET $${contador + 1}`,
      [...valores, limite, offset]
    );

    return {
      datos: datosResult.rows,
      paginacion: {
        pagina,
        limite,
        total: parseInt(countResult.rows[0].count),
        totalPaginas: Math.ceil(parseInt(countResult.rows[0].count) / limite)
      }
    };
  }

  async trackingPedido(pedido_id: string, negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT p.*, 
        v.numero_venta, v.total as venta_total, v.created_at as venta_fecha,
        c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.direccion as cliente_direccion,
        r.nombre as repartidor_nombre, r.telefono as repartidor_telefono, r.vehiculo as repartidor_vehiculo,
        z.nombre as zona_nombre, z.tiempo_estimado_minutos,
        CASE 
          WHEN p.estado = 'entregado' THEN 'Entregado'
          WHEN p.estado = 'en_camino' THEN 'En camino'
          WHEN p.estado = 'preparando' THEN 'Preparando pedido'
          WHEN p.estado = 'confirmado' THEN 'Pedido confirmado'
          WHEN p.estado = 'pendiente' THEN 'Pendiente de asignacion'
          ELSE 'Cancelado'
        END as estado_legible,
        EXTRACT(EPOCH FROM (NOW() - p.created_at))/60 as minutos_transcurridos
       FROM delivery.pedidos p
       JOIN pos.ventas v ON p.venta_id = v.id
       JOIN pos.clientes c ON v.cliente_id = c.id
       LEFT JOIN delivery.repartidores r ON p.repartidor_id = r.id
       LEFT JOIN delivery.zonas z ON p.zona_id = z.id
       WHERE p.id = $1 AND v.negocio_id = $2`,
      [pedido_id, negocio_id]
    );

    if (result.rows.length === 0) throw new AppError('Pedido no encontrado', 404);
    return result.rows[0];
  }

  async resumenDelivery(negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT 
        COUNT(*) FILTER (WHERE p.estado IN ('pendiente','confirmado','preparando','en_camino')) as pedidos_activos,
        COUNT(*) FILTER (WHERE p.estado = 'entregado' AND DATE(p.hora_entrega) = CURRENT_DATE) as entregas_hoy,
        COUNT(*) FILTER (WHERE p.estado = 'cancelado' AND DATE(p.created_at) = CURRENT_DATE) as cancelados_hoy,
        COALESCE(SUM(p.costo_envio) FILTER (WHERE p.estado = 'entregado' AND DATE(p.hora_entrega) = CURRENT_DATE), 0) as total_cobrado_envios,
        COALESCE(AVG(EXTRACT(EPOCH FROM (p.hora_entrega - p.hora_asignacion))/60) FILTER (WHERE p.estado = 'entregado' AND DATE(p.hora_entrega) = CURRENT_DATE), 0) as tiempo_promedio_entrega,
        COUNT(DISTINCT p.repartidor_id) FILTER (WHERE p.estado IN ('en_camino','entregado') AND DATE(p.created_at) = CURRENT_DATE) as repartidores_activos
       FROM delivery.pedidos p
       JOIN pos.ventas v ON p.venta_id = v.id
       WHERE v.negocio_id = $1`,
      [negocio_id]
    );

    return result.rows[0];
  }
}

export default new PedidoService();
