// ============================================
// SYNAP - SERVICIO DE VENTAS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// VENTAS CON TRANSACCIONES, STOCK, FIADO, PUNTOS
// ============================================

import DatabaseConnection from "../../../config/database";
import { AppError } from "../../../middleware/error.middleware";
import ProductoService from "./producto.service";

interface DetalleVenta {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;
  iva?: number;
}

interface CrearVentaDTO {
  negocio_id: string;
  sucursal_id?: string;
  usuario_id: string;
  cliente_id?: string;
  detalles: DetalleVenta[];
  metodo_pago: string;
  monto_recibido?: number;
  descuento_general?: number;
  observaciones?: string;
  es_fiado?: boolean;
}

class VentaService {
  async crear(datos: CrearVentaDTO) {
    return await DatabaseConnection.transaction(async (client) => {
      for (const detalle of datos.detalles) {
        const stockOk = await ProductoService.verificarStock(
          detalle.producto_id,
          detalle.cantidad,
        );
        if (!stockOk) {
          const prod = await client.query(
            `SELECT nombre, stock_actual FROM pos.productos WHERE id = $1`,
            [detalle.producto_id],
          );
          throw new AppError(
            `Stock insuficiente para "${prod.rows[0]?.nombre}". Disponible: ${prod.rows[0]?.stock_actual}`,
            400,
          );
        }
      }

      let subtotal = 0;
      let ivaTotal = 0;

      for (const detalle of datos.detalles) {
        const prodResult = await client.query(
          `SELECT aplica_iva, porcentaje_iva FROM pos.productos WHERE id = $1`,
          [detalle.producto_id],
        );
        const producto = prodResult.rows[0];

        const precioFinal = detalle.precio_unitario - (detalle.descuento || 0);
        const subtotalLinea = precioFinal * detalle.cantidad;
        subtotal += subtotalLinea;

        if (producto.aplica_iva) {
          const ivaLinea = subtotalLinea * (producto.porcentaje_iva / 100);
          ivaTotal += ivaLinea;
          detalle.iva = ivaLinea;
        }
      }

      const descuentoGeneral = datos.descuento_general || 0;
      const total = subtotal + ivaTotal - descuentoGeneral;

      const numeroVenta = await this.generarNumeroVenta(
        datos.negocio_id,
        client,
      );

      const ventaResult = await client.query(
        `INSERT INTO pos.ventas (
          negocio_id, sucursal_id, usuario_id, cliente_id, numero_venta,
          subtotal, descuento, iva_total, total, metodo_pago,
          monto_recibido, vuelto, es_fiado, estado, observaciones
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING *`,
        [
          datos.negocio_id,
          datos.sucursal_id,
          datos.usuario_id,
          datos.cliente_id,
          numeroVenta,
          subtotal,
          descuentoGeneral,
          ivaTotal,
          total,
          datos.metodo_pago,
          datos.monto_recibido || total,
          datos.monto_recibido ? datos.monto_recibido - total : 0,
          datos.es_fiado || false,
          "completada",
          datos.observaciones,
        ],
      );

      const venta = ventaResult.rows[0];

      for (const detalle of datos.detalles) {
        const subtotalLinea =
          (detalle.precio_unitario - (detalle.descuento || 0)) *
          detalle.cantidad;
        await client.query(
          `INSERT INTO pos.venta_detalles (venta_id, producto_id, cantidad, precio_unitario, descuento, iva, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            venta.id,
            detalle.producto_id,
            detalle.cantidad,
            detalle.precio_unitario,
            detalle.descuento || 0,
            detalle.iva || 0,
            subtotalLinea,
          ],
        );

        await client.query(
          `UPDATE pos.productos SET stock_actual = stock_actual - $1, updated_at = NOW() WHERE id = $2`,
          [detalle.cantidad, detalle.producto_id],
        );

        await client.query(
          `INSERT INTO inventory.movimientos_stock 
           (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo, motivo)
           SELECT $1, $2, 'salida', $3, stock_actual + $3, stock_actual, $4, 'venta', 'Venta ' || $5
           FROM pos.productos WHERE id = $1`,
          [
            detalle.producto_id,
            datos.usuario_id,
            detalle.cantidad,
            venta.id,
            numeroVenta,
          ],
        );
      }

      if (datos.es_fiado && datos.cliente_id) {
        const diasVencimiento = 30;
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + diasVencimiento);

        await client.query(
          `INSERT INTO crm.fiados (negocio_id, cliente_id, venta_id, monto_total, saldo_pendiente, fecha_vencimiento)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            datos.negocio_id,
            datos.cliente_id,
            venta.id,
            total,
            total,
            fechaVencimiento,
          ],
        );
      }

      if (datos.cliente_id && !datos.es_fiado) {
        const puntosGanados = Math.floor(total / 1000);
        if (puntosGanados > 0) {
          await client.query(
            `INSERT INTO crm.puntos_transacciones (cliente_id, venta_id, puntos_ganados, saldo_puntos, tipo)
             VALUES ($1,$2,$3,$4,'ganado')`,
            [datos.cliente_id, venta.id, puntosGanados, puntosGanados],
          );

          await client.query(
            `UPDATE pos.clientes SET puntos_acumulados = puntos_acumulados + $1 WHERE id = $2`,
            [puntosGanados, datos.cliente_id],
          );
        }
      }

      const detallesResult = await client.query(
        `SELECT vd.*, p.nombre as producto_nombre, p.codigo_barras, p.unidad_medida
         FROM pos.venta_detalles vd
         JOIN pos.productos p ON vd.producto_id = p.id
         WHERE vd.venta_id = $1`,
        [venta.id],
      );

      return {
        venta,
        detalles: detallesResult.rows,
        ticket: this.generarTicket(venta, detallesResult.rows),
      };
    });
  }

  async obtenerPorId(venta_id: string, negocio_id: string) {
    const ventaResult = await DatabaseConnection.query(
      `SELECT v.*, u.nombre_completo as vendedor, c.nombre as cliente_nombre
       FROM pos.ventas v
       JOIN auth.usuarios u ON v.usuario_id = u.id
       LEFT JOIN pos.clientes c ON v.cliente_id = c.id
       WHERE v.id = $1 AND v.negocio_id = $2`,
      [venta_id, negocio_id],
    );

    if (ventaResult.rows.length === 0) {
      throw new AppError("Venta no encontrada", 404);
    }

    const detallesResult = await DatabaseConnection.query(
      `SELECT vd.*, p.nombre as producto_nombre, p.codigo_barras, p.unidad_medida, p.imagen_url
       FROM pos.venta_detalles vd
       JOIN pos.productos p ON vd.producto_id = p.id
       WHERE vd.venta_id = $1`,
      [venta_id],
    );

    return {
      venta: ventaResult.rows[0],
      detalles: detallesResult.rows,
    };
  }

  async listar(filtros: {
    negocio_id: string;
    sucursal_id?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    metodo_pago?: string;
    estado?: string;
    pagina?: number;
    limite?: number;
  }) {
    const {
      negocio_id,
      sucursal_id,
      fecha_inicio,
      fecha_fin,
      metodo_pago,
      estado,
      pagina = 1,
      limite = 20,
    } = filtros;

    const condiciones: string[] = ["v.negocio_id = $1"];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (sucursal_id) {
      condiciones.push(`v.sucursal_id = $${contador}`);
      valores.push(sucursal_id);
      contador++;
    }

    if (fecha_inicio) {
      condiciones.push(`v.created_at >= $${contador}`);
      valores.push(fecha_inicio);
      contador++;
    }

    if (fecha_fin) {
      condiciones.push(`v.created_at <= $${contador}`);
      valores.push(fecha_fin);
      contador++;
    }

    if (metodo_pago) {
      condiciones.push(`v.metodo_pago = $${contador}`);
      valores.push(metodo_pago);
      contador++;
    }

    if (estado) {
      condiciones.push(`v.estado = $${contador}`);
      valores.push(estado);
      contador++;
    }

    const offset = (pagina - 1) * limite;

    const countResult = await DatabaseConnection.query(
      `SELECT COUNT(*) FROM pos.ventas v WHERE ${condiciones.join(" AND ")}`,
      valores,
    );
    const total = parseInt(countResult.rows[0].count);

    const datosResult = await DatabaseConnection.query(
      `SELECT v.*, u.nombre_completo as vendedor, c.nombre as cliente_nombre
       FROM pos.ventas v
       JOIN auth.usuarios u ON v.usuario_id = u.id
       LEFT JOIN pos.clientes c ON v.cliente_id = c.id
       WHERE ${condiciones.join(" AND ")}
       ORDER BY v.created_at DESC
       LIMIT $${contador} OFFSET $${contador + 1}`,
      [...valores, limite, offset],
    );

    return {
      datos: datosResult.rows,
      paginacion: {
        pagina,
        limite,
        total,
        totalPaginas: Math.ceil(total / limite),
      },
    };
  }

  async anular(
    venta_id: string,
    negocio_id: string,
    usuario_id: string,
    motivo: string,
  ) {
    return await DatabaseConnection.transaction(async (client) => {
      const ventaResult = await client.query(
        `SELECT * FROM pos.ventas WHERE id = $1 AND negocio_id = $2 AND estado = 'completada'`,
        [venta_id, negocio_id],
      );

      if (ventaResult.rows.length === 0) {
        throw new AppError("Venta no encontrada o ya anulada", 404);
      }

      await client.query(
        `UPDATE pos.ventas SET estado = 'anulada', observaciones = COALESCE(observaciones, '') || ' | ANULADA: ' || $3
         WHERE id = $1`,
        [venta_id, negocio_id, motivo],
      );

      const detallesResult = await client.query(
        `SELECT producto_id, cantidad FROM pos.venta_detalles WHERE venta_id = $1`,
        [venta_id],
      );

      for (const detalle of detallesResult.rows) {
        await client.query(
          `UPDATE pos.productos SET stock_actual = stock_actual + $1 WHERE id = $2`,
          [detalle.cantidad, detalle.producto_id],
        );

        await client.query(
          `INSERT INTO inventory.movimientos_stock
           (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo, motivo)
           SELECT $1, $2, 'entrada', $3, stock_actual - $3, stock_actual, $4, 'anulacion', $5
           FROM pos.productos WHERE id = $1`,
          [detalle.producto_id, usuario_id, detalle.cantidad, venta_id, motivo],
        );
      }

      await client.query(
        `UPDATE crm.fiados SET estado = 'cancelado' WHERE venta_id = $1`,
        [venta_id],
      );

      return { anulada: true, venta_id };
    });
  }

  private async generarNumeroVenta(
    negocio_id: string,
    client?: any,
  ): Promise<string> {
    const db = client || DatabaseConnection;
    const fecha = new Date();
    const prefijo = `V-${fecha.getFullYear()}${(fecha.getMonth() + 1).toString().padStart(2, "0")}${fecha.getDate().toString().padStart(2, "0")}`;

    const result = await db.query(
      `SELECT COUNT(*) as total FROM pos.ventas
       WHERE negocio_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [negocio_id],
    );

    const consecutivo = (parseInt(result.rows[0].total) + 1)
      .toString()
      .padStart(5, "0");
    return `${prefijo}-${consecutivo}`;
  }

  private generarTicket(venta: any, detalles: any[]): string {
    let ticket = "========================================\n";
    ticket += "           SYNAP - TICKET DE VENTA        \n";
    ticket += "       Sistema de Negocios del Paraguay    \n";
    ticket += "========================================\n";
    ticket += `Venta: ${venta.numero_venta}\n`;
    ticket += `Fecha: ${new Date(venta.created_at).toLocaleString("es-PY")}\n`;
    ticket += "----------------------------------------\n";
    ticket += "PRODUCTO          CANT   PRECIO   SUBTOT\n";
    ticket += "----------------------------------------\n";

    for (const d of detalles) {
      const nombre = d.producto_nombre.substring(0, 16).padEnd(16);
      const cant = d.cantidad.toString().padStart(5);
      const precio = parseFloat(d.precio_unitario).toFixed(0).padStart(8);
      const subtotal = parseFloat(d.subtotal).toFixed(0).padStart(8);
      ticket += `${nombre} ${cant} ${precio} ${subtotal}\n`;
    }

    ticket += "----------------------------------------\n";
    ticket += `SUBTOTAL:               ${parseFloat(venta.subtotal).toLocaleString("es-PY")}\n`;
    ticket += `DESCUENTO:              ${parseFloat(venta.descuento).toLocaleString("es-PY")}\n`;
    ticket += `IVA:                    ${parseFloat(venta.iva_total).toLocaleString("es-PY")}\n`;
    ticket += `TOTAL:                  ${parseFloat(venta.total).toLocaleString("es-PY")}\n`;
    ticket += `METODO DE PAGO:         ${venta.metodo_pago.toUpperCase()}\n`;
    if (venta.monto_recibido) {
      ticket += `RECIBIDO:               ${parseFloat(venta.monto_recibido).toLocaleString("es-PY")}\n`;
      ticket += `VUELTO:                 ${parseFloat(venta.vuelto).toLocaleString("es-PY")}\n`;
    }
    ticket += "========================================\n";
    ticket += "  Gracias por su compra - Vuelva pronto  \n";
    ticket += "       SYNAP by LMTN - Paraguay          \n";
    ticket += "========================================\n";

    return ticket;
  }

  async resumenDia(negocio_id: string, sucursal_id?: string) {
    const condiciones: string[] = [
      "v.negocio_id = $1",
      "DATE(v.created_at) = CURRENT_DATE",
      "v.estado = 'completada'",
    ];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (sucursal_id) {
      condiciones.push(`v.sucursal_id = $${contador}`);
      valores.push(sucursal_id);
      contador++;
    }

    const result = await DatabaseConnection.query(
      `SELECT 
         COUNT(*) as total_ventas,
         COALESCE(SUM(v.total), 0) as total_ingresos,
         COALESCE(AVG(v.total), 0) as ticket_promedio,
         COALESCE(SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE 0 END), 0) as total_efectivo,
         COALESCE(SUM(CASE WHEN v.metodo_pago = 'tarjeta_credito' THEN v.total ELSE 0 END), 0) as total_tarjeta_credito,
         COALESCE(SUM(CASE WHEN v.metodo_pago = 'tarjeta_debito' THEN v.total ELSE 0 END), 0) as total_tarjeta_debito,
         COALESCE(SUM(CASE WHEN v.metodo_pago = 'transferencia' THEN v.total ELSE 0 END), 0) as total_transferencia,
         COALESCE(SUM(CASE WHEN v.metodo_pago = 'qr' THEN v.total ELSE 0 END), 0) as total_qr,
         COALESCE(SUM(CASE WHEN v.es_fiado = true THEN v.total ELSE 0 END), 0) as total_fiado,
         COUNT(DISTINCT v.cliente_id) as clientes_atendidos,
         COUNT(DISTINCT v.usuario_id) as vendedores_activos
       FROM pos.ventas v
       WHERE ${condiciones.join(" AND ")}`,
      valores,
    );

    return result.rows[0];
  }
}

export default new VentaService();
