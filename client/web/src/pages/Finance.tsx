// SYNAP - Pagina de Finanzas
// Autor: Luis Mario Taboada Nunez LMTN

import React, { useEffect, useState } from 'react';
import { Wallet, DollarSign, TrendingUp, TrendingDown, FileText, Download } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useFinance } from '../hooks/useFinance';

const Finance: React.FC = () => {
  const {
    cajaActual, gastos, resumen, flujoCaja,
    cargarCajaActual, listarGastos, cargarResumen, cargarFlujoCaja,
  } = useFinance();

  const [tab, setTab] = useState<'resumen' | 'caja' | 'gastos' | 'flujo'>('resumen');

  useEffect(() => {
    cargarCajaActual();
    listarGastos({ limite: 10 });
    cargarResumen('mes');
    cargarFlujoCaja(30);
  }, []);

  const descargarPDF = () => {
    const token = localStorage.getItem('synap_access_token');
    window.open(`http://localhost:4000/api/finance/reportes/ventas/pdf?fecha_inicio=2025-01-01&fecha_fin=2025-12-31&token=${token}`, '_blank');
  };

  const descargarExcel = () => {
    const token = localStorage.getItem('synap_access_token');
    window.open(`http://localhost:4000/api/finance/reportes/ventas/excel?fecha_inicio=2025-01-01&fecha_fin=2025-12-31&token=${token}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Finanzas</h1>
          <p className="text-dark-500 dark:text-dark-400">Gestion financiera y reportes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Download size={16} />} onClick={descargarPDF}>PDF</Button>
          <Button variant="secondary" icon={<Download size={16} />} onClick={descargarExcel}>Excel</Button>
        </div>
      </div>

      {resumen.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card hover>
            <p className="text-sm text-dark-500">Ingresos Ventas</p>
            <p className="text-2xl font-bold text-green-600">
              Gs. {Math.round(resumen.data.ingresos_ventas || 0).toLocaleString('es-PY')}
            </p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Total Gastos</p>
            <p className="text-2xl font-bold text-red-600">
              Gs. {Math.round(resumen.data.total_gastos || 0).toLocaleString('es-PY')}
            </p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Ganancia Neta</p>
            <p className="text-2xl font-bold text-synap-600 dark:text-synap-400">
              Gs. {Math.round(resumen.data.ganancia_neta || 0).toLocaleString('es-PY')}
            </p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Margen</p>
            <p className="text-2xl font-bold text-dark-900 dark:text-white">{resumen.data.margen || 0}%</p>
          </Card>
        </div>
      )}

      <div className="flex gap-2 border-b border-dark-200 dark:border-dark-700 pb-2">
        {[
          { id: 'resumen', label: 'Resumen', icon: TrendingUp },
          { id: 'caja', label: 'Caja', icon: Wallet },
          { id: 'gastos', label: 'Gastos', icon: TrendingDown },
          { id: 'flujo', label: 'Flujo de Caja', icon: DollarSign },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id ? 'bg-synap-100 text-synap-700 dark:bg-synap-950 dark:text-synap-300' : 'text-dark-500 hover:text-dark-700'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'caja' && (
        <Card>
          {cajaActual.data?.abierta ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="success">Caja Abierta</Badge>
                <span className="text-sm text-dark-500">Monto inicial: Gs. {Math.round(cajaActual.data.monto_inicial).toLocaleString('es-PY')}</span>
              </div>
              <p className="text-xl font-bold text-dark-900 dark:text-white">
                Ventas acumuladas: Gs. {Math.round(cajaActual.data.ventas_acumuladas || 0).toLocaleString('es-PY')}
              </p>
              <p className="text-sm text-dark-400">{cajaActual.data.cantidad_ventas || 0} operaciones</p>
            </div>
          ) : (
            <p className="text-dark-500">No tiene caja abierta hoy</p>
          )}
        </Card>
      )}

      {tab === 'gastos' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700">
                  <th className="text-left p-3 text-sm font-medium text-dark-500">Fecha</th>
                  <th className="text-left p-3 text-sm font-medium text-dark-500">Categoria</th>
                  <th className="text-left p-3 text-sm font-medium text-dark-500">Descripcion</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Monto</th>
                </tr>
              </thead>
              <tbody>
                {gastos.data?.datos?.map((gasto: any) => (
                  <tr key={gasto.id} className="border-b border-dark-100 dark:border-dark-800">
                    <td className="p-3 text-sm text-dark-600 dark:text-dark-400">
                      {new Date(gasto.created_at).toLocaleDateString('es-PY')}
                    </td>
                    <td className="p-3"><Badge variant="neutral">{gasto.categoria}</Badge></td>
                    <td className="p-3 text-sm text-dark-900 dark:text-white">{gasto.descripcion || '-'}</td>
                    <td className="p-3 text-right font-semibold text-red-600">
                      Gs. {Math.round(gasto.monto).toLocaleString('es-PY')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'flujo' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700">
                  <th className="text-left p-3 text-sm font-medium text-dark-500">Fecha</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Ventas</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Gastos</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Neto</th>
                </tr>
              </thead>
              <tbody>
                {flujoCaja.data?.map((dia: any, index: number) => (
                  <tr key={index} className="border-b border-dark-100 dark:border-dark-800">
                    <td className="p-3 text-sm text-dark-600 dark:text-dark-400">
                      {new Date(dia.fecha).toLocaleDateString('es-PY')}
                    </td>
                    <td className="p-3 text-right text-green-600">
                      Gs. {Math.round(dia.total_ventas || 0).toLocaleString('es-PY')}
                    </td>
                    <td className="p-3 text-right text-red-600">
                      Gs. {Math.round(dia.gastos || 0).toLocaleString('es-PY')}
                    </td>
                    <td className="p-3 text-right font-bold">
                      <span className={dia.neto >= 0 ? 'text-green-600' : 'text-red-600'}>
                        Gs. {Math.round(dia.neto || 0).toLocaleString('es-PY')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Finance;
