// ============================================
// SYNAP - SERVICIO DE FIADOS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// SCORE DE RIESGO, RECORDATORIOS, PAGOS
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

class FiadoService {

  async crear(datos: {
    negocio_id: string;
    cliente_id: string;
    usuario_id: string;
    monto_total: number;
    fecha_vencimiento?: string;
    venta_id?: string;
  }) {
    const cliente = await DatabaseConnection.query(
      `SELECT id, nombre, permite_fiado, limite_fiado,
              (SELECT COALESCE(SUM(saldo_pendiente), 0) FROM crm.fiados WHERE cliente_id = $1 AND estado IN ('pendiente','pagado_parcial')) as deuda_actual,
              (SELECT COUNT(*) FROM crm.fiados WHERE cliente_id = $1 AND estado = 'vencido') as fiados_vencidos
       FROM pos.clientes WHERE id = $1 AND negocio_id = $2 AND activo = true`,
      [datos.cliente_id, datos.negocio_id]
    );

    if (cliente.rows.length === 0) throw new AppError('Cliente no encontrado', 404);
    if (!cliente.rows[0].permite_fiado) throw new AppError('Cliente no tiene permitido fiado', 403);

    const deudaActual = parseFloat(cliente.rows[0].deuda_actual);
    const limite = parseFloat(cliente.rows[0].limite_fiado);

    if (limite > 0 && (deudaActual + datos.monto_total) > limite) {
      throw new AppError(
        `Excede limite de fiado. Limite: Gs. ${limite.toLocaleString('es-PY')}, Deuda actual: Gs. ${deudaActual.toLocaleString('es-PY')}`,
        400
      );
    }

    if (parseInt(cliente.rows[0].fiados_vencidos) >= 2) {
      throw new AppError('Cliente tiene 2 o mas fiados vencidos. No se permite nuevo fiado.', 403);
    }

    const fechaVencimiento = datos.fecha_vencimiento || 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await DatabaseConnection.query(
      `INSERT INTO crm.fiados (negocio_id, cliente_id, venta_id, monto_total, saldo_pendiente, fecha_vencimiento, estado)
       VALUES ($1,$2,$3,$4,$5,$6,'pendiente') RETURNING *`,
      [datos.negocio_id, datos.cliente_id, datos.venta_id || null, datos.monto_total, datos.monto_total, fechaVencimiento]
    );

    return result.rows[0];
  }

  async registrarPago(datos: {
    fiado_id: string;
    usuario_id: string;
    monto: number;
    metodo_pago?: string;
    negocio_id: string;
  }) {
    return await DatabaseConnection.transaction(async (client) => {
      const fiado = await client.query(
        `SELECT * FROM crm.fiados WHERE id = $1 AND negocio_id = $2`,
        [datos.fiado_id, datos.negocio_id]
      );

      if (fiado.rows.length === 0) throw new AppError('Fiado no encontrado', 404);
      if (!['pendiente', 'pagado_parcial'].includes(fiado.rows[0].estado)) {
        throw new AppError('Este fiado no acepta pagos', 400);
      }

      if (datos.monto > parseFloat(fiado.rows[0].saldo_pendiente)) {
        throw new AppError('El monto del pago excede el saldo pendiente', 400);
      }

      await client.query(
        `INSERT INTO crm.pagos_fiados (fiado_id, usuario_id, monto, metodo_pago)
         VALUES ($1,$2,$3,$4)`,
        [datos.fiado_id, datos.usuario_id, datos.monto, datos.metodo_pago || 'efectivo']
      );

      const nuevoSaldo = parseFloat(fiado.rows[0].saldo_pendiente) - datos.monto;
      const nuevoEstado = nuevoSaldo <= 0 ? 'pagado_total' : 'pagado_parcial';

      const result = await client.query(
        `UPDATE crm.fiados SET saldo_pendiente = $1, estado = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [nuevoSaldo, nuevoEstado, datos.fiado_id]
      );

      return {
        fiado: result.rows[0],
        pago: {
          monto: datos.monto,
          saldo_anterior: parseFloat(fiado.rows[0].saldo_pendiente),
          saldo_nuevo: nuevoSaldo,
          metodo_pago: datos.metodo_pago || 'efectivo'
        }
      };
    });
  }

  async listar(filtros: {
    negocio_id: string;
    cliente_id?: string;
    estado?: string;
    vencidos?: boolean;
    pagina?: number;
    limite?: number;
  }) {
    const { negocio_id, cliente_id, estado, vencidos, pagina = 1, limite = 20 } = filtros;
    const condiciones: string[] = ['f.negocio_id = $1'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (cliente_id) {
      condiciones.push(`f.cliente_id = $${contador}`);
      valores.push(cliente_id);
      contador++;
    }

    if (estado) {
      condiciones.push(`f.estado = $${contador}`);
      valores.push(estado);
      contador++;
    }

    if (vencidos) {
      condiciones.push('f.fecha_vencimiento < CURRENT_DATE AND f.estado IN (\'pendiente\',\'pagado_parcial\')');
    }

    const offset = (pagina - 1) * limite;

    const countResult = await DatabaseConnection.query(
      `SELECT COUNT(*) FROM crm.fiados f WHERE ${condiciones.join(' AND ')}`,
      valores
    );

    const datosResult = await DatabaseConnection.query(
      `SELECT f.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.telefono as cliente_telefono,
              (f.fecha_vencimiento - CURRENT_DATE) as dias_restantes,
              CASE 
                WHEN f.fecha_vencimiento < CURRENT_DATE AND f.estado IN ('pendiente','pagado_parcial') THEN 'vencido'
                WHEN f.fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days' AND f.estado IN ('pendiente','pagado_parcial') THEN 'por_vencer'
                ELSE 'al_dia'
              END as estado_vencimiento
       FROM crm.fiados f
       JOIN pos.clientes c ON f.cliente_id = c.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY f.fecha_vencimiento ASC, f.saldo_pendiente DESC
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

  async obtenerPagos(fiado_id: string, negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT pf.*, u.nombre_completo as usuario_nombre
       FROM crm.pagos_fiados pf
       JOIN auth.usuarios u ON pf.usuario_id = u.id
       JOIN crm.fiados f ON pf.fiado_id = f.id
       WHERE pf.fiado_id = $1 AND f.negocio_id = $2
       ORDER BY pf.created_at DESC`,
      [fiado_id, negocio_id]
    );

    return result.rows;
  }

  async resumenFiados(negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT 
        COUNT(*) as total_fiados_activos,
        COALESCE(SUM(f.saldo_pendiente), 0) as total_pendiente_cobro,
        COALESCE(SUM(CASE WHEN f.fecha_vencimiento < CURRENT_DATE AND f.estado IN ('pendiente','pagado_parcial') THEN f.saldo_pendiente ELSE 0 END), 0) as total_vencido,
        COUNT(CASE WHEN f.fecha_vencimiento < CURRENT_DATE AND f.estado IN ('pendiente','pagado_parcial') THEN 1 END) as cantidad_vencidos,
        COUNT(CASE WHEN f.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND f.estado IN ('pendiente','pagado_parcial') THEN 1 END) as cantidad_por_vencer,
        COUNT(DISTINCT f.cliente_id) as clientes_con_fiado
       FROM crm.fiados f
       WHERE f.negocio_id = $1 AND f.estado IN ('pendiente','pagado_parcial')`,
      [negocio_id]
    );

    return result.rows[0];
  }
}

export default new FiadoService();
