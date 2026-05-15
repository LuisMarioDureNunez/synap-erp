// SYNAP - Pagina de Recursos Humanos
// Autor: Luis Mario Taboada Nunez LMTN

import React, { useEffect, useState } from 'react';
import { UserCheck, Clock, DollarSign, QrCode, Plus, Search, UserX } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAPI } from '../hooks/useAPI';

const HR: React.FC = () => {
  const empleados = useAPI<any[]>();
  const asistenciasResumen = useAPI<any>();
  const comisiones = useAPI<any>();
  const [showCrear, setShowCrear] = useState(false);
  const [showAsistencia, setShowAsistencia] = useState(false);
  const [tab, setTab] = useState<'empleados' | 'asistencias' | 'comisiones'>('empleados');
  const [nuevoEmpleado, setNuevoEmpleado] = useState({ nombre: '', documento: '', cargo: '', salario_base: '' });
  const [asistenciaForm, setAsistenciaForm] = useState({ empleado_id: '', tipo: 'entrada' });

  useEffect(() => {
    empleados.ejecutar('get', '/hr/empleados');
    asistenciasResumen.ejecutar('get', '/hr/asistencias-resumen');
  }, []);

  const handleCrearEmpleado = async () => {
    const result = await empleados.ejecutar('post', '/hr/empleados', {
      ...nuevoEmpleado,
      salario_base: parseFloat(nuevoEmpleado.salario_base),
    });
    if (result) {
      setShowCrear(false);
      setNuevoEmpleado({ nombre: '', documento: '', cargo: '', salario_base: '' });
      empleados.ejecutar('get', '/hr/empleados');
    }
  };

  const handleRegistrarAsistencia = async () => {
    await empleados.ejecutar('post', '/hr/asistencias', asistenciaForm);
    setShowAsistencia(false);
    asistenciasResumen.ejecutar('get', '/hr/asistencias-resumen');
  };

  const handleCalcularComisiones = async () => {
    const hoy = new Date().toISOString().split('T')[0];
    comisiones.ejecutar('get', '/hr/comisiones/calcular', undefined, { fecha_inicio: hoy, fecha_fin: hoy });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Recursos Humanos</h1>
          <p className="text-dark-500 dark:text-dark-400">Gestion de empleados, asistencias y comisiones</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<QrCode size={16} />} onClick={() => setShowAsistencia(true)}>
            Registrar Asistencia
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setShowCrear(true)}>
            Nuevo Empleado
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-dark-200 dark:border-dark-700 pb-2">
        {[
          { id: 'empleados', label: 'Empleados', icon: UserCheck },
          { id: 'asistencias', label: 'Asistencias', icon: Clock },
          { id: 'comisiones', label: 'Comisiones', icon: DollarSign },
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

      {tab === 'empleados' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700">
                  <th className="text-left p-3 text-sm font-medium text-dark-500">Empleado</th>
                  <th className="text-left p-3 text-sm font-medium text-dark-500">Cargo</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Salario Base</th>
                  <th className="text-center p-3 text-sm font-medium text-dark-500">Estado Hoy</th>
                  <th className="text-center p-3 text-sm font-medium text-dark-500">Tardanzas Mes</th>
                  <th className="text-center p-3 text-sm font-medium text-dark-500">Faltas Mes</th>
                </tr>
              </thead>
              <tbody>
                {empleados.data?.map((emp: any) => (
                  <tr key={emp.id} className="border-b border-dark-100 dark:border-dark-800 hover:bg-dark-50 dark:hover:bg-dark-900">
                    <td className="p-3">
                      <p className="font-medium text-dark-900 dark:text-white">{emp.nombre}</p>
                      <p className="text-xs text-dark-400">{emp.documento || 'Sin documento'}</p>
                    </td>
                    <td className="p-3 text-sm text-dark-600 dark:text-dark-400">{emp.cargo}</td>
                    <td className="p-3 text-right font-semibold text-dark-900 dark:text-white">
                      Gs. {Math.round(emp.salario_base || 0).toLocaleString('es-PY')}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={emp.estado_hoy === 'entrada' ? 'success' : emp.estado_hoy === 'tardanza' ? 'warning' : 'neutral'}>
                        {emp.estado_hoy || 'Sin registro'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <span className={emp.tardanzas_mes > 0 ? 'text-yellow-600 font-medium' : 'text-dark-400'}>
                        {emp.tardanzas_mes || 0}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={emp.faltas_mes > 0 ? 'text-red-600 font-medium' : 'text-dark-400'}>
                        {emp.faltas_mes || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'asistencias' && (
        <Card>
          {asistenciasResumen.data && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="success">Presentes: {asistenciasResumen.data.presentes}</Badge>
                <Badge variant="danger">Ausentes: {asistenciasResumen.data.ausentes}</Badge>
                <span className="text-sm text-dark-500">Total: {asistenciasResumen.data.total_empleados} empleados</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-200 dark:border-dark-700">
                      <th className="text-left p-3 text-sm font-medium text-dark-500">Empleado</th>
                      <th className="text-center p-3 text-sm font-medium text-dark-500">Entradas</th>
                      <th className="text-center p-3 text-sm font-medium text-dark-500">Salidas</th>
                      <th className="text-center p-3 text-sm font-medium text-dark-500">Tardanzas</th>
                      <th className="text-left p-3 text-sm font-medium text-dark-500">Primera Entrada</th>
                      <th className="text-left p-3 text-sm font-medium text-dark-500">Ultima Salida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistenciasResumen.data.detalle?.map((detalle: any) => (
                      <tr key={detalle.id} className="border-b border-dark-100 dark:border-dark-800">
                        <td className="p-3 font-medium text-dark-900 dark:text-white">{detalle.nombre}</td>
                        <td className="p-3 text-center text-green-600">{detalle.entradas || 0}</td>
                        <td className="p-3 text-center text-blue-600">{detalle.salidas || 0}</td>
                        <td className="p-3 text-center text-yellow-600">{detalle.tardanzas || 0}</td>
                        <td className="p-3 text-sm text-dark-600 dark:text-dark-400">
                          {detalle.primera_entrada ? new Date(detalle.primera_entrada).toLocaleTimeString('es-PY') : '-'}
                        </td>
                        <td className="p-3 text-sm text-dark-600 dark:text-dark-400">
                          {detalle.ultima_salida ? new Date(detalle.ultima_salida).toLocaleTimeString('es-PY') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === 'comisiones' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark-900 dark:text-white">Comisiones por Ventas</h3>
            <Button onClick={handleCalcularComisiones} loading={comisiones.loading}>
              Calcular Comisiones Hoy
            </Button>
          </div>
          {comisiones.data && (
            <div className="space-y-3">
              <p className="text-sm text-dark-500">
                Total comisiones: <strong className="text-synap-600 dark:text-synap-400">
                  Gs. {Math.round(comisiones.data.total_comisiones || 0).toLocaleString('es-PY')}
                </strong>
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-200 dark:border-dark-700">
                      <th className="text-left p-3 text-sm font-medium text-dark-500">Empleado</th>
                      <th className="text-right p-3 text-sm font-medium text-dark-500">Total Ventas</th>
                      <th className="text-right p-3 text-sm font-medium text-dark-500">% Comision</th>
                      <th className="text-right p-3 text-sm font-medium text-dark-500">Monto Comision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comisiones.data.empleados?.map((emp: any) => (
                      <tr key={emp.empleado_id} className="border-b border-dark-100 dark:border-dark-800">
                        <td className="p-3 font-medium text-dark-900 dark:text-white">{emp.empleado_nombre}</td>
                        <td className="p-3 text-right text-dark-900 dark:text-white">
                          Gs. {Math.round(emp.monto_total).toLocaleString('es-PY')}
                        </td>
                        <td className="p-3 text-right">
                          <Badge variant="info">{emp.porcentaje_comision}%</Badge>
                        </td>
                        <td className="p-3 text-right font-bold text-green-600">
                          Gs. {Math.round(emp.monto_comision).toLocaleString('es-PY')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      <Modal isOpen={showCrear} onClose={() => setShowCrear(false)} title="Nuevo Empleado" size="md">
        <div className="space-y-4">
          <Input label="Nombre Completo" value={nuevoEmpleado.nombre} onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, nombre: e.target.value })} />
          <Input label="Documento" value={nuevoEmpleado.documento} onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, documento: e.target.value })} />
          <Input label="Cargo" value={nuevoEmpleado.cargo} onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, cargo: e.target.value })} />
          <Input label="Salario Base (Gs.)" type="number" value={nuevoEmpleado.salario_base} onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, salario_base: e.target.value })} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowCrear(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCrearEmpleado} className="flex-1" loading={empleados.loading}>Crear Empleado</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAsistencia} onClose={() => setShowAsistencia(false)} title="Registrar Asistencia" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Empleado</label>
            <select
              className="w-full rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 px-4 py-2.5 text-sm"
              value={asistenciaForm.empleado_id}
              onChange={(e) => setAsistenciaForm({ ...asistenciaForm, empleado_id: e.target.value })}
            >
              <option value="">Seleccione empleado</option>
              {empleados.data?.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.nombre} - {emp.cargo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-1">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {['entrada', 'salida'].map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setAsistenciaForm({ ...asistenciaForm, tipo })}
                  className={`p-3 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                    asistenciaForm.tipo === tipo
                      ? 'border-synap-500 bg-synap-50 dark:bg-synap-950 text-synap-700'
                      : 'border-dark-200 dark:border-dark-700 text-dark-500'
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleRegistrarAsistencia} className="w-full" disabled={!asistenciaForm.empleado_id}>
            Registrar
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default HR;
