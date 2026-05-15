// ============================================
// SYNAP - SERVICIO DE E-COMMERCE
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// TIENDA ONLINE SINCRONIZADA CON POS
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

class TiendaService {

  async configurarTienda(datos: {
    negocio_id: string;
    nombre_tienda: string;
    dominio?: string;
    activa?: boolean;
    config_json?: object;
  }) {
    const existente = await DatabaseConnection.query(
      `SELECT id FROM ecommerce.tienda_config WHERE negocio_id = $1`,
      [datos.negocio_id]
    );

    if (existente.rows.length > 0) {
      const result = await DatabaseConnection.query(
        `UPDATE ecommerce.tienda_config SET 
          nombre_tienda = $1, dominio = $2, activa = $3, config_json = $4
         WHERE negocio_id = $5 RETURNING *`,
        [datos.nombre_tienda, datos.dominio, datos.activa !== false, 
         JSON.stringify(datos.config_json || {}), datos.negocio_id]
      );
      return result.rows[0];
    }

    const result = await DatabaseConnection.query(
      `INSERT INTO ecommerce.tienda_config (negocio_id, nombre_tienda, dominio, activa, config_json)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [datos.negocio_id, datos.nombre_tienda, datos.dominio, 
       datos.activa !== false, JSON.stringify(datos.config_json || {})]
    );

    return result.rows[0];
  }

  async obtenerConfigTienda(negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT * FROM ecommerce.tienda_config WHERE negocio_id = $1`,
      [negocio_id]
    );

    if (result.rows.length === 0) {
      return { configurada: false, mensaje: 'Tienda online no configurada' };
    }

    return { configurada: true, ...result.rows[0] };
  }

  async obtenerCatalogoOnline(negocio_id: string, filtros?: {
    categoria_id?: string;
    busqueda?: string;
    pagina?: number;
    limite?: number;
  }) {
    const { categoria_id, busqueda, pagina = 1, limite = 20 } = filtros || {};
    const condiciones: string[] = ['p.negocio_id = $1', 'p.activo = true', 'p.stock_actual > 0'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (categoria_id) {
      condiciones.push(`p.categoria_id = $${contador}`);
      valores.push(categoria_id);
      contador++;
    }

    if (busqueda) {
      condiciones.push(`(p.nombre ILIKE $${contador} OR p.descripcion ILIKE $${contador} OR p.codigo_barras ILIKE $${contador})`);
      valores.push(`%${busqueda}%`);
      contador++;
    }

    const offset = (pagina - 1) * limite;

    const countResult = await DatabaseConnection.query(
      `SELECT COUNT(*) FROM pos.productos p WHERE ${condiciones.join(' AND ')}`,
      valores
    );

    const datosResult = await DatabaseConnection.query(
      `SELECT p.id, p.nombre, p.descripcion, p.precio_venta, p.precio_mayorista,
              p.stock_actual, p.unidad_medida, p.imagen_url, p.codigo_barras,
              c.nombre as categoria_nombre
       FROM pos.productos p
       LEFT JOIN pos.categorias c ON p.categoria_id = c.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY p.nombre ASC
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

  async crearPedidoOnline(datos: {
    negocio_id: string;
    cliente_id?: string;
    datos_cliente: {
      nombre: string;
      telefono: string;
      email?: string;
      direccion?: string;
    };
    items: Array<{
      producto_id: string;
      cantidad: number;
    }>;
    metodo_pago?: string;
    notas?: string;
  }) {
    return await DatabaseConnection.transaction(async (client) => {
      let clienteId = datos.cliente_id;

      if (!clienteId && datos.datos_cliente) {
        const clienteExistente = await client.query(
          `SELECT id FROM pos.clientes WHERE negocio_id = $1 AND telefono = $2 AND activo = true`,
          [datos.negocio_id, datos.datos_cliente.telefono]
        );

        if (clienteExistente.rows.length > 0) {
          clienteId = clienteExistente.rows[0].id;
        } else {
          const nuevoCliente = await client.query(
            `INSERT INTO pos.clientes (negocio_id, nombre, telefono, email, direccion)
             VALUES ($1,$2,$3,$4,$5) RETURNING id`,
            [datos.negocio_id, datos.datos_cliente.nombre, datos.datos_cliente.telefono,
             datos.datos_cliente.email, datos.datos_cliente.direccion]
          );
          clienteId = nuevoCliente.rows[0].id;
        }
      }

      let subtotal = 0;
      const detalles = [];

      for (const item of datos.items) {
        const producto = await client.query(
          `SELECT id, nombre, precio_venta, stock_actual, aplica_iva, porcentaje_iva
           FROM pos.productos WHERE id = $1 AND negocio_id = $2 AND activo = true`,
          [item.producto_id, datos.negocio_id]
        );

        if (producto.rows.length === 0) {
          throw new AppError(`Producto no encontrado: ${item.producto_id}`, 404);
        }

        if (parseFloat(producto.rows[0].stock_actual) < item.cantidad) {
          throw new AppError(`Stock insuficiente para: ${producto.rows[0].nombre}`, 400);
        }

        const precio = parseFloat(producto.rows[0].precio_venta);
        const iva = producto.rows[0].aplica_iva ? precio * item.cantidad * (producto.rows[0].porcentaje_iva / 100) : 0;
        const subtotalLinea = precio * item.cantidad;
        subtotal += subtotalLinea;

        detalles.push({
          producto_id: item.producto_id,
          producto_nombre: producto.rows[0].nombre,
          cantidad: item.cantidad,
          precio_unitario: precio,
          iva,
          subtotal: subtotalLinea
        });
      }

      const ivaTotal = detalles.reduce((sum, d) => sum + d.iva, 0);
      const total = subtotal + ivaTotal;

      const numeroVenta = `WEB-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 10000).toString().padStart(5,'0')}`;

      const ventaResult = await client.query(
        `INSERT INTO pos.ventas (negocio_id, usuario_id, cliente_id, numero_venta, subtotal, iva_total, total, metodo_pago, estado, observaciones)
         VALUES ($1, (SELECT id FROM auth.usuarios WHERE negocio_id = $1 AND rol = 'super_admin' LIMIT 1), $2, $3, $4, $5, $6, $7, 'completada', $8)
         RETURNING *`,
        [datos.negocio_id, clienteId, numeroVenta, subtotal, ivaTotal, total, datos.metodo_pago || 'online', datos.notas]
      );

      const venta = ventaResult.rows[0];

      for (const detalle of detalles) {
        await client.query(
          `INSERT INTO pos.venta_detalles (venta_id, producto_id, cantidad, precio_unitario, iva, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [venta.id, detalle.producto_id, detalle.cantidad, detalle.precio_unitario, detalle.iva, detalle.subtotal]
        );

        await client.query(
          `UPDATE pos.productos SET stock_actual = stock_actual - $1, updated_at = NOW() WHERE id = $2`,
          [detalle.cantidad, detalle.producto_id]
        );

        await client.query(
          `INSERT INTO inventory.movimientos_stock (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo, motivo)
           SELECT $1, venta.usuario_id, 'salida', $2, stock_actual + $2, stock_actual, $3, 'venta_online', 'Venta online ' || $4
           FROM pos.ventas venta, pos.productos p
           WHERE venta.id = $3 AND p.id = $1`,
          [detalle.producto_id, detalle.cantidad, venta.id, numeroVenta]
        );
      }

      const pedidoOnline = await client.query(
        `INSERT INTO ecommerce.pedidos_online (tienda_id, cliente_id, datos_cliente, total, estado)
         SELECT id, $2, $3, $4, 'pendiente' FROM ecommerce.tienda_config WHERE negocio_id = $5
         RETURNING *`,
        [datos.negocio_id, clienteId, JSON.stringify(datos.datos_cliente), total, datos.negocio_id]
      );

      return {
        pedido: pedidoOnline.rows[0],
        venta,
        detalles,
        total
      };
    });
  }

  async listarPedidosOnline(filtros: {
    negocio_id: string;
    estado?: string;
    pagina?: number;
    limite?: number;
  }) {
    const { negocio_id, estado, pagina = 1, limite = 20 } = filtros;
    const condiciones: string[] = ['tc.negocio_id = $1'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (estado) {
      condiciones.push(`po.estado = $${contador}`);
      valores.push(estado);
      contador++;
    }

    const offset = (pagina - 1) * limite;

    const countResult = await DatabaseConnection.query(
      `SELECT COUNT(*) FROM ecommerce.pedidos_online po
       JOIN ecommerce.tienda_config tc ON po.tienda_id = tc.id
       WHERE ${condiciones.join(' AND ')}`,
      valores
    );

    const datosResult = await DatabaseConnection.query(
      `SELECT po.*, tc.nombre_tienda,
        c.nombre as cliente_nombre, c.telefono as cliente_telefono
       FROM ecommerce.pedidos_online po
       JOIN ecommerce.tienda_config tc ON po.tienda_id = tc.id
       LEFT JOIN pos.clientes c ON po.cliente_id = c.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY po.created_at DESC
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

  async actualizarEstadoPedidoOnline(pedido_id: string, estado: string, negocio_id: string) {
    const result = await DatabaseConnection.query(
      `UPDATE ecommerce.pedidos_online po
       SET estado = $1
       FROM ecommerce.tienda_config tc
       WHERE po.tienda_id = tc.id AND po.id = $2 AND tc.negocio_id = $3
       RETURNING po.*`,
      [estado, pedido_id, negocio_id]
    );

    if (result.rows.length === 0) throw new AppError('Pedido no encontrado', 404);
    return result.rows[0];
  }
}

export default new TiendaService();
