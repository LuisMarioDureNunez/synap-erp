// ============================================
// SYNAP - SERVICIO DE INVENTARIO AVANZADO
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// STOCK, LOTES, VENCIMIENTOS, ALERTAS, CONTEO
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

class InventarioService {

  async obtenerStock(negocio_id: string, filtros?: {
    categoria_id?: string;
    stock_bajo?: boolean;
    con_vencimiento?: boolean;
    busqueda?: string;
  }) {
    let query = `
      SELECT 
        p.*,
        c.nombre as categoria_nombre,
        CASE 
          WHEN p.stock_actual <= 0 THEN 'agotado'
          WHEN p.stock_actual <= p.stock_minimo THEN 'bajo'
          WHEN p.stock_actual >= p.stock_maximo AND p.stock_maximo > 0 THEN 'excedido'
          ELSE 'normal'
        END as estado_stock,
        (SELECT COUNT(*) FROM inventory.lotes l WHERE l.producto_id = p.id AND l.cantidad_actual > 0 AND l.activo = true) as total_lotes,
        (SELECT COUNT(*) FROM inventory.lotes l WHERE l.producto_id = p.id AND l.fecha_vencimiento <= NOW() + INTERVAL '30 days' AND l.cantidad_actual > 0 AND l.activo = true) as lotes_por_vencer
      FROM pos.productos p
      LEFT JOIN pos.categorias c ON p.categoria_id = c.id
      WHERE p.negocio_id = $1 AND p.activo = true
    `;

    const valores: any[] = [negocio_id];
    let contador = 2;

    if (filtros?.categoria_id) {
      query += ` AND p.categoria_id = $${contador}`;
      valores.push(filtros.categoria_id);
      contador++;
    }

    if (filtros?.stock_bajo) {
      query += ` AND p.stock_actual <= p.stock_minimo AND p.stock_minimo > 0`;
    }

    if (filtros?.busqueda) {
      query += ` AND (p.nombre ILIKE $${contador} OR p.codigo_barras ILIKE $${contador} OR p.codigo_interno ILIKE $${contador})`;
      valores.push(`%${filtros.busqueda}%`);
      contador++;
    }

    query += ` ORDER BY estado_stock ASC, p.stock_actual ASC, p.nombre ASC`;

    const result = await DatabaseConnection.query(query, valores);
    return result.rows;
  }

  async obtenerProductosAgotados(negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT id, nombre, codigo_interno, codigo_barras, stock_actual, stock_minimo, precio_venta
       FROM pos.productos
       WHERE negocio_id = $1 AND stock_actual <= 0 AND activo = true
       ORDER BY nombre`,
      [negocio_id]
    );

    return {
      total: result.rows.length,
      productos: result.rows
    };
  }

  async productosPorVencer(negocio_id: string, dias: number = 30) {
    const result = await DatabaseConnection.query(
      `SELECT 
        l.id as lote_id,
        l.codigo_lote,
        l.cantidad_actual,
        l.fecha_vencimiento,
        l.created_at as fecha_ingreso,
        p.id as producto_id,
        p.nombre as producto_nombre,
        p.codigo_interno,
        p.precio_venta,
        (l.fecha_vencimiento - CURRENT_DATE) as dias_restantes
       FROM inventory.lotes l
       JOIN pos.productos p ON l.producto_id = p.id
       WHERE p.negocio_id = $1 
         AND l.cantidad_actual > 0 
         AND l.activo = true
         AND l.fecha_vencimiento IS NOT NULL
         AND l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '${dias} days'
       ORDER BY l.fecha_vencimiento ASC`,
      [negocio_id]
    );

    const valorInventario = result.rows.reduce((sum: number, lote: any) => {
      return sum + (parseFloat(lote.cantidad_actual) * parseFloat(lote.precio_venta));
    }, 0);

    return {
      total_lotes: result.rows.length,
      valor_inventario_riesgo: valorInventario,
      dias_analizados: dias,
      lotes: result.rows
    };
  }

  async productosVencidos(negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT 
        l.id as lote_id,
        l.codigo_lote,
        l.cantidad_actual,
        l.fecha_vencimiento,
        p.id as producto_id,
        p.nombre as producto_nombre,
        p.codigo_interno,
        (CURRENT_DATE - l.fecha_vencimiento) as dias_vencido
       FROM inventory.lotes l
       JOIN pos.productos p ON l.producto_id = p.id
       WHERE p.negocio_id = $1 
         AND l.cantidad_actual > 0 
         AND l.activo = true
         AND l.fecha_vencimiento < CURRENT_DATE
       ORDER BY l.fecha_vencimiento ASC`,
      [negocio_id]
    );

    const perdidaEstimada = result.rows.reduce((sum: number, lote: any) => {
      return sum + (parseFloat(lote.cantidad_actual) * parseFloat(lote.precio_venta || 0));
    }, 0);

    return {
      total_lotes_vencidos: result.rows.length,
      perdida_estimada: perdidaEstimada,
      lotes: result.rows
    };
  }

  async iniciarConteoFisico(negocio_id: string, usuario_id: string, sucursal_id?: string) {
    const result = await DatabaseConnection.query(
      `INSERT INTO inventory.movimientos_stock 
       (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_tipo, motivo)
       SELECT id, $2, 'conteo_inicio', 0, stock_actual, stock_actual, 'conteo_fisico', 'Inicio de conteo fisico'
       FROM pos.productos
       WHERE negocio_id = $1 AND activo = true`,
      [negocio_id, usuario_id]
    );

    const productos = await DatabaseConnection.query(
      `SELECT id, nombre, codigo_interno, codigo_barras, stock_actual, stock_minimo, unidad_medida
       FROM pos.productos
       WHERE negocio_id = $1 AND activo = true
       ORDER BY nombre`,
      [negocio_id]
    );

    return {
      conteo_id: new Date().toISOString(),
      fecha_inicio: new Date().toISOString(),
      total_productos: productos.rows.length,
      productos: productos.rows
    };
  }

  async registrarConteoProducto(
    producto_id: string,
    cantidad_real: number,
    usuario_id: string,
    negocio_id: string,
    observaciones?: string
  ) {
    return await DatabaseConnection.transaction(async (client) => {
      const producto = await client.query(
        `SELECT id, nombre, stock_actual FROM pos.productos WHERE id = $1 AND negocio_id = $2`,
        [producto_id, negocio_id]
      );

      if (producto.rows.length === 0) throw new AppError('Producto no encontrado', 404);

      const stockAnterior = parseFloat(producto.rows[0].stock_actual);
      const diferencia = cantidad_real - stockAnterior;

      await client.query(
        `UPDATE pos.productos SET stock_actual = $1, updated_at = NOW() WHERE id = $2`,
        [cantidad_real, producto_id]
      );

      await client.query(
        `INSERT INTO inventory.movimientos_stock
         (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_tipo, motivo)
         VALUES ($1,$2,'ajuste',$3,$4,$5,'conteo_fisico',$6)`,
        [producto_id, usuario_id, diferencia, stockAnterior, cantidad_real, observaciones || 'Ajuste por conteo fisico']
      );

      return {
        producto_id,
        producto_nombre: producto.rows[0].nombre,
        stock_anterior: stockAnterior,
        stock_nuevo: cantidad_real,
        diferencia,
        estado: diferencia === 0 ? 'coincide' : diferencia > 0 ? 'sobrante' : 'faltante'
      };
    });
  }

  async alertasAutomaticas(negocio_id: string) {
    const alertas: any[] = [];

    const stockBajo = await DatabaseConnection.query(
      `SELECT COUNT(*) as total FROM pos.productos 
       WHERE negocio_id = $1 AND activo = true AND stock_actual <= stock_minimo AND stock_minimo > 0`,
      [negocio_id]
    );

    if (parseInt(stockBajo.rows[0].total) > 0) {
      alertas.push({
        tipo: 'stock_bajo',
        nivel: 'advertencia',
        mensaje: `${stockBajo.rows[0].total} productos con stock bajo o agotado`,
        total: parseInt(stockBajo.rows[0].total)
      });
    }

    const porVencer = await DatabaseConnection.query(
      `SELECT COUNT(*) as total FROM inventory.lotes l
       JOIN pos.productos p ON l.producto_id = p.id
       WHERE p.negocio_id = $1 AND l.cantidad_actual > 0 AND l.activo = true
       AND l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '15 days'
       AND l.fecha_vencimiento > CURRENT_DATE`,
      [negocio_id]
    );

    if (parseInt(porVencer.rows[0].total) > 0) {
      alertas.push({
        tipo: 'proximo_vencimiento',
        nivel: 'critico',
        mensaje: `${porVencer.rows[0].total} lotes por vencer en los proximos 15 dias`,
        total: parseInt(porVencer.rows[0].total)
      });
    }

    const vencidos = await DatabaseConnection.query(
      `SELECT COUNT(*) as total FROM inventory.lotes l
       JOIN pos.productos p ON l.producto_id = p.id
       WHERE p.negocio_id = $1 AND l.cantidad_actual > 0 AND l.activo = true
       AND l.fecha_vencimiento < CURRENT_DATE`,
      [negocio_id]
    );

    if (parseInt(vencidos.rows[0].total) > 0) {
      alertas.push({
        tipo: 'vencido',
        nivel: 'peligro',
        mensaje: `${vencidos.rows[0].total} lotes de productos vencidos`,
        total: parseInt(vencidos.rows[0].total)
      });
    }

    const fiadosVencidos = await DatabaseConnection.query(
      `SELECT COUNT(*) as total, COALESCE(SUM(saldo_pendiente), 0) as monto_total
       FROM crm.fiados 
       WHERE negocio_id = $1 AND estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE`,
      [negocio_id]
    );

    if (parseInt(fiadosVencidos.rows[0].total) > 0) {
      alertas.push({
        tipo: 'fiados_vencidos',
        nivel: 'critico',
        mensaje: `${fiadosVencidos.rows[0].total} fiados vencidos por Gs. ${parseFloat(fiadosVencidos.rows[0].monto_total).toLocaleString('es-PY')}`,
        total: parseInt(fiadosVencidos.rows[0].total),
        monto: parseFloat(fiadosVencidos.rows[0].monto_total)
      });
    }

    return {
      total_alertas: alertas.length,
      alertas
    };
  }

  async movimientosStock(producto_id: string, negocio_id: string, limite: number = 50) {
    const producto = await DatabaseConnection.query(
      `SELECT id FROM pos.productos WHERE id = $1 AND negocio_id = $2`,
      [producto_id, negocio_id]
    );

    if (producto.rows.length === 0) throw new AppError('Producto no encontrado', 404);

    const result = await DatabaseConnection.query(
      `SELECT ms.*, u.nombre_completo as usuario_nombre
       FROM inventory.movimientos_stock ms
       JOIN auth.usuarios u ON ms.usuario_id = u.id
       WHERE ms.producto_id = $1
       ORDER BY ms.created_at DESC
       LIMIT $2`,
      [producto_id, limite]
    );

    return result.rows;
  }

  async valoracionInventario(negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT 
        COUNT(*) as total_productos,
        SUM(stock_actual) as total_unidades,
        SUM(stock_actual * precio_costo) as costo_total,
        SUM(stock_actual * precio_venta) as precio_venta_total,
        SUM(stock_actual * precio_venta) - SUM(stock_actual * precio_costo) as ganancia_potencial
       FROM pos.productos
       WHERE negocio_id = $1 AND activo = true`,
      [negocio_id]
    );

    const porCategoria = await DatabaseConnection.query(
      `SELECT 
        c.nombre as categoria,
        COUNT(p.id) as productos,
        SUM(p.stock_actual) as unidades,
        SUM(p.stock_actual * p.precio_costo) as costo_total,
        SUM(p.stock_actual * p.precio_venta) as venta_potencial
       FROM pos.productos p
       LEFT JOIN pos.categorias c ON p.categoria_id = c.id
       WHERE p.negocio_id = $1 AND p.activo = true
       GROUP BY c.nombre
       ORDER BY venta_potencial DESC`,
      [negocio_id]
    );

    return {
      resumen: result.rows[0],
      por_categoria: porCategoria.rows
    };
  }
}

export default new InventarioService();
