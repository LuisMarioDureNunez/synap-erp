// ============================================
// SYNAP - SERVICIO DE REPORTES PDF Y EXCEL
// AUTOR: LUIS MARIO TABOADA NUNEZ "LMTN"
// GENERACION DE REPORTES PROFESIONALES
// ============================================

import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import DatabaseConnection from '../../../config/database';

class ReportesService {

  async generarReporteVentasPDF(negocio_id: string, fecha_inicio: string, fecha_fin: string): Promise<Buffer> {
    const ventas = await DatabaseConnection.query(
      `SELECT v.*, u.nombre_completo as vendedor, c.nombre as cliente_nombre
       FROM pos.ventas v
       JOIN auth.usuarios u ON v.usuario_id = u.id
       LEFT JOIN pos.clientes c ON v.cliente_id = c.id
       WHERE v.negocio_id = $1 AND DATE(v.created_at) BETWEEN $2 AND $3
       ORDER BY v.created_at DESC`,
      [negocio_id, fecha_inicio, fecha_fin]
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('SYNAP - Reporte de Ventas', { align: 'center' });
      doc.fontSize(10).text(`Autor: Luis Mario Taboada Nunez LMTN`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Periodo: ${fecha_inicio} al ${fecha_fin}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(10);
      doc.text('FECHA          NUMERO         CLIENTE         VENDEDOR       METODO      TOTAL', {
        underline: true
      });
      doc.moveDown(0.5);

      let totalGeneral = 0;
      ventas.rows.forEach((venta: any) => {
        const total = parseFloat(venta.total);
        totalGeneral += total;
        doc.text(
          `${new Date(venta.created_at).toLocaleDateString('es-PY').padEnd(14)} ` +
          `${venta.numero_venta.padEnd(14)} ` +
          `${(venta.cliente_nombre || 'Consumidor Final').substring(0, 14).padEnd(14)} ` +
          `${venta.vendedor.substring(0, 14).padEnd(11)} ` +
          `${venta.metodo_pago.padEnd(10)} ` +
          `Gs. ${total.toLocaleString('es-PY')}`
        );
      });

      doc.moveDown();
      doc.fontSize(12).text(`Total General: Gs. ${totalGeneral.toLocaleString('es-PY')}`, { align: 'right' });
      doc.text(`Cantidad de Ventas: ${ventas.rows.length}`, { align: 'right' });
      doc.moveDown(2);
      doc.fontSize(8).text('SYNAP - Sistema de Negocios Autoadministrable del Paraguay - Todos los derechos reservados', { align: 'center' });

      doc.end();
    });
  }

  async generarReporteVentasExcel(negocio_id: string, fecha_inicio: string, fecha_fin: string): Promise<Buffer> {
    const ventas = await DatabaseConnection.query(
      `SELECT v.numero_venta, v.created_at, v.total, v.metodo_pago, v.estado,
              u.nombre_completo as vendedor, c.nombre as cliente_nombre,
              v.descuento, v.iva_total, v.subtotal
       FROM pos.ventas v
       JOIN auth.usuarios u ON v.usuario_id = u.id
       LEFT JOIN pos.clientes c ON v.cliente_id = c.id
       WHERE v.negocio_id = $1 AND DATE(v.created_at) BETWEEN $2 AND $3
       ORDER BY v.created_at DESC`,
      [negocio_id, fecha_inicio, fecha_fin]
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Luis Mario Taboada Nunez LMTN - SYNAP';
    const sheet = workbook.addWorksheet('Ventas');

    sheet.columns = [
      { header: 'Numero', key: 'numero_venta', width: 20 },
      { header: 'Fecha', key: 'created_at', width: 25 },
      { header: 'Cliente', key: 'cliente_nombre', width: 25 },
      { header: 'Vendedor', key: 'vendedor', width: 25 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Descuento', key: 'descuento', width: 15 },
      { header: 'IVA', key: 'iva_total', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Metodo Pago', key: 'metodo_pago', width: 15 },
      { header: 'Estado', key: 'estado', width: 12 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6366F1' } };
    sheet.getRow(1).alignment = { horizontal: 'center' };

    ventas.rows.forEach((venta: any) => {
      sheet.addRow({
        numero_venta: venta.numero_venta,
        created_at: new Date(venta.created_at).toLocaleString('es-PY'),
        cliente_nombre: venta.cliente_nombre || 'Consumidor Final',
        vendedor: venta.vendedor,
        subtotal: parseFloat(venta.subtotal),
        descuento: parseFloat(venta.descuento),
        iva_total: parseFloat(venta.iva_total),
        total: parseFloat(venta.total),
        metodo_pago: venta.metodo_pago,
        estado: venta.estado
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generarBalanceGeneralPDF(negocio_id: string): Promise<Buffer> {
    const [ventasHoy, gastosHoy, fiados, inventario, cajas] = await Promise.all([
      DatabaseConnection.query(
        `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad
         FROM pos.ventas WHERE negocio_id = $1 AND DATE(created_at) = CURRENT_DATE AND estado = 'completada'`,
        [negocio_id]
      ),
      DatabaseConnection.query(
        `SELECT COALESCE(SUM(monto), 0) as total, COUNT(*) as cantidad
         FROM finance.gastos WHERE negocio_id = $1 AND DATE(created_at) = CURRENT_DATE`,
        [negocio_id]
      ),
      DatabaseConnection.query(
        `SELECT COALESCE(SUM(saldo_pendiente), 0) as total, COUNT(*) as cantidad
         FROM crm.fiados WHERE negocio_id = $1 AND estado IN ('pendiente','pagado_parcial')`,
        [negocio_id]
      ),
      DatabaseConnection.query(
        `SELECT COALESCE(SUM(stock_actual * precio_costo), 0) as costo,
                COALESCE(SUM(stock_actual * precio_venta), 0) as valor_venta
         FROM pos.productos WHERE negocio_id = $1 AND activo = true`,
        [negocio_id]
      ),
      DatabaseConnection.query(
        `SELECT COUNT(*) as total FROM pos.cajas WHERE negocio_id = $1 AND abierta = true AND DATE(abierta_en) = CURRENT_DATE`,
        [negocio_id]
      )
    ]);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(22).text('SYNAP', { align: 'center' });
      doc.fontSize(12).text('Balance General', { align: 'center' });
      doc.fontSize(9).text(`Generado: ${new Date().toLocaleString('es-PY')}`, { align: 'center' });
      doc.fontSize(9).text('Autor: Luis Mario Taboada Nunez LMTN', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(14).text('Resumen del Dia', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Ventas Hoy: ${ventasHoy.rows[0].cantidad} operaciones - Gs. ${parseFloat(ventasHoy.rows[0].total).toLocaleString('es-PY')}`);
      doc.text(`Gastos Hoy: ${gastosHoy.rows[0].cantidad} registros - Gs. ${parseFloat(gastosHoy.rows[0].total).toLocaleString('es-PY')}`);
      doc.text(`Cajas Abiertas: ${cajas.rows[0].total}`);
      doc.moveDown();

      doc.fontSize(14).text('Estado Financiero', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Cuentas por Cobrar (Fiados): Gs. ${parseFloat(fiados.rows[0].total).toLocaleString('es-PY')} (${fiados.rows[0].cantidad} fiados)`);
      doc.text(`Valor Inventario (Costo): Gs. ${parseFloat(inventario.rows[0].costo).toLocaleString('es-PY')}`);
      doc.text(`Valor Inventario (Venta): Gs. ${parseFloat(inventario.rows[0].valor_venta).toLocaleString('es-PY')}`);

      const gananciaPotencial = parseFloat(inventario.rows[0].valor_venta) - parseFloat(inventario.rows[0].costo);
      doc.text(`Ganancia Potencial Inventario: Gs. ${gananciaPotencial.toLocaleString('es-PY')}`);
      doc.moveDown(3);
      doc.fontSize(8).text('SYNAP - Todos los derechos reservados - Paraguay', { align: 'center' });

      doc.end();
    });
  }
}

export default new ReportesService();
