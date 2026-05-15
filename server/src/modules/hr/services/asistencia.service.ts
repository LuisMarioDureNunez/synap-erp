// ============================================
// SYNAP - SERVICIO DE ASISTENCIAS Y COMISIONES
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// CONTROL BIOMETRICO, QR, COMISIONES AUTOMATICAS
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

class AsistenciaService {

  async registrarAsistencia(datos: {
    empleado_id: string;
    sucursal_id?: string;
    tipo: string;
    metodo_registro?: string;
  }) {
    const empleado = await DatabaseConnection.query(
      `SELECT id, nombre FROM hr.empleados WHERE id = $1 AND activo = true`,
      [datos.empleado_id]
    );

    if (empleado.rows.length === 0) throw new AppError('Empleado no encontrado o inactivo', 404);

    const ahora = new Date();
    const hora = ahora.getHours() * 60 + ahora.getMinutes();
    let tipoAsistencia = datos.tipo;

    if (datos.tipo === 'entrada') {
      if (hora > 8 * 60 + 15) {
        tipoAsistencia = 'tardanza';
      }
    }

    const result = await DatabaseConnection.query(
      `INSERT INTO hr.asistencias (empleado_id, sucursal_id, tipo, fecha_hora, metodo_registro)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [datos.empleado_id, datos.sucursal_id || null, tipoAsistencia, ahora, datos.metodo_registro || 'manual']
    );

    return {
      ...result.rows[0],
      empleado_nombre: empleado.rows[0].nombre,
      hora: ahora.toLocaleTimeString('es-PY'),
      tipo_registrado: tipoAsistencia
    };
  }

  async registrarPorQR(qr_data: string, sucursal_id?: string) {
    const datos = JSON.parse(Buffer.from(qr_data, 'base64').toString());
    
    if (!datos.empleado_id || !datos.tipo) {
      throw new AppError('QR invalido: datos incompletos', 400);
    }

    const empleado = await DatabaseConnection.query(
      `SELECT id FROM hr.empleados WHERE id = $1 AND activo = true`,
      [datos.empleado_id]
    );

    if (empleado.rows.length === 0) throw new AppError('Empleado no encontrado', 404);

    return this.registrarAsistencia({
      empleado_id: datos.empleado_id,
      sucursal_id,
      tipo: datos.tipo,
      metodo_registro: 'qr'
    });
  }

  async historialAsistencias(filtros: {
    empleado_id: string;
    negocio_id: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    pagina?: number;
    limite?: number;
  }) {
    const { empleado_id, negocio_id, fecha_inicio, fecha_fin, pagina = 1, limite = 31 } = filtros;
    
    const result = await DatabaseConnection.query(
      `SELECT a.*, e.nombre as empleado_nombre
       FROM hr.asistencias a
       JOIN hr.empleados e ON a.empleado_id = e.id
       WHERE a.empleado_id = $1 AND e.negocio_id = $2
       AND DATE(a.fecha_hora) BETWEEN COALESCE($3::date, DATE_TRUNC('month', CURRENT_DATE))
       AND COALESCE($4::date, CURRENT_DATE)
       ORDER BY a.fecha_hora DESC
       LIMIT $5 OFFSET $6`,
      [empleado_id, negocio_id, fecha_inicio, fecha_fin, limite, (pagina - 1) * limite]
    );

    return result.rows;
  }

  async resumenAsistencias(negocio_id: string, fecha?: string) {
    const fechaConsulta = fecha || new Date().toISOString().split('T')[0];

    const result = await DatabaseConnection.query(
      `SELECT 
        e.id, e.nombre, e.cargo,
        COUNT(CASE WHEN a.tipo = 'entrada' THEN 1 END) as entradas,
        COUNT(CASE WHEN a.tipo = 'salida' THEN 1 END) as salidas,
        COUNT(CASE WHEN a.tipo = 'tardanza' THEN 1 END) as tardanzas,
        COUNT(CASE WHEN a.tipo = 'falta' THEN 1 END) as faltas,
        MIN(CASE WHEN a.tipo = 'entrada' THEN a.fecha_hora END) as primera_entrada,
        MAX(CASE WHEN a.tipo = 'salida' THEN a.fecha_hora END) as ultima_salida
       FROM hr.empleados e
       LEFT JOIN hr.asistencias a ON e.id = a.empleado_id AND DATE(a.fecha_hora) = $2
       WHERE e.negocio_id = $1 AND e.activo = true
       GROUP BY e.id, e.nombre, e.cargo
       ORDER BY e.nombre`,
      [negocio_id, fechaConsulta]
    );

    const sinRegistro = result.rows.filter((e: any) => 
      parseInt(e.entradas) === 0 && parseInt(e.salidas) === 0
    );

    return {
      fecha: fechaConsulta,
      total_empleados: result.rows.length,
      presentes: result.rows.length - sinRegistro.length,
      ausentes: sinRegistro.length,
      detalle: result.rows
    };
  }

  async calcularComisiones(negocio_id: string, fecha_inicio: string, fecha_fin: string) {
    const result = await DatabaseConnection.query(
      `SELECT 
        e.id as empleado_id,
        e.nombre as empleado_nombre,
        e.cargo,
        COUNT(v.id) as total_ventas,
        COALESCE(SUM(v.total), 0) as monto_total,
        CASE 
          WHEN COALESCE(SUM(v.total), 0) > 10000000 THEN 5
          WHEN COALESCE(SUM(v.total), 0) > 5000000 THEN 3
          WHEN COALESCE(SUM(v.total), 0) > 1000000 THEN 2
          ELSE 1
        END as porcentaje_comision,
        CASE 
          WHEN COALESCE(SUM(v.total), 0) > 10000000 THEN COALESCE(SUM(v.total), 0) * 0.05
          WHEN COALESCE(SUM(v.total), 0) > 5000000 THEN COALESCE(SUM(v.total), 0) * 0.03
          WHEN COALESCE(SUM(v.total), 0) > 1000000 THEN COALESCE(SUM(v.total), 0) * 0.02
          ELSE COALESCE(SUM(v.total), 0) * 0.01
        END as monto_comision
       FROM hr.empleados e
       JOIN auth.usuarios u ON e.usuario_id = u.id
       JOIN pos.ventas v ON v.usuario_id = u.id
       WHERE e.negocio_id = $1 
         AND v.estado = 'completada'
         AND DATE(v.created_at) BETWEEN $2 AND $3
       GROUP BY e.id, e.nombre, e.cargo
       ORDER BY monto_total DESC`,
      [negocio_id, fecha_inicio, fecha_fin]
    );

    return {
      periodo: { inicio: fecha_inicio, fin: fecha_fin },
      total_comisiones: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.monto_comision), 0),
      empleados: result.rows
    };
  }

  async generarComisiones(negocio_id: string, empleado_id: string, porcentaje: number, venta_id: string, monto: number) {
    const result = await DatabaseConnection.query(
      `INSERT INTO hr.comisiones (empleado_id, venta_id, porcentaje, monto)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [empleado_id, venta_id, porcentaje, monto]
    );

    return result.rows[0];
  }

  async listarComisiones(filtros: {
    negocio_id: string;
    empleado_id?: string;
    pagada?: boolean;
    pagina?: number;
    limite?: number;
  }) {
    const { negocio_id, empleado_id, pagada, pagina = 1, limite = 20 } = filtros;
    const condiciones: string[] = ['e.negocio_id = $1'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (empleado_id) {
      condiciones.push(`c.empleado_id = $${contador}`);
      valores.push(empleado_id);
      contador++;
    }

    if (pagada !== undefined) {
      condiciones.push(`c.pagada = $${contador}`);
      valores.push(pagada);
      contador++;
    }

    const offset = (pagina - 1) * limite;

    const countResult = await DatabaseConnection.query(
      `SELECT COUNT(*) FROM hr.comisiones c JOIN hr.empleados e ON c.empleado_id = e.id WHERE ${condiciones.join(' AND ')}`,
      valores
    );

    const datosResult = await DatabaseConnection.query(
      `SELECT c.*, e.nombre as empleado_nombre, v.numero_venta
       FROM hr.comisiones c
       JOIN hr.empleados e ON c.empleado_id = e.id
       LEFT JOIN pos.ventas v ON c.venta_id = v.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY c.created_at DESC
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

  async pagarComisiones(negocio_id: string, empleado_id: string, comision_ids: string[]) {
    const result = await DatabaseConnection.query(
      `UPDATE hr.comisiones SET pagada = true 
       WHERE empleado_id IN (
         SELECT id FROM hr.empleados WHERE negocio_id = $1 AND id = $2
       ) AND id = ANY($3::uuid[]) AND pagada = false
       RETURNING *`,
      [negocio_id, empleado_id, comision_ids]
    );

    return {
      pagadas: result.rows.length,
      monto_total: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.monto), 0),
      comisiones: result.rows
    };
  }
}

export default new AsistenciaService();
