// ============================================
// SYNAP - SERVICIO DE INTELIGENCIA ARTIFICIAL
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// PREDICCIONES, ANOMALIAS, RECOMENDACIONES
// ============================================

import DatabaseConnection from "../../../config/database";

class IAService {
  async predecirVentas(negocio_id: string, diasFuturos: number = 7) {
    const historico = await DatabaseConnection.query(
      `SELECT DATE(created_at) as fecha, COALESCE(SUM(total), 0) as total
       FROM pos.ventas
       WHERE negocio_id = $1 AND estado = 'completada'
         AND created_at >= NOW() - INTERVAL '90 days'
       GROUP BY DATE(created_at)
       ORDER BY fecha ASC`,
      [negocio_id],
    );

    const datos = historico.rows;
    if (datos.length < 14) {
      return {
        prediccion_disponible: false,
        mensaje: "Se necesitan al menos 14 dias de datos historicos",
      };
    }

    const ventas = datos.map((d: any) => parseFloat(d.total));
    const promedioGeneral =
      ventas.reduce((a: number, b: number) => a + b, 0) / ventas.length;

    const diaSemanaPromedio: number[] = [0, 0, 0, 0, 0, 0, 0];
    const diaSemanaCount: number[] = [0, 0, 0, 0, 0, 0, 0];

    datos.forEach((d: any) => {
      const dia = new Date(d.fecha).getDay();
      diaSemanaPromedio[dia] += parseFloat(d.total);
      diaSemanaCount[dia]++;
    });

    for (let i = 0; i < 7; i++) {
      diaSemanaPromedio[i] =
        diaSemanaCount[i] > 0
          ? diaSemanaPromedio[i] / diaSemanaCount[i]
          : promedioGeneral;
    }

    const tendenciaReciente =
      ventas.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7;
    const tendenciaPrevia =
      ventas.slice(-14, -7).reduce((a: number, b: number) => a + b, 0) / 7;
    const factorTendencia =
      tendenciaPrevia > 0 ? tendenciaReciente / tendenciaPrevia : 1;

    const predicciones = [];
    let fechaActual = new Date();

    for (let i = 1; i <= diasFuturos; i++) {
      fechaActual.setDate(fechaActual.getDate() + 1);
      const dia = fechaActual.getDay();
      const prediccionBase = diaSemanaPromedio[dia];
      const prediccionAjustada = prediccionBase * factorTendencia;

      const intervaloConfianza = prediccionAjustada * 0.2;

      predicciones.push({
        fecha: fechaActual.toISOString().split("T")[0],
        dia_semana: [
          "Domingo",
          "Lunes",
          "Martes",
          "Miercoles",
          "Jueves",
          "Viernes",
          "Sabado",
        ][dia],
        prediccion_ventas: Math.round(prediccionAjustada),
        rango_minimo: Math.round(prediccionAjustada - intervaloConfianza),
        rango_maximo: Math.round(prediccionAjustada + intervaloConfianza),
        confianza: Math.round(Math.min(95, 50 + (datos.length / 90) * 45)),
      });
    }

    await DatabaseConnection.query(
      `INSERT INTO bi.predicciones (negocio_id, tipo, datos_json, fecha_prediccion, precision)
       VALUES ($1, 'ventas_diarias', $2, CURRENT_DATE, $3)`,
      [
        negocio_id,
        JSON.stringify(predicciones),
        Math.round(Math.min(95, 50 + (datos.length / 90) * 45)),
      ],
    );

    return {
      prediccion_disponible: true,
      basado_en_dias: datos.length,
      promedio_general: Math.round(promedioGeneral),
      factor_tendencia: factorTendencia.toFixed(2),
      predicciones,
    };
  }

  async detectarAnomalias(negocio_id: string) {
    const ventasRecientes = await DatabaseConnection.query(
      `SELECT DATE(created_at) as fecha, COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
       FROM pos.ventas
       WHERE negocio_id = $1 AND estado = 'completada'
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY fecha DESC`,
      [negocio_id],
    );

    const datos = ventasRecientes.rows;
    if (datos.length < 7)
      return { anomalias: [], mensaje: "Datos insuficientes" };

    const totales = datos.map((d: any) => parseFloat(d.total));
    const promedio =
      totales.reduce((a: number, b: number) => a + b, 0) / totales.length;

    const desviacionEstandar = Math.sqrt(
      totales.reduce(
        (sum: number, val: number) => sum + Math.pow(val - promedio, 2),
        0,
      ) / totales.length,
    );

    const umbral = desviacionEstandar * 2;
    const anomalias = datos
      .filter((d: any) => {
        const total = parseFloat(d.total);
        return Math.abs(total - promedio) > umbral;
      })
      .map((d: any) => ({
        fecha: d.fecha,
        total: parseFloat(d.total),
        cantidad: parseInt(d.cantidad),
        tipo: parseFloat(d.total) > promedio ? "pico_alto" : "caida_baja",
        desviacion: parseFloat(d.total) - promedio,
        porcentaje_desviacion: (
          ((parseFloat(d.total) - promedio) / promedio) *
          100
        ).toFixed(2),
      }));

    const productosAnomalos = await DatabaseConnection.query(
      `SELECT p.nombre, 
        COALESCE(SUM(vd.cantidad), 0) as ventas_30_dias,
        p.stock_actual,
        CASE 
          WHEN p.stock_actual = 0 AND COALESCE(SUM(vd.cantidad), 0) > 10 THEN 'producto_estrella_agotado'
          WHEN p.stock_actual > p.stock_maximo * 2 AND p.stock_maximo > 0 THEN 'sobrestock_critico'
          WHEN COALESCE(SUM(vd.cantidad), 0) = 0 AND p.stock_actual > 50 THEN 'producto_estancado'
          ELSE NULL
        END as anomalia
       FROM pos.productos p
       LEFT JOIN pos.venta_detalles vd ON p.id = vd.producto_id
       LEFT JOIN pos.ventas v ON vd.venta_id = v.id AND v.created_at >= NOW() - INTERVAL '30 days' AND v.estado = 'completada'
       WHERE p.negocio_id = $1 AND p.activo = true
       GROUP BY p.id, p.nombre, p.stock_actual, p.stock_maximo
       HAVING 
         (p.stock_actual = 0 AND COALESCE(SUM(vd.cantidad), 0) > 10) OR
         (p.stock_actual > p.stock_maximo * 2 AND p.stock_maximo > 0) OR
         (COALESCE(SUM(vd.cantidad), 0) = 0 AND p.stock_actual > 50)`,
      [negocio_id],
    );

    return {
      fecha_analisis: new Date().toISOString().split("T")[0],
      promedio_diario: Math.round(promedio),
      desviacion_estandar: Math.round(desviacionEstandar),
      anomalias_ventas: anomalias,
      anomalias_productos: productosAnomalos.rows,
      total_anomalias: anomalias.length + productosAnomalos.rows.length,
    };
  }

  async recomendacionesInteligentes(negocio_id: string) {
    const recomendaciones: any[] = [];

    const stockBajo = await DatabaseConnection.query(
      `SELECT COUNT(*) as total FROM pos.productos 
       WHERE negocio_id = $1 AND activo = true AND stock_actual <= stock_minimo AND stock_minimo > 0`,
      [negocio_id],
    );

    if (parseInt(stockBajo.rows[0].total) > 5) {
      recomendaciones.push({
        tipo: "inventario",
        prioridad: "alta",
        mensaje: `Hay ${stockBajo.rows[0].total} productos con stock bajo. Se recomienda realizar compras urgentes.`,
        accion: "Ir a inventario > Stock bajo",
      });
    }

    const fiadosVencidos = await DatabaseConnection.query(
      `SELECT COUNT(*) as total, COALESCE(SUM(saldo_pendiente), 0) as monto
       FROM crm.fiados WHERE negocio_id = $1 AND estado IN ('pendiente','pagado_parcial') AND fecha_vencimiento < CURRENT_DATE`,
      [negocio_id],
    );

    if (parseInt(fiadosVencidos.rows[0].total) > 0) {
      recomendaciones.push({
        tipo: "cobranza",
        prioridad: "critica",
        mensaje: `${fiadosVencidos.rows[0].total} fiados vencidos por Gs. ${parseFloat(fiadosVencidos.rows[0].monto).toLocaleString("es-PY")}. Gestionar cobro inmediato.`,
        accion: "Ir a CRM > Fiados",
      });
    }

    const clientesInactivos = await DatabaseConnection.query(
      `SELECT COUNT(*) as total FROM pos.clientes c
       WHERE c.negocio_id = $1 AND c.activo = true
       AND (SELECT MAX(v.created_at) FROM pos.ventas v WHERE v.cliente_id = c.id) < NOW() - INTERVAL '30 days'
       AND (SELECT COUNT(*) FROM pos.ventas v WHERE v.cliente_id = c.id) > 3`,
      [negocio_id],
    );

    if (parseInt(clientesInactivos.rows[0].total) > 3) {
      recomendaciones.push({
        tipo: "fidelizacion",
        prioridad: "media",
        mensaje: `${clientesInactivos.rows[0].total} clientes frecuentes no han comprado en 30 dias. Considere enviar promociones.`,
        accion: "Ir a CRM > Clientes inactivos",
      });
    }

    const productosEstrella = await DatabaseConnection.query(
      `SELECT p.nombre, SUM(vd.cantidad) as total_vendido
       FROM pos.venta_detalles vd
       JOIN pos.ventas v ON vd.venta_id = v.id
       JOIN pos.productos p ON vd.producto_id = p.id
       WHERE v.negocio_id = $1 AND v.estado = 'completada'
         AND v.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY p.nombre
       ORDER BY total_vendido DESC LIMIT 5`,
      [negocio_id],
    );

    if (productosEstrella.rows.length > 0) {
      recomendaciones.push({
        tipo: "ventas",
        prioridad: "info",
        mensaje: `Productos mas vendidos este mes: ${productosEstrella.rows.map((p: any) => p.nombre).join(", ")}. Asegure stock suficiente.`,
        accion: "Ver reporte de productos mas vendidos",
      });
    }

    const ventasHoyVsAyer = await DatabaseConnection.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN total ELSE 0 END), 0) as hoy,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE - 1 THEN total ELSE 0 END), 0) as ayer
       FROM pos.ventas WHERE negocio_id = $1 AND estado = 'completada'`,
      [negocio_id],
    );

    const hoy = parseFloat(ventasHoyVsAyer.rows[0].hoy);
    const ayer = parseFloat(ventasHoyVsAyer.rows[0].ayer);

    if (ayer > 0 && hoy < ayer * 0.5) {
      recomendaciones.push({
        tipo: "alerta",
        prioridad: "alta",
        mensaje: `Las ventas de hoy (Gs. ${hoy.toLocaleString("es-PY")}) estan muy por debajo de ayer (Gs. ${ayer.toLocaleString("es-PY")}).`,
        accion: "Verificar posibles causas",
      });
    }

    return {
      total_recomendaciones: recomendaciones.length,
      recomendaciones,
    };
  }
}

export default new IAService();
