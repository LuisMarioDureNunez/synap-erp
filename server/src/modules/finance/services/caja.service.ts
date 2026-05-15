// ============================================
// SYNAP - SERVICIO DE CAJA DIARIA
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// APERTURA, CIERRE, ARQUEO, DIFERENCIAS
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

interface AperturaCajaDTO {
  negocio_id: string;
  sucursal_id?: string;
  usuario_id: string;
  monto_inicial: number;
}

interface CierreCajaDTO {
  caja_id: string;
  usuario_id: string;
  monto_final: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_otros: number;
  observaciones?: string;
}

class CajaService {

  async abrirCaja(datos: AperturaCajaDTO) {
    const cajaAbierta = await DatabaseConnection.query(
      `SELECT id FROM pos.cajas WHERE usuario_id = $1 AND abierta = true AND DATE(abierta_en) = CURRENT_DATE`,
      [datos.usuario_id]
    );

    if (cajaAbierta.rows.length > 0) {
      throw new AppError('Ya tiene una caja abierta hoy. Debe cerrarla primero.', 400);
    }

    const result = await DatabaseConnection.query(
      `INSERT INTO pos.cajas (negocio_id, sucursal_id, usuario_id, monto_inicial)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [datos.negocio_id, datos.sucursal_id, datos.usuario_id, datos.monto_inicial]
    );

    return {
      ...result.rows[0],
      mensaje: 'Caja abierta exitosamente. Recuerde cerrarla al final del turno.'
    };
  }

  async cerrarCaja(datos: CierreCajaDTO) {
    return await DatabaseConnection.transaction(async (client) => {
      const caja = await client.query(
        `SELECT * FROM pos.cajas WHERE id = $1 AND abierta = true`,
        [datos.caja_id]
      );

      if (caja.rows.length === 0) {
        throw new AppError('Caja no encontrada o ya esta cerrada', 404);
      }

      const ventasDelDia = await client.query(
        `SELECT 
          COALESCE(SUM(v.total), 0) as total_ventas,
          COALESCE(SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE 0 END), 0) as total_efectivo_ventas,
          COALESCE(SUM(CASE WHEN v.metodo_pago IN ('tarjeta_credito','tarjeta_debito') THEN v.total ELSE 0 END), 0) as total_tarjeta_ventas,
          COALESCE(SUM(CASE WHEN v.metodo_pago = 'transferencia' THEN v.total ELSE 0 END), 0) as total_transferencia_ventas,
          COALESCE(SUM(CASE WHEN v.metodo_pago NOT IN ('efectivo','tarjeta_credito','tarjeta_debito','transferencia') THEN v.total ELSE 0 END), 0) as total_otros_ventas,
          COUNT(*) as cantidad_ventas
         FROM pos.ventas v
         WHERE v.usuario_id = $1 
           AND DATE(v.created_at) = CURRENT_DATE 
           AND v.estado = 'completada'`,
        [caja.rows[0].usuario_id]
      );

      const totalEsperado = parseFloat(caja.rows[0].monto_inicial) + 
        parseFloat(ventasDelDia.rows[0].total_efectivo_ventas);

      const diferencia = datos.monto_final - totalEsperado;

      const result = await client.query(
        `UPDATE pos.cajas SET 
          monto_final = $1,
          total_ventas = $2,
          total_efectivo = $3,
          total_tarjeta = $4,
          total_transferencia = $5,
          total_otros = $6,
          diferencia = $7,
          abierta = false,
          cerrada_en = NOW()
         WHERE id = $8 RETURNING *`,
        [
          datos.monto_final,
          ventasDelDia.rows[0].total_ventas,
          datos.total_efectivo,
          datos.total_tarjeta,
          datos.total_transferencia,
          datos.total_otros,
          diferencia,
          datos.caja_id
        ]
      );

      return {
        caja: result.rows[0],
        ventas: ventasDelDia.rows[0],
        arqueo: {
          monto_inicial: parseFloat(caja.rows[0].monto_inicial),
          total_efectivo_ventas: parseFloat(ventasDelDia.rows[0].total_efectivo_ventas),
          total_esperado: totalEsperado,
          monto_declarado: datos.monto_final,
          diferencia: diferencia,
          estado: diferencia === 0 ? 'cuadrado' : diferencia > 0 ? 'sobrante' : 'faltante'
        }
      };
    });
  }

  async cajaActual(usuario_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT c.*, 
        (SELECT COALESCE(SUM(v.total), 0) FROM pos.ventas v 
         WHERE v.usuario_id = c.usuario_id AND DATE(v.created_at) = CURRENT_DATE AND v.estado = 'completada') as ventas_acumuladas,
        (SELECT COUNT(*) FROM pos.ventas v 
         WHERE v.usuario_id = c.usuario_id AND DATE(v.created_at) = CURRENT_DATE AND v.estado = 'completada') as cantidad_ventas
       FROM pos.cajas c
       WHERE c.usuario_id = $1 AND c.abierta = true AND DATE(c.abierta_en) = CURRENT_DATE
       ORDER BY c.abierta_en DESC LIMIT 1`,
      [usuario_id]
    );

    if (result.rows.length === 0) {
      return { abierta: false, mensaje: 'No tiene caja abierta hoy' };
    }

    return { abierta: true, ...result.rows[0] };
  }

  async historialCajas(filtros: {
    negocio_id: string;
    usuario_id?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    pagina?: number;
    limite?: number;
  }) {
    const { negocio_id, usuario_id, fecha_inicio, fecha_fin, pagina = 1, limite = 20 } = filtros;
    const condiciones: string[] = ['c.negocio_id = $1', 'c.abierta = false'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (usuario_id) {
      condiciones.push(`c.usuario_id = $${contador}`);
      valores.push(usuario_id);
      contador++;
    }

    if (fecha_inicio) {
      condiciones.push(`DATE(c.cerrada_en) >= $${contador}`);
      valores.push(fecha_inicio);
      contador++;
    }

    if (fecha_fin) {
      condiciones.push(`DATE(c.cerrada_en) <= $${contador}`);
      valores.push(fecha_fin);
      contador++;
    }

    const offset = (pagina - 1) * limite;

    const countResult = await DatabaseConnection.query(
      `SELECT COUNT(*) FROM pos.cajas c WHERE ${condiciones.join(' AND ')}`,
      valores
    );

    const datosResult = await DatabaseConnection.query(
      `SELECT c.*, u.nombre_completo as usuario_nombre
       FROM pos.cajas c
       JOIN auth.usuarios u ON c.usuario_id = u.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY c.cerrada_en DESC
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
}

export default new CajaService();
