// ============================================
// SYNAP - SERVICIO DE PROVEEDORES
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// GESTION COMPLETA CON HISTORIAL Y METRICAS
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

interface CrearProveedorDTO {
  negocio_id: string;
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto_nombre?: string;
}

class ProveedorService {

  async crear(datos: CrearProveedorDTO) {
    const existente = await DatabaseConnection.query(
      `SELECT id FROM inventory.proveedores WHERE negocio_id = $1 AND (ruc = $2 OR nombre ILIKE $3) AND activo = true`,
      [datos.negocio_id, datos.ruc || null, datos.nombre]
    );

    if (existente.rows.length > 0) {
      throw new AppError('Ya existe un proveedor con ese RUC o nombre similar', 409);
    }

    const result = await DatabaseConnection.query(
      `INSERT INTO inventory.proveedores (negocio_id, nombre, ruc, telefono, email, direccion, contacto_nombre)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [datos.negocio_id, datos.nombre, datos.ruc, datos.telefono, datos.email, datos.direccion, datos.contacto_nombre]
    );

    return result.rows[0];
  }

  async obtenerPorId(id: string, negocio_id: string) {
    const result = await DatabaseConnection.query(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM inventory.compras WHERE proveedor_id = p.id) as total_compras,
        (SELECT COALESCE(SUM(total), 0) FROM inventory.compras WHERE proveedor_id = p.id AND estado = 'recibida') as total_comprado,
        (SELECT MAX(created_at) FROM inventory.compras WHERE proveedor_id = p.id) as ultima_compra
       FROM inventory.proveedores p
       WHERE p.id = $1 AND p.negocio_id = $2`,
      [id, negocio_id]
    );

    if (result.rows.length === 0) throw new AppError('Proveedor no encontrado', 404);
    return result.rows[0];
  }

  async listar(negocio_id: string, busqueda?: string) {
    let query = `SELECT p.*,
      (SELECT COUNT(*) FROM inventory.compras WHERE proveedor_id = p.id) as total_compras,
      (SELECT MAX(created_at) FROM inventory.compras WHERE proveedor_id = p.id) as ultima_compra
      FROM inventory.proveedores p
      WHERE p.negocio_id = $1 AND p.activo = true`;
    
    const valores: any[] = [negocio_id];

    if (busqueda) {
      query += ` AND (p.nombre ILIKE $2 OR p.ruc ILIKE $2 OR p.contacto_nombre ILIKE $2)`;
      valores.push(`%${busqueda}%`);
    }

    query += ` ORDER BY p.nombre ASC`;

    const result = await DatabaseConnection.query(query, valores);
    return result.rows;
  }

  async actualizar(id: string, negocio_id: string, datos: Partial<CrearProveedorDTO>) {
    const campos: string[] = [];
    const valores: any[] = [];
    let contador = 1;

    for (const [clave, valor] of Object.entries(datos)) {
      if (['nombre', 'ruc', 'telefono', 'email', 'direccion', 'contacto_nombre'].includes(clave) && valor !== undefined) {
        campos.push(`${clave} = $${contador}`);
        valores.push(valor);
        contador++;
      }
    }

    if (campos.length === 0) throw new AppError('No hay campos para actualizar', 400);

    valores.push(id, negocio_id);
    const result = await DatabaseConnection.query(
      `UPDATE inventory.proveedores SET ${campos.join(', ')} WHERE id = $${contador} AND negocio_id = $${contador + 1} RETURNING *`,
      valores
    );

    if (result.rows.length === 0) throw new AppError('Proveedor no encontrado', 404);
    return result.rows[0];
  }

  async eliminar(id: string, negocio_id: string) {
    const tieneCompras = await DatabaseConnection.query(
      `SELECT COUNT(*) as total FROM inventory.compras WHERE proveedor_id = $1`,
      [id]
    );

    if (parseInt(tieneCompras.rows[0].total) > 0) {
      await DatabaseConnection.query(
        `UPDATE inventory.proveedores SET activo = false WHERE id = $1 AND negocio_id = $2`,
        [id, negocio_id]
      );
      return { eliminado: true, metodo: 'desactivado', motivo: 'Tiene compras asociadas' };
    }

    await DatabaseConnection.query(
      `DELETE FROM inventory.proveedores WHERE id = $1 AND negocio_id = $2`,
      [id, negocio_id]
    );

    return { eliminado: true, metodo: 'permanente' };
  }
}

export default new ProveedorService();
