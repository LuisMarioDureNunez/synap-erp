// ============================================
// SYNAP - SERVICIO DE CUENTAS Y GASTOS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

class CuentasService {

  async crearCuenta(datos: { negocio_id: string; nombre: string; tipo: string; saldo_inicial?: number }) {
    const result = await DatabaseConnection.query(
      `INSERT INTO finance.cuentas (negocio_id, nombre, tipo, saldo)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [datos.negocio_id, datos.nombre, datos.tipo, datos.saldo_inicial || 0]
    );
    return result.rows[0];
  }

  async listarCuentas(negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT c.*,
        (SELECT COALESCE(SUM(t.monto), 0) FROM finance.transacciones t WHERE t.cuenta_id = c.id AND t.tipo = 'ingreso') as total_ingresos,
        (SELECT COALESCE(SUM(t.monto), 0) FROM finance.transacciones t WHERE t.cuenta_id = c.id AND t.tipo = 'egreso') as total_egresos
       FROM finance.cuentas c
       WHERE c.negocio_id = $1 AND c.activo = true
       ORDER BY c.nombre`,
      [negocio_id]
    );
    return result.rows;
  }

  async registrarTransaccion(datos: {
    negocio_id: string;
    cuenta_id: string;
    usuario_id: string;
    tipo: string;
    monto: number;
    descripcion?: string;
  }) {
    return await DatabaseConnection.transaction(async (client) => {
      const cuenta = await client.query(
        `SELECT * FROM finance.cuentas WHERE id = $1 AND negocio_id = $2 AND activo = true`,
        [datos.cuenta_id, datos.negocio_id]
      );

      if (cuenta.rows.length === 0) throw new AppError('Cuenta no encontrada', 404);

      const nuevoSaldo = datos.tipo === 'ingreso'
        ? parseFloat(cuenta.rows[0].saldo) + datos.monto
        : parseFloat(cuenta.rows[0].saldo) - datos.monto;

      if (nuevoSaldo < 0 && datos.tipo === 'egreso') {
        throw new AppError('Saldo insuficiente para esta transaccion', 400);
      }

      await client.query(
        `UPDATE finance.cuentas SET saldo = $1 WHERE id = $2`,
        [nuevoSaldo, datos.cuenta_id]
      );

      const result = await client.query(
        `INSERT INTO finance.transacciones (negocio_id, cuenta_id, usuario_id, tipo, monto, descripcion)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [datos.negocio_id, datos.cuenta_id, datos.usuario_id, datos.tipo, datos.monto, datos.descripcion]
      );

      return {
        transaccion: result.rows[0],
        saldo_anterior: parseFloat(cuenta.rows[0].saldo),
        saldo_nuevo: nuevoSaldo
      };
    });
  }

  async registrarGasto(datos: {
    negocio_id: string;
    usuario_id: string;
    categoria: string;
    monto: number;
    descripcion?: string;
    comprobante_url?: string;
  }) {
    const result = await DatabaseConnection.query(
      `INSERT INTO finance.gastos (negocio_id, usuario_id, categoria, monto, descripcion, comprobante_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [datos.negocio_id, datos.usuario_id, datos.categoria, datos.monto, datos.descripcion, datos.comprobante_url]
    );
    return result.rows[0];
  }

  async listarGastos(filtros: {
    negocio_id: string;
    categoria?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    pagina?: number;
    limite?: number;
  }) {
    const { negocio_id, categoria, fecha_inicio, fecha_fin, pagina = 1, limite = 20 } = filtros;
    const condiciones: string[] = ['g.negocio_id = $1'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (categoria) {
      condiciones.push(`g.categoria = $${contador}`);
      valores.push(categoria);
      contador++;
    }

    if (fecha_inicio) {
      condiciones.push(`DATE(g.created_at) >= $${contador}`);
      valores.push(fecha_inicio);
      contador++;
    }

    if (fecha_fin) {
      condiciones.push(`DATE(g.created_at) <= $${contador}`);
      valores.push(fecha_fin);
      contador++;
    }

    const offset = (pagina - 1) * limite;

    const countResult = await DatabaseConnection.query(
      `SELECT COUNT(*) FROM finance.gastos g WHERE ${condiciones.join(' AND ')}`,
      valores
    );

    const datosResult = await DatabaseConnection.query(
      `SELECT g.*, u.nombre_completo as usuario_nombre
       FROM finance.gastos g
       JOIN auth.usuarios u ON g.usuario_id = u.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY g.created_at DESC
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

  async resumenFinanciero(negocio_id: string, periodo: string = 'mes') {
    let intervalo = "DATE_TRUNC('month', CURRENT_DATE)";
    if (periodo === 'semana') intervalo = "DATE_TRUNC('week', CURRENT_DATE)";
    if (periodo === 'dia') intervalo = "CURRENT_DATE";

    const resultado = await DatabaseConnection.query(
      `SELECT
        (SELECT COALESCE(SUM(v.total), 0) FROM pos.ventas v 
         WHERE v.negocio_id = $1 AND v.estado = 'completada' AND DATE(v.created_at) >= ${intervalo}) as ingresos_ventas,
        (SELECT COALESCE(SUM(g.monto), 0) FROM finance.gastos g 
         WHERE g.negocio_id = $1 AND DATE(g.created_at) >= ${intervalo}) as total_gastos,
        (SELECT COALESCE(SUM(f.saldo_pendiente), 0) FROM crm.fiados f 
         WHERE f.negocio_id = $1 AND f.estado IN ('pendiente','pagado_parcial')) as cuentas_por_cobrar,
        (SELECT COALESCE(SUM(c.saldo), 0) FROM finance.cuentas c 
         WHERE c.negocio_id = $1 AND c.activo = true) as saldo_cuentas
      `,
      [negocio_id]
    );

    const datos = resultado.rows[0];
    const ingresos = parseFloat(datos.ingresos_ventas);
    const gastos = parseFloat(datos.total_gastos);

    return {
      ...datos,
      ganancia_neta: ingresos - gastos,
      margen: ingresos > 0 ? ((ingresos - gastos) / ingresos * 100).toFixed(2) : 0,
      periodo
    };
  }

  async flujoCaja(negocio_id: string, dias: number = 30) {
    const result = await DatabaseConnection.query(
      `SELECT 
        DATE(v.created_at) as fecha,
        COUNT(*) as cantidad_ventas,
        COALESCE(SUM(v.total), 0) as total_ventas,
        COALESCE(SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE 0 END), 0) as efectivo,
        COALESCE(SUM(CASE WHEN v.metodo_pago IN ('tarjeta_credito','tarjeta_debito') THEN v.total ELSE 0 END), 0) as tarjeta,
        COALESCE(SUM(CASE WHEN v.metodo_pago = 'transferencia' THEN v.total ELSE 0 END), 0) as transferencia
       FROM pos.ventas v
       WHERE v.negocio_id = $1 AND v.estado = 'completada'
         AND v.created_at >= NOW() - INTERVAL '${dias} days'
       GROUP BY DATE(v.created_at)
       ORDER BY fecha DESC`,
      [negocio_id]
    );

    const gastosPorDia = await DatabaseConnection.query(
      `SELECT DATE(created_at) as fecha, COALESCE(SUM(monto), 0) as total_gastos
       FROM finance.gastos
       WHERE negocio_id = $1 AND created_at >= NOW() - INTERVAL '${dias} days'
       GROUP BY DATE(created_at)`,
      [negocio_id]
    );

    const flujo = result.rows.map(dia => {
      const gasto = gastosPorDia.rows.find(g => 
        new Date(g.fecha).toDateString() === new Date(dia.fecha).toDateString()
      );
      return {
        ...dia,
        gastos: gasto ? parseFloat(gasto.total_gastos) : 0,
        neto: parseFloat(dia.total_ventas) - (gasto ? parseFloat(gasto.total_gastos) : 0)
      };
    });

    return flujo;
  }
}

export default new CuentasService();
