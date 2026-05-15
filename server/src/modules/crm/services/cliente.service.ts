// ============================================
// SYNAP - SERVICIO DE CLIENTES
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// SEGMENTACION, HISTORIAL, SCORE DE RIESGO
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

interface CrearClienteDTO {
  negocio_id: string;
  nombre: string;
  apellido?: string;
  documento?: string;
  tipo_documento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  fecha_nacimiento?: string;
}

class ClienteService {

  async crear(datos: CrearClienteDTO) {
    if (datos.documento) {
      const existente = await DatabaseConnection.query(
        `SELECT id FROM pos.clientes WHERE negocio_id = $1 AND documento = $2 AND activo = true`,
        [datos.negocio_id, datos.documento]
      );
      if (existente.rows.length > 0) {
        throw new AppError('Ya existe un cliente con ese documento', 409);
      }
    }

    const result = await DatabaseConnection.query(
      `INSERT INTO pos.clientes (negocio_id, nombre, apellido, documento, tipo_documento, telefono, email, direccion, fecha_nacimiento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [datos.negocio_id, datos.nombre, datos.apellido, datos.documento, datos.tipo_documento || 'ci',
       datos.telefono, datos.email, datos.direccion, datos.fecha_nacimiento]
    );

    return result.rows[0];
  }

  async obtenerPorId(id: string, negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT 
        c.*,
        (SELECT COUNT(*) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as total_compras,
        (SELECT COALESCE(SUM(v.total), 0) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as total_gastado,
        (SELECT AVG(v.total) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as ticket_promedio,
        (SELECT MAX(v.created_at) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as ultima_compra,
        (SELECT COALESCE(SUM(f.saldo_pendiente), 0) FROM crm.fiados f WHERE f.cliente_id = c.id AND f.estado IN ('pendiente','pagado_parcial')) as deuda_actual,
        (SELECT COUNT(*) FROM crm.fiados f WHERE f.cliente_id = c.id AND f.estado = 'vencido') as fiados_vencidos
       FROM pos.clientes c
       WHERE c.id = $1 AND c.negocio_id = $2`,
      [id, negocio_id]
    );

    if (result.rows.length === 0) throw new AppError('Cliente no encontrado', 404);

    const cliente = result.rows[0];
    cliente.score_riesgo = this.calcularScoreRiesgo(cliente);
    cliente.categoria = this.calcularCategoria(cliente);
    cliente.dias_ultima_compra = cliente.ultima_compra 
      ? Math.floor((Date.now() - new Date(cliente.ultima_compra).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return cliente;
  }

  async listar(filtros: {
    negocio_id: string;
    busqueda?: string;
    categoria?: string;
    con_deuda?: boolean;
    cumpleanos_mes?: number;
    pagina?: number;
    limite?: number;
    ordenar_por?: string;
  }) {
    const { negocio_id, busqueda, categoria, con_deuda, cumpleanos_mes, pagina = 1, limite = 20, ordenar_por = 'nombre' } = filtros;
    
    const condiciones: string[] = ['c.negocio_id = $1', 'c.activo = true'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (busqueda) {
      condiciones.push(`(c.nombre ILIKE $${contador} OR c.apellido ILIKE $${contador} OR c.documento ILIKE $${contador} OR c.telefono ILIKE $${contador})`);
      valores.push(`%${busqueda}%`);
      contador++;
    }

    if (con_deuda) {
      condiciones.push(`EXISTS (SELECT 1 FROM crm.fiados f WHERE f.cliente_id = c.id AND f.saldo_pendiente > 0 AND f.estado IN ('pendiente','pagado_parcial'))`);
    }

    if (cumpleanos_mes) {
      condiciones.push(`EXTRACT(MONTH FROM c.fecha_nacimiento) = $${contador}`);
      valores.push(cumpleanos_mes);
      contador++;
    }

    const offset = (pagina - 1) * limite;

    const countResult = await DatabaseConnection.query(
      `SELECT COUNT(*) FROM pos.clientes c WHERE ${condiciones.join(' AND ')}`,
      valores
    );

    const datosResult = await DatabaseConnection.query(
      `SELECT 
        c.*,
        (SELECT COUNT(*) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as total_compras,
        (SELECT COALESCE(SUM(v.total), 0) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as total_gastado,
        (SELECT MAX(v.created_at) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as ultima_compra,
        (SELECT COALESCE(SUM(f.saldo_pendiente), 0) FROM crm.fiados f WHERE f.cliente_id = c.id AND f.estado IN ('pendiente','pagado_parcial')) as deuda_actual
       FROM pos.clientes c
       WHERE ${condiciones.join(' AND ')}
       ORDER BY c.${ordenar_por === 'nombre' ? 'nombre' : ordenar_por === 'total_gastado' ? 'total_gastado DESC' : 'created_at DESC'}
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

  async actualizar(id: string, negocio_id: string, datos: Partial<CrearClienteDTO>) {
    const campos: string[] = [];
    const valores: any[] = [];
    let contador = 1;

    for (const [clave, valor] of Object.entries(datos)) {
      if (['nombre', 'apellido', 'documento', 'tipo_documento', 'telefono', 'email', 'direccion', 'fecha_nacimiento'].includes(clave) && valor !== undefined) {
        campos.push(`${clave} = $${contador}`);
        valores.push(valor);
        contador++;
      }
    }

    if (campos.length === 0) throw new AppError('No hay campos para actualizar', 400);

    valores.push(id, negocio_id);
    const result = await DatabaseConnection.query(
      `UPDATE pos.clientes SET ${campos.join(', ')}, updated_at = NOW() WHERE id = $${contador} AND negocio_id = $${contador + 1} RETURNING *`,
      valores
    );

    if (result.rows.length === 0) throw new AppError('Cliente no encontrado', 404);
    return result.rows[0];
  }

  async segmentar(negocio_id: string) {
    const [vip, frecuentes, regulares, inactivos, deudores] = await Promise.all([
      DatabaseConnection.query(
        `SELECT c.id, c.nombre, c.apellido, c.puntos_acumulados,
                (SELECT COALESCE(SUM(v.total), 0) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as total_gastado
         FROM pos.clientes c
         WHERE c.negocio_id = $1 AND c.activo = true
         AND (SELECT COALESCE(SUM(v.total), 0) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') > 5000000
         ORDER BY total_gastado DESC LIMIT 20`,
        [negocio_id]
      ),
      DatabaseConnection.query(
        `SELECT c.id, c.nombre, c.apellido, c.puntos_acumulados,
                (SELECT COUNT(*) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada' AND v.created_at >= NOW() - INTERVAL '30 days') as compras_mes
         FROM pos.clientes c
         WHERE c.negocio_id = $1 AND c.activo = true
         AND (SELECT COUNT(*) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada' AND v.created_at >= NOW() - INTERVAL '30 days') >= 3
         ORDER BY compras_mes DESC`,
        [negocio_id]
      ),
      DatabaseConnection.query(
        `SELECT COUNT(*) as total FROM pos.clientes WHERE negocio_id = $1 AND activo = true`,
        [negocio_id]
      ),
      DatabaseConnection.query(
        `SELECT c.id, c.nombre, c.apellido,
                (SELECT MAX(v.created_at) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as ultima_compra
         FROM pos.clientes c
         WHERE c.negocio_id = $1 AND c.activo = true
         AND ((SELECT MAX(v.created_at) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') IS NULL
              OR (SELECT MAX(v.created_at) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') < NOW() - INTERVAL '90 days')
         ORDER BY ultima_compra ASC LIMIT 50`,
        [negocio_id]
      ),
      DatabaseConnection.query(
        `SELECT c.id, c.nombre, c.apellido, c.telefono,
                COALESCE(SUM(f.saldo_pendiente), 0) as deuda_total,
                COUNT(CASE WHEN f.estado = 'vencido' THEN 1 END) as fiados_vencidos
         FROM pos.clientes c
         JOIN crm.fiados f ON c.id = f.cliente_id
         WHERE c.negocio_id = $1 AND f.saldo_pendiente > 0 AND f.estado IN ('pendiente','pagado_parcial','vencido')
         GROUP BY c.id, c.nombre, c.apellido, c.telefono
         HAVING COALESCE(SUM(f.saldo_pendiente), 0) > 0
         ORDER BY deuda_total DESC LIMIT 20`,
        [negocio_id]
      )
    ]);

    return {
      vip: { cantidad: vip.rows.length, clientes: vip.rows },
      frecuentes: { cantidad: frecuentes.rows.length, clientes: frecuentes.rows },
      total_regulares: parseInt(regulares.rows[0].total),
      inactivos: { cantidad: inactivos.rows.length, clientes: inactivos.rows },
      deudores: { cantidad: deudores.rows.length, clientes: deudores.rows }
    };
  }

  async cumpleaneros(negocio_id: string, dias_adelanto: number = 7) {
    const result = await DatabaseConnection.query(
      `SELECT id, nombre, apellido, telefono, fecha_nacimiento,
              EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) as edad_proxima,
              (SELECT COALESCE(SUM(v.total), 0) FROM pos.ventas v WHERE v.cliente_id = c.id AND v.estado = 'completada') as total_gastado
       FROM pos.clientes c
       WHERE c.negocio_id = $1 AND c.activo = true AND c.fecha_nacimiento IS NOT NULL
       AND (
         (EXTRACT(MONTH FROM c.fecha_nacimiento) = EXTRACT(MONTH FROM CURRENT_DATE) 
          AND EXTRACT(DAY FROM c.fecha_nacimiento) BETWEEN EXTRACT(DAY FROM CURRENT_DATE) AND EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '${dias_adelanto} days'))
         OR
         (EXTRACT(MONTH FROM c.fecha_nacimiento) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '${dias_adelanto} days')
          AND EXTRACT(DAY FROM c.fecha_nacimiento) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '${dias_adelanto} days'))
       )
       ORDER BY EXTRACT(DAY FROM c.fecha_nacimiento) ASC`,
      [negocio_id]
    );

    return {
      proximos_dias: dias_adelanto,
      total: result.rows.length,
      clientes: result.rows
    };
  }

  private calcularScoreRiesgo(cliente: any): number {
    let score = 100;
    if (cliente.fiados_vencidos > 0) score -= 30 * cliente.fiados_vencidos;
    if (parseFloat(cliente.deuda_actual) > 0) score -= Math.min(parseFloat(cliente.deuda_actual) / 10000, 40);
    if (cliente.total_compras < 3) score -= 10;
    if (cliente.dias_ultima_compra > 90) score -= 15;
    return Math.max(score, 0);
  }

  private calcularCategoria(cliente: any): string {
    const total = parseFloat(cliente.total_gastado || 0);
    const compras = parseInt(cliente.total_compras || 0);
    if (total > 5000000) return 'vip';
    if (compras >= 10) return 'frecuente';
    if (compras >= 3) return 'regular';
    return 'nuevo';
  }
}

export default new ClienteService();
