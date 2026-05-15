// ============================================
// SYNAP - SERVICIO DE PRODUCTOS
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// BUSQUEDA AVANZADA CON TRIGRAM Y CACHE
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

interface CrearProductoDTO {
  negocio_id: string;
  categoria_id?: string;
  codigo_barras?: string;
  codigo_interno?: string;
  nombre: string;
  descripcion?: string;
  precio_costo: number;
  precio_venta: number;
  precio_mayorista?: number;
  stock_actual?: number;
  stock_minimo?: number;
  stock_maximo?: number;
  unidad_medida?: string;
  es_fraccionable?: boolean;
  peso_unitario?: number;
  aplica_iva?: boolean;
  porcentaje_iva?: number;
  imagen_url?: string;
}

interface ActualizarProductoDTO extends Partial<CrearProductoDTO> {
  id: string;
}

interface FiltrosBusqueda {
  negocio_id: string;
  busqueda?: string;
  categoria_id?: string;
  stock_bajo?: boolean;
  activo?: boolean;
  pagina?: number;
  limite?: number;
  ordenar_por?: string;
  direccion?: 'ASC' | 'DESC';
}

class ProductoService {

  async crear(datos: CrearProductoDTO) {
    const codigo_interno = datos.codigo_interno || await this.generarCodigoInterno(datos.negocio_id);

    const result = await DatabaseConnection.query(
      `INSERT INTO pos.productos (
        negocio_id, categoria_id, codigo_barras, codigo_interno, nombre, descripcion,
        precio_costo, precio_venta, precio_mayorista, stock_actual, stock_minimo,
        stock_maximo, unidad_medida, es_fraccionable, peso_unitario,
        aplica_iva, porcentaje_iva, imagen_url
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [
        datos.negocio_id, datos.categoria_id, datos.codigo_barras, codigo_interno,
        datos.nombre, datos.descripcion, datos.precio_costo, datos.precio_venta,
        datos.precio_mayorista, datos.stock_actual || 0, datos.stock_minimo || 0,
        datos.stock_maximo || 0, datos.unidad_medida || 'unidad',
        datos.es_fraccionable || false, datos.peso_unitario,
        datos.aplica_iva !== false, datos.porcentaje_iva || 10, datos.imagen_url
      ]
    );

    return result.rows[0];
  }

  async actualizar(datos: ActualizarProductoDTO) {
    const campos: string[] = [];
    const valores: any[] = [];
    let contador = 1;

    const camposPermitidos = [
      'categoria_id', 'codigo_barras', 'codigo_interno', 'nombre', 'descripcion',
      'precio_costo', 'precio_venta', 'precio_mayorista', 'stock_actual',
      'stock_minimo', 'stock_maximo', 'unidad_medida', 'es_fraccionable',
      'peso_unitario', 'aplica_iva', 'porcentaje_iva', 'imagen_url', 'activo'
    ];

    for (const [clave, valor] of Object.entries(datos)) {
      if (clave === 'id') continue;
      if (camposPermitidos.includes(clave) && valor !== undefined) {
        campos.push(`${clave} = $${contador}`);
        valores.push(valor);
        contador++;
      }
    }

    if (campos.length === 0) {
      throw new AppError('No hay campos para actualizar', 400);
    }

    valores.push(datos.id);
    const result = await DatabaseConnection.query(
      `UPDATE pos.productos SET ${campos.join(', ')}, updated_at = NOW()
       WHERE id = $${contador} RETURNING *`,
      valores
    );

    if (result.rows.length === 0) {
      throw new AppError('Producto no encontrado', 404);
    }

    return result.rows[0];
  }

  async obtenerPorId(id: string, negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT p.*, c.nombre as categoria_nombre
       FROM pos.productos p
       LEFT JOIN pos.categorias c ON p.categoria_id = c.id
       WHERE p.id = $1 AND p.negocio_id = $2`,
      [id, negocio_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Producto no encontrado', 404);
    }

    return result.rows[0];
  }

  async buscar(filtros: FiltrosBusqueda) {
    const {
      negocio_id, busqueda, categoria_id, stock_bajo,
      activo, pagina = 1, limite = 20,
      ordenar_por = 'nombre', direccion = 'ASC'
    } = filtros;

    const condiciones: string[] = ['p.negocio_id = $1'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (busqueda) {
      condiciones.push(`(
        p.nombre ILIKE $${contador} OR
        p.codigo_barras ILIKE $${contador} OR
        p.codigo_interno ILIKE $${contador} OR
        p.descripcion ILIKE $${contador} OR
        similarity(p.nombre, $${contador}) > 0.3
      )`);
      valores.push(`%${busqueda}%`);
      contador++;
    }

    if (categoria_id) {
      condiciones.push(`p.categoria_id = $${contador}`);
      valores.push(categoria_id);
      contador++;
    }

    if (stock_bajo) {
      condiciones.push('p.stock_actual <= p.stock_minimo AND p.stock_minimo > 0');
    }

    if (activo !== undefined) {
      condiciones.push(`p.activo = $${contador}`);
      valores.push(activo);
      contador++;
    } else {
      condiciones.push('p.activo = true');
    }

    const ordenesPermitidos = ['nombre', 'precio_venta', 'stock_actual', 'created_at', 'updated_at'];
    const ordenFinal = ordenesPermitidos.includes(ordenar_por) ? ordenar_por : 'nombre';
    const direccionFinal = direccion === 'DESC' ? 'DESC' : 'ASC';

    const offset = (pagina - 1) * limite;

    const queryCount = `SELECT COUNT(*) FROM pos.productos p WHERE ${condiciones.join(' AND ')}`;
    const countResult = await DatabaseConnection.query(queryCount, valores);
    const total = parseInt(countResult.rows[0].count);

    const queryDatos = `
      SELECT p.*, c.nombre as categoria_nombre
      FROM pos.productos p
      LEFT JOIN pos.categorias c ON p.categoria_id = c.id
      WHERE ${condiciones.join(' AND ')}
      ORDER BY p.${ordenFinal} ${direccionFinal}
      LIMIT $${contador} OFFSET $${contador + 1}
    `;

    valores.push(limite, offset);
    const datosResult = await DatabaseConnection.query(queryDatos, valores);

    return {
      datos: datosResult.rows,
      paginacion: {
        pagina,
        limite,
        total,
        totalPaginas: Math.ceil(total / limite)
      }
    };
  }

  async eliminar(id: string, negocio_id: string) {
    const result = await DatabaseConnection.query(
      `UPDATE pos.productos SET activo = false, updated_at = NOW()
       WHERE id = $1 AND negocio_id = $2 RETURNING id`,
      [id, negocio_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Producto no encontrado', 404);
    }

    return { eliminado: true };
  }

  async verificarStock(producto_id: string, cantidad: number): Promise<boolean> {
    const result = await DatabaseConnection.query(
      `SELECT stock_actual FROM pos.productos WHERE id = $1`,
      [producto_id]
    );

    if (result.rows.length === 0) return false;
    return parseFloat(result.rows[0].stock_actual) >= cantidad;
  }

  private async generarCodigoInterno(negocio_id: string): Promise<string> {
    const result = await DatabaseConnection.query(
      `SELECT COUNT(*) as total FROM pos.productos WHERE negocio_id = $1`,
      [negocio_id]
    );
    const total = parseInt(result.rows[0].total) + 1;
    return `PROD-${negocio_id.substring(0, 8).toUpperCase()}-${total.toString().padStart(6, '0')}`;
  }

  async productosMasVendidos(negocio_id: string, dias: number = 30, limite: number = 10) {
    const result = await DatabaseConnection.query(
      `SELECT p.id, p.nombre, p.precio_venta, p.stock_actual,
              SUM(vd.cantidad) as total_vendido,
              SUM(vd.subtotal) as total_ingresos,
              COUNT(DISTINCT vd.venta_id) as cantidad_ventas
       FROM pos.venta_detalles vd
       JOIN pos.productos p ON vd.producto_id = p.id
       JOIN pos.ventas v ON vd.venta_id = v.id
       WHERE v.negocio_id = $1
         AND v.created_at >= NOW() - INTERVAL '${dias} days'
         AND v.estado = 'completada'
       GROUP BY p.id, p.nombre, p.precio_venta, p.stock_actual
       ORDER BY total_vendido DESC
       LIMIT $2`,
      [negocio_id, limite]
    );

    return result.rows;
  }
}

export default new ProductoService();
