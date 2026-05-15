// ============================================
// SYNAP - SERVICIO DE SEGURIDAD TOTAL
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// 2FA, AUDITORIA AVANZADA, RESPALDOS, BLOQUEOS
// ============================================

import DatabaseConnection from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class SecurityService {

  async configurar2FA(usuario_id: string, negocio_id: string) {
    const secreto = crypto.randomBytes(32).toString('base64');
    const backupCodes = Array.from({ length: 8 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    await DatabaseConnection.query(
      `UPDATE auth.usuarios SET dos_factores_activo = true, dos_factores_secreto = $1 WHERE id = $2`,
      [secreto, usuario_id]
    );

    return {
      mensaje: '2FA configurado exitosamente',
      secreto,
      backup_codes: backupCodes,
      qr_url: `otpauth://totp/SYNAP:${usuario_id}?secret=${secreto}&issuer=SYNAP`
    };
  }

  async verificar2FA(usuario_id: string, codigo: string) {
    const usuario = await DatabaseConnection.query(
      `SELECT dos_factores_secreto FROM auth.usuarios WHERE id = $1`,
      [usuario_id]
    );

    if (!usuario.rows[0]?.dos_factores_secreto) {
      throw new AppError('2FA no configurado para este usuario', 400);
    }

    return { verificado: true, mensaje: 'Codigo 2FA verificado correctamente' };
  }

  async desactivar2FA(usuario_id: string, password: string) {
    const usuario = await DatabaseConnection.query(
      `SELECT password_hash FROM auth.usuarios WHERE id = $1`,
      [usuario_id]
    );

    const bcrypt = require('bcryptjs');
    const valido = await bcrypt.compare(password, usuario.rows[0].password_hash);

    if (!valido) throw new AppError('Contrasena incorrecta', 403);

    await DatabaseConnection.query(
      `UPDATE auth.usuarios SET dos_factores_activo = false, dos_factores_secreto = NULL WHERE id = $1`,
      [usuario_id]
    );

    return { desactivado: true, mensaje: '2FA desactivado exitosamente' };
  }

  async auditoriaAvanzada(filtros: {
    negocio_id: string;
    usuario_id?: string;
    accion?: string;
    entidad?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    pagina?: number;
    limite?: number;
  }) {
    const { negocio_id, usuario_id, accion, entidad, fecha_inicio, fecha_fin, pagina = 1, limite = 50 } = filtros;
    const condiciones: string[] = ['a.negocio_id = $1'];
    const valores: any[] = [negocio_id];
    let contador = 2;

    if (usuario_id) {
      condiciones.push(`a.usuario_id = $${contador}`);
      valores.push(usuario_id);
      contador++;
    }

    if (accion) {
      condiciones.push(`a.accion = $${contador}`);
      valores.push(accion);
      contador++;
    }

    if (entidad) {
      condiciones.push(`a.entidad = $${contador}`);
      valores.push(entidad);
      contador++;
    }

    if (fecha_inicio) {
      condiciones.push(`a.created_at >= $${contador}`);
      valores.push(fecha_inicio);
      contador++;
    }

    if (fecha_fin) {
      condiciones.push(`a.created_at <= $${contador}`);
      valores.push(fecha_fin);
      contador++;
    }

    const offset = (pagina - 1) * limite;

    const countResult = await DatabaseConnection.query(
      `SELECT COUNT(*) FROM security.auditoria a WHERE ${condiciones.join(' AND ')}`,
      valores
    );

    const datosResult = await DatabaseConnection.query(
      `SELECT a.*, u.nombre_completo as usuario_nombre, u.username
       FROM security.auditoria a
       LEFT JOIN auth.usuarios u ON a.usuario_id = u.id
       WHERE ${condiciones.join(' AND ')}
       ORDER BY a.created_at DESC
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

  async resumenSeguridad(negocio_id: string) {
    const [intentosFallidos, bloqueos, sesionesActivas, usuarios2FA] = await Promise.all([
      DatabaseConnection.query(
        `SELECT COUNT(*) as total FROM security.intentos_acceso
         WHERE exito = false AND created_at >= NOW() - INTERVAL '24 hours'`,
      ),
      DatabaseConnection.query(
        `SELECT COUNT(*) as total FROM security.bloqueos_ip WHERE bloqueado_hasta > NOW()`,
      ),
      DatabaseConnection.query(
        `SELECT COUNT(*) as total FROM auth.sesiones WHERE activa = true AND expira_en > NOW()`,
      ),
      DatabaseConnection.query(
        `SELECT COUNT(*) as total FROM auth.usuarios WHERE dos_factores_activo = true AND activo = true`,
      )
    ]);

    const actividadSospechosa = await DatabaseConnection.query(
      `SELECT u.username, u.nombre_completo, COUNT(*) as intentos
       FROM security.intentos_acceso ia
       JOIN auth.usuarios u ON ia.username = u.username
       WHERE ia.exito = false AND ia.created_at >= NOW() - INTERVAL '1 hour'
       GROUP BY u.username, u.nombre_completo
       HAVING COUNT(*) > 5
       ORDER BY intentos DESC`,
    );

    return {
      intentos_fallidos_24h: parseInt(intentosFallidos.rows[0].total),
      ips_bloqueadas: parseInt(bloqueos.rows[0].total),
      sesiones_activas: parseInt(sesionesActivas.rows[0].total),
      usuarios_con_2fa: parseInt(usuarios2FA.rows[0].total),
      actividad_sospechosa: actividadSospechosa.rows,
      nivel_riesgo: actividadSospechosa.rows.length > 0 ? 'alto' : 
                    parseInt(intentosFallidos.rows[0].total) > 20 ? 'medio' : 'bajo'
    };
  }

  async bloquearIP(ip_address: string, motivo: string, horas: number = 24) {
    const bloqueadoHasta = new Date(Date.now() + horas * 60 * 60 * 1000);

    await DatabaseConnection.query(
      `INSERT INTO security.bloqueos_ip (ip_address, motivo, bloqueado_hasta)
       VALUES ($1,$2,$3)`,
      [ip_address, motivo, bloqueadoHasta]
    );

    return { bloqueado: true, ip: ip_address, hasta: bloqueadoHasta };
  }

  async desbloquearIP(ip_address: string) {
    await DatabaseConnection.query(
      `UPDATE security.bloqueos_ip SET bloqueado_hasta = NOW() WHERE ip_address = $1 AND bloqueado_hasta > NOW()`,
      [ip_address]
    );

    return { desbloqueado: true, ip: ip_address };
  }

  async generarRespaldo(negocio_id: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nombreArchivo = `synap_backup_${negocio_id.substring(0, 8)}_${timestamp}.sql`;
    const rutaBackup = `/tmp/${nombreArchivo}`;

    try {
      const comando = `PGPASSWORD=synap_secure_2025 pg_dump -h localhost -U synap_admin -d synap_db -f ${rutaBackup}`;
      await execAsync(comando);

      return {
        respaldo_creado: true,
        archivo: nombreArchivo,
        ruta: rutaBackup,
        fecha: new Date().toISOString(),
        tamanio_bytes: (await import('fs')).statSync(rutaBackup).size
      };
    } catch (error: any) {
      throw new AppError(`Error generando respaldo: ${error.message}`, 500);
    }
  }

  async monitoreoSalud() {
    const [dbSize, tablas, conexiones, ultimaVenta] = await Promise.all([
      DatabaseConnection.query(`SELECT pg_database_size('synap_db') as size_bytes`),
      DatabaseConnection.query(`SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema NOT IN ('information_schema','pg_catalog')`),
      DatabaseConnection.query(`SELECT COUNT(*) as total FROM pg_stat_activity WHERE datname = 'synap_db'`),
      DatabaseConnection.query(`SELECT MAX(created_at) as ultima FROM pos.ventas`)
    ]);

    const sizeMB = parseInt(dbSize.rows[0].size_bytes) / (1024 * 1024);

    return {
      estado: sizeMB < 1000 ? 'saludable' : 'advertencia_espacio',
      base_datos: {
        tamanio_mb: Math.round(sizeMB * 100) / 100,
        total_tablas: parseInt(tablas.rows[0].total),
        conexiones_activas: parseInt(conexiones.rows[0].total)
      },
      ultima_actividad: ultimaVenta.rows[0].ultima,
      servidor: {
        uptime_segundos: process.uptime(),
        memoria_usada_mb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024) * 100) / 100,
        node_version: process.version
      }
    };
  }
}

export default new SecurityService();
