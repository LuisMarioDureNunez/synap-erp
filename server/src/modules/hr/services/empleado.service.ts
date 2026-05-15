// ============================================
// SYNAP - SERVICIO DE EMPLEADOS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// GESTION COMPLETA DE RRHH CON METRICAS
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

interface CrearEmpleadoDTO {
  negocio_id: string;
  usuario_id?: string;
  nombre: string;
  documento?: string;
  cargo: string;
  salario_base: number;
  fecha_ingreso?: string;
}

class EmpleadoService {

  async crear(datos: CrearEmpleadoDTO) {
    if (datos.documento) {
      const existente = await DatabaseConnection.query(
        `SELECT id FROM hr.empleados WHERE negocio_id = $1 AND documento = $2 AND activo = true`,
        [datos.negocio_id, datos.documento]
      );
      if (existente.rows.length > 0) throw new AppError('Ya existe un empleado con ese documento', 409);
    }

    const result = await DatabaseConnection.query(
      `INSERT INTO hr.empleados (negocio_id, usuario_id, nombre, documento, cargo, salario_base, fecha_ingreso)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [datos.negocio_id, datos.usuario_id || null, datos.nombre, datos.documento,
       datos.cargo, datos.salario_base, datos.fecha_ingreso || new Date().toISOString().split('T')[0]]
    );

    return result.rows[0];
  }

  async obtenerPorId(id: string, negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT e.*,
        u.username, u.email as usuario_email, u.rol as usuario_rol,
        (SELECT COUNT(*) FROM hr.asistencias a WHERE a.empleado_id = e.id AND DATE(a.fecha_hora) = CURRENT_DATE) as asistencias_hoy,
        (SELECT COUNT(*) FROM hr.comisiones c WHERE c.empleado_id = e.id AND c.pagada = false) as comisiones_pendientes,
        (SELECT COALESCE(SUM(c.monto), 0) FROM hr.comisiones c WHERE c.empleado_id = e.id AND c.pagada = false) as monto_comisiones_pendientes,
        (SELECT COUNT(*) FROM hr.asistencias a WHERE a.empleado_id = e.id AND a.tipo = 'tardanza' 
         AND DATE(a.fecha_hora) >= DATE_TRUNC('month', CURRENT_DATE)) as tardanzas_mes,
        (SELECT COUNT(*) FROM hr.asistencias a WHERE a.empleado_id = e.id AND a.tipo = 'falta'
         AND DATE(a.fecha_hora) >= DATE_TRUNC('month', CURRENT_DATE)) as faltas_mes
       FROM hr.empleados e
       LEFT JOIN auth.usuarios u ON e.usuario_id = u.id
       WHERE e.id = $1 AND e.negocio_id = $2`,
      [id, negocio_id]
    );

    if (result.rows.length === 0) throw new AppError('Empleado no encontrado', 404);
    return result.rows[0];
  }

  async listar(negocio_id: string, filtros?: { cargo?: string; activo?: boolean; busqueda?: string }) {
    let query = `
      SELECT e.*,
        u.username, u.rol as usuario_rol,
        (SELECT a.tipo FROM hr.asistencias a WHERE a.empleado_id = e.id AND DATE(a.fecha_hora) = CURRENT_DATE ORDER BY a.fecha_hora DESC LIMIT 1) as estado_hoy,
        (SELECT a.fecha_hora FROM hr.asistencias a WHERE a.empleado_id = e.id AND DATE(a.fecha_hora) = CURRENT_DATE ORDER BY a.fecha_hora DESC LIMIT 1) as ultimo_registro
      FROM hr.empleados e
      LEFT JOIN auth.usuarios u ON e.usuario_id = u.id
      WHERE e.negocio_id = $1
    `;
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (filtros?.activo !== undefined) {
      query += ` AND e.activo = $${contador}`;
      valores.push(filtros.activo);
      contador++;
    } else {
      query += ` AND e.activo = true`;
    }

    if (filtros?.cargo) {
      query += ` AND e.cargo ILIKE $${contador}`;
      valores.push(`%${filtros.cargo}%`);
      contador++;
    }

    if (filtros?.busqueda) {
      query += ` AND (e.nombre ILIKE $${contador} OR e.documento ILIKE $${contador} OR e.cargo ILIKE $${contador})`;
      valores.push(`%${filtros.busqueda}%`);
      contador++;
    }

    query += ` ORDER BY e.nombre ASC`;

    const result = await DatabaseConnection.query(query, valores);
    return result.rows;
  }

  async actualizar(id: string, negocio_id: string, datos: Partial<CrearEmpleadoDTO>) {
    const campos: string[] = [];
    const valores: any[] = [];
    let contador = 1;

    for (const [clave, valor] of Object.entries(datos)) {
      if (['nombre', 'documento', 'cargo', 'salario_base', 'fecha_ingreso', 'activo'].includes(clave) && valor !== undefined) {
        campos.push(`${clave} = $${contador}`);
        valores.push(valor);
        contador++;
      }
    }

    if (campos.length === 0) throw new AppError('No hay campos para actualizar', 400);

    valores.push(id, negocio_id);
    const result = await DatabaseConnection.query(
      `UPDATE hr.empleados SET ${campos.join(', ')} WHERE id = $${contador} AND negocio_id = $${contador + 1} RETURNING *`,
      valores
    );

    if (result.rows.length === 0) throw new AppError('Empleado no encontrado', 404);
    return result.rows[0];
  }

  async desvincular(id: string, negocio_id: string, motivo: string) {
    const result = await DatabaseConnection.query(
      `UPDATE hr.empleados SET activo = false WHERE id = $1 AND negocio_id = $2 RETURNING *`,
      [id, negocio_id]
    );

    if (result.rows.length === 0) throw new AppError('Empleado no encontrado', 404);

    await DatabaseConnection.query(
      `INSERT INTO security.auditoria (negocio_id, usuario_id, accion, entidad, entidad_id, datos_nuevos)
       VALUES ($1, $1, 'DESVINCULACION', 'hr.empleados', $2, $3)`,
      [negocio_id, id, JSON.stringify({ motivo, fecha: new Date().toISOString() })]
    );

    return { desvinculado: true, empleado: result.rows[0].nombre, motivo };
  }
}

export default new EmpleadoService();
