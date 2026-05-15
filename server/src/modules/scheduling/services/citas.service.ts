// ============================================
// SYNAP - SERVICIO DE AGENDA Y CITAS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// GESTION DE SERVICIOS, CITAS, RECORDATORIOS
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

class CitasService {

  async crearServicio(datos: {
    negocio_id: string;
    nombre: string;
    duracion_minutos: number;
    precio?: number;
  }) {
    const result = await DatabaseConnection.query(
      `INSERT INTO scheduling.servicios (negocio_id, nombre, duracion_minutos, precio)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [datos.negocio_id, datos.nombre, datos.duracion_minutos, datos.precio || 0]
    );
    return result.rows[0];
  }

  async listarServicios(negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM scheduling.citas c WHERE c.servicio_id = s.id AND DATE(c.fecha_hora) = CURRENT_DATE) as citas_hoy,
        (SELECT COUNT(*) FROM scheduling.citas c WHERE c.servicio_id = s.id AND DATE(c.fecha_hora) >= CURRENT_DATE) as citas_pendientes
       FROM scheduling.servicios s
       WHERE s.negocio_id = $1 AND s.activo = true
       ORDER BY s.nombre`,
      [negocio_id]
    );
    return result.rows;
  }

  async crearCita(datos: {
    negocio_id: string;
    cliente_id: string;
    servicio_id?: string;
    empleado_id?: string;
    fecha_hora: string;
    duracion_minutos?: number;
    notas?: string;
  }) {
    return await DatabaseConnection.transaction(async (client) => {
      if (datos.empleado_id) {
        const conflicto = await client.query(
          `SELECT COUNT(*) as total FROM scheduling.citas
           WHERE empleado_id = $1 AND estado NOT IN ('cancelada','no_asistio')
           AND (
             (fecha_hora <= $2::timestamp AND fecha_hora + (duracion_minutos || 'minutes')::interval > $2::timestamp)
             OR
             (fecha_hora >= $2::timestamp AND fecha_hora < $2::timestamp + ($3 || 'minutes')::interval)
           )`,
          [datos.empleado_id, datos.fecha_hora, datos.duracion_minutos || 30]
        );

        if (parseInt(conflicto.rows[0].total) > 0) {
          throw new AppError('El empleado ya tiene una cita en ese horario', 409);
        }
      }

      if (datos.servicio_id) {
        const servicio = await client.query(
          `SELECT duracion_minutos FROM scheduling.servicios WHERE id = $1`,
          [datos.servicio_id]
        );
        if (servicio.rows.length > 0) {
          datos.duracion_minutos = servicio.rows[0].duracion_minutos;
        }
      }

      const result = await client.query(
        `INSERT INTO scheduling.citas (negocio_id, cliente_id, servicio_id, empleado_id, fecha_hora, duracion_minutos, notas)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [datos.negocio_id, datos.cliente_id, datos.servicio_id, datos.empleado_id,
         datos.fecha_hora, datos.duracion_minutos || 30, datos.notas]
      );

      return result.rows[0];
    });
  }

  async listarCitas(filtros: {
    negocio_id: string;
    fecha?: string;
    empleado_id?: string;
    cliente_id?: string;
    estado?: string;
    pagina?: number;
    limite?: number;
  }) {
    const { negocio_id, fecha, empleado_id, cliente_id, estado, pagina = 1, limite = 50 } = filtros;
    const condiciones: string[] = ['c.negocio_id = $1'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (fecha) {
      condiciones.push(`DATE(c.fecha_hora) = $${contador}`);
      valores.push(fecha);
      contador++;
    } else {
      condiciones.push(`DATE(c.fecha_hora) >= CURRENT_DATE`);
    }

    if (empleado_id) {
      condiciones.push(`c.empleado_id = $${contador}`);
      valores.push(empleado_id);
      contador++;
    }

    if (cliente_id) {
      condiciones.push(`c.cliente_id = $${contador}`);
      valores.push(cliente_id);
      contador++;
    }

    if (estado) {
      condiciones.push(`c.estado = $${contador}`);
      valores.push(estado);
      contador++;
    }

    const offset = (pagina - 1) * limite;

    const result = await DatabaseConnection.query(
      `SELECT c.*, 
        cl.nombre as cliente_nombre, cl.apellido as cliente_apellido, cl.telefono as cliente_telefono,
        s.nombre as servicio_nombre, s.duracion_minutos as servicio_duracion, s.precio as servicio_precio,
        e.nombre as empleado_nombre,
        (c.fecha_hora + (c.duracion_minutos || 'minutes')::interval) as hora_fin
       FROM scheduling.citas c
       JOIN pos.clientes cl ON c.cliente_id = cl.id
       LEFT JOIN scheduling.servicios s ON c.servicio_id = s.id
       LEFT JOIN hr.empleados e ON c.empleado_id = e.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY c.fecha_hora ASC
       LIMIT $${contador} OFFSET $${contador + 1}`,
      [...valores, limite, offset]
    );

    return {
      datos: result.rows,
      paginacion: { pagina, limite, total: result.rows.length }
    };
  }

  async actualizarEstadoCita(cita_id: string, negocio_id: string, estado: string, notas?: string) {
    const estadosValidos = ['pendiente', 'confirmada', 'en_progreso', 'completada', 'cancelada', 'no_asistio'];
    if (!estadosValidos.includes(estado)) {
      throw new AppError(`Estado invalido. Validos: ${estadosValidos.join(', ')}`, 400);
    }

    const result = await DatabaseConnection.query(
      `UPDATE scheduling.citas SET estado = $1, notas = COALESCE(notas, '') || $2
       WHERE id = $3 AND negocio_id = $4 RETURNING *`,
      [estado, notas ? ` | ${new Date().toLocaleString('es-PY')}: ${notas}` : '', cita_id, negocio_id]
    );

    if (result.rows.length === 0) throw new AppError('Cita no encontrada', 404);
    return result.rows[0];
  }

  async agendaSemanal(negocio_id: string, fecha_inicio?: string) {
    const inicio = fecha_inicio || new Date().toISOString().split('T')[0];
    
    const result = await DatabaseConnection.query(
      `SELECT c.*, 
        cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
        s.nombre as servicio_nombre, s.precio as servicio_precio,
        e.nombre as empleado_nombre,
        EXTRACT(DOW FROM c.fecha_hora) as dia_semana,
        TO_CHAR(c.fecha_hora, 'HH24:MI') as hora
       FROM scheduling.citas c
       JOIN pos.clientes cl ON c.cliente_id = cl.id
       LEFT JOIN scheduling.servicios s ON c.servicio_id = s.id
       LEFT JOIN hr.empleados e ON c.empleado_id = e.id
       WHERE c.negocio_id = $1 
         AND c.estado NOT IN ('cancelada','no_asistio')
         AND DATE(c.fecha_hora) BETWEEN $2::date AND $2::date + INTERVAL '6 days'
       ORDER BY c.fecha_hora ASC`,
      [negocio_id, inicio]
    );

    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const agenda: any = {};

    for (let i = 0; i < 7; i++) {
      const fecha = new Date(inicio);
      fecha.setDate(fecha.getDate() + i);
      const key = fecha.toISOString().split('T')[0];
      agenda[key] = {
        fecha: key,
        dia: diasSemana[fecha.getDay()],
        citas: []
      };
    }

    result.rows.forEach((cita: any) => {
      const key = new Date(cita.fecha_hora).toISOString().split('T')[0];
      if (agenda[key]) {
        agenda[key].citas.push(cita);
      }
    });

    return {
      semana_inicio: inicio,
      total_citas: result.rows.length,
      agenda: Object.values(agenda)
    };
  }

  async citasDelDia(negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT c.*, 
        cl.nombre as cliente_nombre, cl.telefono as cliente_telefono,
        s.nombre as servicio_nombre, s.precio as servicio_precio,
        e.nombre as empleado_nombre,
        (c.fecha_hora + (c.duracion_minutos || 'minutes')::interval) as hora_fin
       FROM scheduling.citas c
       JOIN pos.clientes cl ON c.cliente_id = cl.id
       LEFT JOIN scheduling.servicios s ON c.servicio_id = s.id
       LEFT JOIN hr.empleados e ON c.empleado_id = e.id
       WHERE c.negocio_id = $1 
         AND DATE(c.fecha_hora) = CURRENT_DATE
         AND c.estado NOT IN ('cancelada','no_asistio')
       ORDER BY c.fecha_hora ASC`,
      [negocio_id]
    );

    const ahora = new Date();
    const proximas = result.rows.filter((c: any) => new Date(c.fecha_hora) > ahora);
    const enCurso = result.rows.filter((c: any) => 
      new Date(c.fecha_hora) <= ahora && new Date(c.hora_fin) >= ahora
    );
    const pasadas = result.rows.filter((c: any) => new Date(c.hora_fin) < ahora);

    return {
      total: result.rows.length,
      en_curso: enCurso.length,
      proximas: proximas.length,
      completadas: pasadas.length,
      citas: result.rows
    };
  }
}

export default new CitasService();
