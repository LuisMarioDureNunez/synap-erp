// ============================================
// SYNAP - SERVICIO DE COMPRAS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// COMPRAS CON LOTES, VENCIMIENTOS Y STOCK AUTOMATICO
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

interface DetalleCompra {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  lote_codigo?: string;
  lote_vencimiento?: string;
}

interface CrearCompraDTO {
  negocio_id: string;
  proveedor_id: string;
  usuario_id: string;
  detalles: DetalleCompra[];
  observaciones?: string;
}

class CompraService {

  async crear(datos: CrearCompraDTO) {
    return await DatabaseConnection.transaction(async (client) => {
      const proveedor = await client.query(
        `SELECT id, nombre FROM inventory.proveedores WHERE id = $1 AND negocio_id = $2 AND activo = true`,
        [datos.proveedor_id, datos.negocio_id]
      );

      if (proveedor.rows.length === 0) {
        throw new AppError('Proveedor no encontrado o inactivo', 404);
      }

      let subtotal = 0;
      for (const detalle of datos.detalles) {
        const producto = await client.query(
          `SELECT id, nombre, precio_costo, stock_actual FROM pos.productos WHERE id = $1 AND negocio_id = $2`,
          [detalle.producto_id, datos.negocio_id]
        );

        if (producto.rows.length === 0) {
          throw new AppError(`Producto no encontrado: ${detalle.producto_id}`, 404);
        }

        detalle.precio_unitario = detalle.precio_unitario || producto.rows[0].precio_costo;
        subtotal += detalle.cantidad * detalle.precio_unitario;
      }

      const iva = subtotal * 0.10;
      const total = subtotal + iva;

      const numeroCompra = await this.generarNumeroCompra(datos.negocio_id, client);

      const compraResult = await client.query(
        `INSERT INTO inventory.compras (negocio_id, proveedor_id, usuario_id, numero_compra, subtotal, iva, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [datos.negocio_id, datos.proveedor_id, datos.usuario_id, numeroCompra, subtotal, iva, total]
      );

      const compra = compraResult.rows[0];
      const detallesInsertados = [];

      for (const detalle of datos.detalles) {
        const subtotalLinea = detalle.cantidad * detalle.precio_unitario;

        const detalleResult = await client.query(
          `INSERT INTO inventory.compra_detalles (compra_id, producto_id, cantidad, precio_unitario, subtotal)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [compra.id, detalle.producto_id, detalle.cantidad, detalle.precio_unitario, subtotalLinea]
        );

        await client.query(
          `UPDATE pos.productos 
           SET stock_actual = stock_actual + $1, 
               precio_costo = CASE WHEN $2 > 0 THEN (precio_costo * stock_actual + $2 * $1) / (stock_actual + $1) ELSE precio_costo END,
               updated_at = NOW()
           WHERE id = $3`,
          [detalle.cantidad, detalle.precio_unitario, detalle.producto_id]
        );

        const stockActual = await client.query(
          `SELECT stock_actual FROM pos.productos WHERE id = $1`,
          [detalle.producto_id]
        );

        await client.query(
          `INSERT INTO inventory.movimientos_stock
           (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo, motivo)
           VALUES ($1,$2,'entrada',$3,$4,$5,$6,'compra','Compra ' || $7)`,
          [
            detalle.producto_id, datos.usuario_id, detalle.cantidad,
            parseFloat(stockActual.rows[0].stock_actual) - detalle.cantidad,
            parseFloat(stockActual.rows[0].stock_actual),
            compra.id, numeroCompra
          ]
        );

        if (detalle.lote_codigo) {
          await client.query(
            `INSERT INTO inventory.lotes (producto_id, compra_id, codigo_lote, cantidad_inicial, cantidad_actual, fecha_vencimiento)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              detalle.producto_id, compra.id, detalle.lote_codigo,
              detalle.cantidad, detalle.cantidad,
              detalle.lote_vencimiento || null
            ]
          );
        }

        const productoInfo = await client.query(
          `SELECT nombre, codigo_interno FROM pos.productos WHERE id = $1`,
          [detalle.producto_id]
        );

        detallesInsertados.push({
          ...detalleResult.rows[0],
          producto_nombre: productoInfo.rows[0].nombre,
          producto_codigo: productoInfo.rows[0].codigo_interno
        });
      }

      return {
        compra,
        detalles: detallesInsertados,
        proveedor: proveedor.rows[0].nombre,
        total_productos: detallesInsertados.length
      };
    });
  }

  async obtenerPorId(compra_id: string, negocio_id: string) {
    const compraResult = await DatabaseConnection.query(
      `SELECT c.*, p.nombre as proveedor_nombre, p.ruc as proveedor_ruc,
              u.nombre_completo as usuario_nombre
       FROM inventory.compras c
       JOIN inventory.proveedores p ON c.proveedor_id = p.id
       JOIN auth.usuarios u ON c.usuario_id = u.id
       WHERE c.id = $1 AND c.negocio_id = $2`,
      [compra_id, negocio_id]
    );

    if (compraResult.rows.length === 0) throw new AppError('Compra no encontrada', 404);

    const detallesResult = await DatabaseConnection.query(
      `SELECT cd.*, pr.nombre as producto_nombre, pr.codigo_interno, pr.unidad_medida
       FROM inventory.compra_detalles cd
       JOIN pos.productos pr ON cd.producto_id = pr.id
       WHERE cd.compra_id = $1`,
      [compra_id]
    );

    return {
      compra: compraResult.rows[0],
      detalles: detallesResult.rows
    };
  }

  async listar(filtros: {
    negocio_id: string;
    proveedor_id?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    pagina?: number;
    limite?: number;
  }) {
    const { negocio_id, proveedor_id, fecha_inicio, fecha_fin, pagina = 1, limite = 20 } = filtros;
    const condiciones: string[] = ['c.negocio_id = $1'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (proveedor_id) {
      condiciones.push(`c.proveedor_id = $${contador}`);
      valores.push(proveedor_id);
      contador++;
    }

    if (fecha_inicio) {
      condiciones.push(`c.created_at >= $${contador}`);
      valores.push(fecha_inicio);
      contador++;
    }

    if (fecha_fin) {
      condiciones.push(`c.created_at <= $${contador}`);
      valores.push(fecha_fin);
      contador++;
    }

    const offset = (pagina - 1) * limite;

    const countResult = await DatabaseConnection.query(
      `SELECT COUNT(*) FROM inventory.compras c WHERE ${condiciones.join(' AND ')}`,
      valores
    );

    const datosResult = await DatabaseConnection.query(
      `SELECT c.*, p.nombre as proveedor_nombre, u.nombre_completo as usuario_nombre
       FROM inventory.compras c
       JOIN inventory.proveedores p ON c.proveedor_id = p.id
       JOIN auth.usuarios u ON c.usuario_id = u.id
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

  private async generarNumeroCompra(negocio_id: string, client: any): Promise<string> {
    const fecha = new Date();
    const prefijo = `C-${fecha.getFullYear()}${(fecha.getMonth() + 1).toString().padStart(2, '0')}${fecha.getDate().toString().padStart(2, '0')}`;

    const result = await client.query(
      `SELECT COUNT(*) as total FROM inventory.compras
       WHERE negocio_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [negocio_id]
    );

    const consecutivo = (parseInt(result.rows[0].total) + 1).toString().padStart(5, '0');
    return `${prefijo}-${consecutivo}`;
  }

  async resumenCompras(negocio_id: string, dias: number = 30) {
    const result = await DatabaseConnection.query(
      `SELECT 
        COUNT(*) as total_compras,
        COALESCE(SUM(total), 0) as total_invertido,
        COALESCE(AVG(total), 0) as compra_promedio,
        COUNT(DISTINCT proveedor_id) as proveedores_activos,
        MAX(created_at) as ultima_compra
       FROM inventory.compras
       WHERE negocio_id = $1 
         AND created_at >= NOW() - INTERVAL '${dias} days'
         AND estado = 'recibida'`,
      [negocio_id]
    );

    return result.rows[0];
  }
}

export default new CompraService();
