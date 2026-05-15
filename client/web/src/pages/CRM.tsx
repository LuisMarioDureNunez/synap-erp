// SYNAP - Pagina de Clientes CRM
// Autor: Luis Mario Taboada Nunez LMTN

import React, { useEffect, useState } from 'react';
import { Users, Search, Plus, DollarSign, Star, Cake } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useCRM } from '../hooks/useCRM';

const CRM: React.FC = () => {
  const {
    clientes, clienteActual, fiados, resumenFiados, rankingPuntos,
    listarClientes, crearCliente, listarFiados, cargarResumenFiados, cargarRankingPuntos,
  } = useCRM();

  const [busqueda, setBusqueda] = useState('');
  const [showCrear, setShowCrear] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', apellido: '', telefono: '', documento: '' });
  const [tab, setTab] = useState<'clientes' | 'fiados' | 'ranking'>('clientes');

  useEffect(() => {
    listarClientes({ limite: 20 });
    cargarResumenFiados();
    cargarRankingPuntos(10);
  }, []);

  const handleCrearCliente = async () => {
    const result = await crearCliente(nuevoCliente);
    if (result) {
      setShowCrear(false);
      setNuevoCliente({ nombre: '', apellido: '', telefono: '', documento: '' });
      listarClientes({ limite: 20 });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Clientes CRM</h1>
          <p className="text-dark-500 dark:text-dark-400">Gestion de clientes, fiados y fidelizacion</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowCrear(true)}>Nuevo Cliente</Button>
      </div>

      {resumenFiados.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card hover>
            <p className="text-sm text-dark-500">Fiados Activos</p>
            <p className="text-2xl font-bold text-dark-900 dark:text-white">{resumenFiados.data.total_fiados_activos || 0}</p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Pendiente Cobro</p>
            <p className="text-2xl font-bold text-yellow-600">
              Gs. {Math.round(resumenFiados.data.total_pendiente_cobro || 0).toLocaleString('es-PY')}
            </p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Vencidos</p>
            <p className="text-2xl font-bold text-red-600">{resumenFiados.data.cantidad_vencidos || 0}</p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Clientes con Fiado</p>
            <p className="text-2xl font-bold text-dark-900 dark:text-white">{resumenFiados.data.clientes_con_fiado || 0}</p>
          </Card>
        </div>
      )}

      <div className="flex gap-2 border-b border-dark-200 dark:border-dark-700 pb-2">
        {[
          { id: 'clientes', label: 'Clientes', icon: Users },
          { id: 'fiados', label: 'Fiados', icon: DollarSign },
          { id: 'ranking', label: 'Ranking', icon: Star },
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

      {tab === 'clientes' && (
        <Card>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <Input placeholder="Buscar cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} icon={<Search size={18} />} />
            </div>
            <Button onClick={() => listarClientes({ busqueda })}>Buscar</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700">
                  <th className="text-left p-3 text-sm font-medium text-dark-500">Cliente</th>
                  <th className="text-left p-3 text-sm font-medium text-dark-500">Telefono</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Compras</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Total Gastado</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {clientes.data?.datos?.map((cliente: any) => (
                  <tr key={cliente.id} className="border-b border-dark-100 dark:border-dark-800 hover:bg-dark-50 dark:hover:bg-dark-900">
                    <td className="p-3">
                      <p className="font-medium text-dark-900 dark:text-white">{cliente.nombre} {cliente.apellido || ''}</p>
                      <p className="text-xs text-dark-400">{cliente.documento || 'Sin documento'}</p>
                    </td>
                    <td className="p-3 text-sm text-dark-600 dark:text-dark-400">{cliente.telefono || '-'}</td>
                    <td className="p-3 text-right text-dark-900 dark:text-white">{cliente.total_compras || 0}</td>
                    <td className="p-3 text-right font-semibold text-dark-900 dark:text-white">
                      Gs. {Math.round(cliente.total_gastado || 0).toLocaleString('es-PY')}
                    </td>
                    <td className="p-3 text-right">
                      <Badge variant="info">{cliente.puntos_acumulados || 0} pts</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'fiados' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700">
                  <th className="text-left p-3 text-sm font-medium text-dark-500">Cliente</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Monto</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Saldo Pendiente</th>
                  <th className="text-left p-3 text-sm font-medium text-dark-500">Vencimiento</th>
                  <th className="text-center p-3 text-sm font-medium text-dark-500">Estado</th>
                </tr>
              </thead>
              <tbody>
                {fiados.data?.datos?.map((fiado: any) => (
                  <tr key={fiado.id} className="border-b border-dark-100 dark:border-dark-800">
                    <td className="p-3">
                      <p className="font-medium text-dark-900 dark:text-white">{fiado.cliente_nombre}</p>
                      <p className="text-xs text-dark-400">{fiado.cliente_telefono}</p>
                    </td>
                    <td className="p-3 text-right text-dark-900 dark:text-white">Gs. {Math.round(fiado.monto_total).toLocaleString('es-PY')}</td>
                    <td className="p-3 text-right font-bold text-dark-900 dark:text-white">Gs. {Math.round(fiado.saldo_pendiente).toLocaleString('es-PY')}</td>
                    <td className="p-3 text-sm text-dark-600 dark:text-dark-400">
                      {new Date(fiado.fecha_vencimiento).toLocaleDateString('es-PY')}
                      {fiado.dias_restantes < 0 && <span className="text-red-500 ml-1">(Vencido)</span>}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={fiado.estado_vencimiento === 'al_dia' ? 'success' : fiado.estado_vencimiento === 'por_vencer' ? 'warning' : 'danger'}>
                        {fiado.estado_vencimiento}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'ranking' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700">
                  <th className="text-left p-3 text-sm font-medium text-dark-500">#</th>
                  <th className="text-left p-3 text-sm font-medium text-dark-500">Cliente</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Puntos</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Total Gastado</th>
                  <th className="text-right p-3 text-sm font-medium text-dark-500">Compras</th>
                </tr>
              </thead>
              <tbody>
                {rankingPuntos.data?.map((cliente: any, index: number) => (
                  <tr key={cliente.id} className="border-b border-dark-100 dark:border-dark-800">
                    <td className="p-3">
                      <Badge variant={index < 3 ? 'success' : 'neutral'}>{index + 1}</Badge>
                    </td>
                    <td className="p-3 font-medium text-dark-900 dark:text-white">{cliente.nombre} {cliente.apellido || ''}</td>
                    <td className="p-3 text-right font-bold text-synap-600 dark:text-synap-400">{cliente.puntos_acumulados} pts</td>
                    <td className="p-3 text-right text-dark-900 dark:text-white">Gs. {Math.round(cliente.total_gastado || 0).toLocaleString('es-PY')}</td>
                    <td className="p-3 text-right text-dark-600 dark:text-dark-400">{cliente.total_compras}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showCrear} onClose={() => setShowCrear(false)} title="Nuevo Cliente" size="md">
        <div className="space-y-4">
          <Input label="Nombre" value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} />
          <Input label="Apellido" value={nuevoCliente.apellido} onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellido: e.target.value })} />
          <Input label="Telefono" value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} />
          <Input label="Documento" value={nuevoCliente.documento} onChange={(e) => setNuevoCliente({ ...nuevoCliente, documento: e.target.value })} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowCrear(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCrearCliente} className="flex-1" disabled={!nuevoCliente.nombre}>Crear Cliente</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CRM;
