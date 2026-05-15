// ============================================
// SYNAP - SERVICIO DE BUSINESS INTELLIGENCE
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// METRICAS, TENDENCIAS, PREDICCIONES, ANOMALIAS
// ============================================

import DatabaseConnection from "../../../config/database";

class BIService {
  async generarMetricasDiarias(negocio_id: string, fecha?: string) {
    const fechaConsulta = fecha || new Date().toISOString().split("T")[0];

    const metricas = await DatabaseConnection.query(
      `SELECT 
        COALESCE(SUM(v.total), 0) as total_ventas,
        COUNT(v.id) as cantidad_ventas,
        CASE WHEN COUNT(v.id) > 0 THEN COALESCE(SUM(v.total), 0) / COUNT(v.id) ELSE 0 END as ticket_promedio,
        COUNT(DISTINCT v.cliente_id) FILTER (WHERE v.cliente_id IS NOT NULL) as clientes_atendidos,
        COUNT(DISTINCT v.usuario_id) as vendedores_activos,
        COALESCE(SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE 0 END), 0) as total_efectivo,
        COALESCE(SUM(CASE WHEN v.metodo_pago IN ('tarjeta_credito','tarjeta_debito') THEN v.total ELSE 0 END), 0) as total_tarjeta,
        COALESCE(SUM(CASE WHEN v.metodo_pago = 'transferencia' THEN v.total ELSE 0 END), 0) as total_transferencia,
        COALESCE(SUM(CASE WHEN v.metodo_pago = 'qr' THEN v.total ELSE 0 END), 0) as total_qr,
        COALESCE(SUM(CASE WHEN v.es_fiado = true THEN v.total ELSE 0 END), 0) as total_fiado,
        COALESCE(SUM(vd.cantidad), 0) as productos_vendidos,
        COUNT(DISTINCT vd.producto_id) as productos_distintos
       FROM pos.ventas v
       LEFT JOIN pos.venta_detalles vd ON v.id = vd.venta_id
       WHERE v.negocio_id = $1 AND DATE(v.created_at) = $2 AND v.estado = 'completada'`,
      [negocio_id, fechaConsulta],
    );

    const horaPico = await DatabaseConnection.query(
      `SELECT EXTRACT(HOUR FROM created_at) as hora, COUNT(*) as cantidad
       FROM pos.ventas
       WHERE negocio_id = $1 AND DATE(created_at) = $2 AND estado = 'completada'
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY cantidad DESC LIMIT 1`,
      [negocio_id, fechaConsulta],
    );

    const topProductos = await DatabaseConnection.query(
      `SELECT p.nombre, SUM(vd.cantidad) as cantidad, SUM(vd.subtotal) as total
       FROM pos.venta_detalles vd
       JOIN pos.ventas v ON vd.venta_id = v.id
       JOIN pos.productos p ON vd.producto_id = p.id
       WHERE v.negocio_id = $1 AND DATE(v.created_at) = $2 AND v.estado = 'completada'
       GROUP BY p.nombre
       ORDER BY cantidad DESC LIMIT 5`,
      [negocio_id, fechaConsulta],
    );

    const metricasData = metricas.rows[0];

    await DatabaseConnection.query(
      `INSERT INTO bi.metricas_diarias (negocio_id, fecha, total_ventas, cantidad_ventas, ticket_promedio, clientes_nuevos, productos_vendidos)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [
        negocio_id,
        fechaConsulta,
        metricasData.total_ventas,
        metricasData.cantidad_ventas,
        metricasData.ticket_promedio,
        0,
        metricasData.productos_vendidos,
      ],
    );

    return {
      fecha: fechaConsulta,
      ...metricasData,
      hora_pico: horaPico.rows[0] || null,
      top_productos: topProductos.rows,
    };
  }

  async tendenciasVentas(negocio_id: string, dias: number = 30) {
    const result = await DatabaseConnection.query(
      `SELECT 
        DATE(created_at) as fecha,
        COUNT(*) as cantidad_ventas,
        COALESCE(SUM(total), 0) as total_ventas,
        COALESCE(AVG(total), 0) as ticket_promedio,
        COUNT(DISTINCT cliente_id) FILTER (WHERE cliente_id IS NOT NULL) as clientes,
        COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as efectivo,
        COALESCE(SUM(CASE WHEN metodo_pago IN ('tarjeta_credito','tarjeta_debito') THEN total ELSE 0 END), 0) as tarjeta,
        COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as transferencia
       FROM pos.ventas
       WHERE negocio_id = $1 AND estado = 'completada'
         AND created_at >= NOW() - INTERVAL '${dias} days'
       GROUP BY DATE(created_at)
       ORDER BY fecha ASC`,
      [negocio_id],
    );

    const ventas = result.rows;

    const promedioMovil = [];
    for (let i = 6; i < ventas.length; i++) {
      const suma = ventas
        .slice(i - 6, i + 1)
        .reduce((acc: number, v: any) => acc + parseFloat(v.total_ventas), 0);
      promedioMovil.push({
        fecha: ventas[i].fecha,
        promedio_7_dias: suma / 7,
      });
    }

    const crecimiento =
      ventas.length >= 2
        ? (
            ((parseFloat(ventas[ventas.length - 1].total_ventas) -
              parseFloat(ventas[0].total_ventas)) /
              parseFloat(ventas[0].total_ventas)) *
            100
          ).toFixed(2)
        : 0;

    const totalPeriodo = ventas.reduce(
      (sum: number, v: any) => sum + parseFloat(v.total_ventas),
      0,
    );
    const promedioDiario = ventas.length > 0 ? totalPeriodo / ventas.length : 0;
    const mejorDia =
      ventas.length > 0
        ? ventas.reduce(
            (max: any, v: any) =>
              parseFloat(v.total_ventas) > parseFloat(max.total_ventas)
                ? v
                : max,
            ventas[0],
          )
        : null;
    const peorDia =
      ventas.length > 0
        ? ventas.reduce(
            (min: any, v: any) =>
              parseFloat(v.total_ventas) < parseFloat(min.total_ventas)
                ? v
                : min,
            ventas[0],
          )
        : null;

    const diaSemana = await DatabaseConnection.query(
      `SELECT 
        EXTRACT(DOW FROM created_at) as dia_semana,
        TO_CHAR(created_at, 'Day') as nombre_dia,
        COUNT(*) as cantidad,
        COALESCE(AVG(total), 0) as promedio
       FROM pos.ventas
       WHERE negocio_id = $1 AND estado = 'completada'
         AND created_at >= NOW() - INTERVAL '${dias} days'
       GROUP BY EXTRACT(DOW FROM created_at), TO_CHAR(created_at, 'Day')
       ORDER BY promedio DESC`,
      [negocio_id],
    );

    return {
      periodo_dias: dias,
      total_ventas_periodo: totalPeriodo,
      promedio_diario: promedioDiario,
      crecimiento_porcentaje: crecimiento,
      mejor_dia: mejorDia,
      peor_dia: peorDia,
      rendimiento_por_dia_semana: diaSemana.rows,
      promedio_movil_7_dias: promedioMovil.slice(-7),
      datos_diarios: ventas,
    };
  }

  async dashboardGeneral(negocio_id: string) {
    const hoy = new Date().toISOString().split("T")[0];
    const inicioMes = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .split("T")[0];

    const [ventasHoy, ventasMes, inventario, fiados, clientes, empleados] =
      await Promise.all([
        DatabaseConnection.query(
          `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad
         FROM pos.ventas WHERE negocio_id = $1 AND DATE(created_at) = $2 AND estado = 'completada'`,
          [negocio_id, hoy],
        ),
        DatabaseConnection.query(
          `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad, COALESCE(AVG(total), 0) as ticket_promedio
         FROM pos.ventas WHERE negocio_id = $1 AND DATE(created_at) >= $2 AND estado = 'completada'`,
          [negocio_id, inicioMes],
        ),
        DatabaseConnection.query(
          `SELECT COUNT(*) as total_productos, COALESCE(SUM(stock_actual * precio_costo), 0) as valor_costo,
                COALESCE(SUM(stock_actual * precio_venta), 0) as valor_venta,
                COUNT(CASE WHEN stock_actual <= stock_minimo AND stock_minimo > 0 THEN 1 END) as stock_bajo
         FROM pos.productos WHERE negocio_id = $1 AND activo = true`,
          [negocio_id],
        ),
        DatabaseConnection.query(
          `SELECT COALESCE(SUM(saldo_pendiente), 0) as total_pendiente,
                COUNT(*) as total_fiados,
                COUNT(CASE WHEN fecha_vencimiento < CURRENT_DATE THEN 1 END) as vencidos
         FROM crm.fiados WHERE negocio_id = $1 AND estado IN ('pendiente','pagado_parcial')`,
          [negocio_id],
        ),
        DatabaseConnection.query(
          `SELECT COUNT(*) as total FROM pos.clientes WHERE negocio_id = $1 AND activo = true`,
          [negocio_id],
        ),
        DatabaseConnection.query(
          `SELECT COUNT(*) as total FROM hr.empleados WHERE negocio_id = $1 AND activo = true`,
          [negocio_id],
        ),
      ]);

    const gananciaPotencial =
      parseFloat(inventario.rows[0].valor_venta) -
      parseFloat(inventario.rows[0].valor_costo);

    return {
      fecha: hoy,
      ventas_hoy: {
        total: parseFloat(ventasHoy.rows[0].total),
        cantidad: parseInt(ventasHoy.rows[0].cantidad),
      },
      ventas_mes: {
        total: parseFloat(ventasMes.rows[0].total),
        cantidad: parseInt(ventasMes.rows[0].cantidad),
        ticket_promedio: parseFloat(ventasMes.rows[0].ticket_promedio),
      },
      inventario: {
        total_productos: parseInt(inventario.rows[0].total_productos),
        valor_costo: parseFloat(inventario.rows[0].valor_costo),
        valor_venta: parseFloat(inventario.rows[0].valor_venta),
        ganancia_potencial: gananciaPotencial,
        stock_bajo: parseInt(inventario.rows[0].stock_bajo),
      },
      fiados: {
        total_pendiente: parseFloat(fiados.rows[0].total_pendiente),
        total_activos: parseInt(fiados.rows[0].total_fiados),
        vencidos: parseInt(fiados.rows[0].vencidos),
      },
      clientes: parseInt(clientes.rows[0].total),
      empleados: parseInt(empleados.rows[0].total),
    };
  }

  async comparativaMensual(negocio_id: string, meses: number = 6) {
    const result = await DatabaseConnection.query(
      `SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as mes,
        TO_CHAR(DATE_TRUNC('month', created_at), 'Month YYYY') as mes_nombre,
        COUNT(*) as cantidad_ventas,
        COALESCE(SUM(total), 0) as total_ventas,
        COALESCE(AVG(total), 0) as ticket_promedio,
        COUNT(DISTINCT cliente_id) FILTER (WHERE cliente_id IS NOT NULL) as clientes
       FROM pos.ventas
       WHERE negocio_id = $1 AND estado = 'completada'
         AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '${meses - 1} months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY mes ASC`,
      [negocio_id],
    );

    const datos = result.rows;
    let crecimiento = null;

    if (datos.length >= 2) {
      const penultimo = parseFloat(datos[datos.length - 2].total_ventas);
      const ultimo = parseFloat(datos[datos.length - 1].total_ventas);
      crecimiento =
        penultimo > 0
          ? (((ultimo - penultimo) / penultimo) * 100).toFixed(2)
          : null;
    }

    return {
      meses_analizados: datos.length,
      crecimiento_ultimo_mes: crecimiento,
      datos_mensuales: datos,
    };
  }
}

export default new BIService();
