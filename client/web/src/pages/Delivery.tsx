// SYNAP - Pagina de Delivery
// Autor: Luis Mario Taboada Nunez LMTN

import React, { useEffect, useState } from 'react';
import { Truck, MapPin, User, Package, Clock, CheckCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAPI } from '../hooks/useAPI';

const Delivery: React.FC = () => {
  const pedidos = useAPI<any>();
  const resumen = useAPI<any>();
  const repartidores = useAPI<any[]>();
  const [tab, setTab] = useState<'activos' | 'todos'>('activos');

  useEffect(() => {
    pedidos.ejecutar('get', '/delivery/pedidos', undefined, { limite: 50 });
    resumen.ejecutar('get', '/delivery/resumen');
    repartidores.ejecutar('get', '/delivery/repartidores');
  }, []);

  const cambiarEstado = async (pedidoId: string, estado: string) => {
    await pedidos.ejecutar('put', `/delivery/pedidos/${pedidoId}/estado`, { estado });
    pedidos.ejecutar('get', '/delivery/pedidos', undefined, { limite: 50 });
    resumen.ejecutar('get', '/delivery/resumen');
  };

  const asignarRepartidor = async (pedidoId: string, repartidorId: string) => {
    await pedidos.ejecutar('put', '/delivery/pedidos/asignar', { pedido_id: pedidoId, repartidor_id: repartidorId });
    pedidos.ejecutar('get', '/delivery/pedidos', undefined, { limite: 50 });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Delivery</h1>
          <p className="text-dark-500 dark:text-dark-400">Gestion de pedidos y repartidores</p>
        </div>
      </div>

      {resumen.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card hover>
            <p className="text-sm text-dark-500">Pedidos Activos</p>
            <p className="text-2xl font-bold text-synap-600 dark:text-synap-400">{resumen.data.pedidos_activos || 0}</p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Entregas Hoy</p>
            <p className="text-2xl font-bold text-green-600">{resumen.data.entregas_hoy || 0}</p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Total Cobrado Envios</p>
            <p className="text-2xl font-bold text-dark-900 dark:text-white">
              Gs. {Math.round(resumen.data.total_cobrado_envios || 0).toLocaleString('es-PY')}
            </p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Tiempo Promedio</p>
            <p className="text-2xl font-bold text-dark-900 dark:text-white">
              {Math.round(resumen.data.tiempo_promedio_entrega || 0)} min
            </p>
          </Card>
        </div>
      )}

      <div className="flex gap-2 border-b border-dark-200 dark:border-dark-700 pb-2">
        <button
          onClick={() => setTab('activos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === 'activos' ? 'bg-synap-100 text-synap-700 dark:bg-synap-950 dark:text-synap-300' : 'text-dark-500'
          }`}
        >
          <Truck size={16} /> Activos
        </button>
        <button
          onClick={() => setTab('todos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === 'todos' ? 'bg-synap-100 text-synap-700 dark:bg-synap-950 dark:text-synap-300' : 'text-dark-500'
          }`}
        >
          <Package size={16} /> Todos
        </button>
      </div>

      <Card>
        <div className="space-y-3">
          {pedidos.data?.datos?.filter((p: any) => tab === 'todos' || !['entregado', 'cancelado'].includes(p.estado))
            .map((pedido: any) => (
            <div key={pedido.id} className="flex items-center justify-between p-4 bg-dark-50 dark:bg-dark-900 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-synap-100 dark:bg-synap-950 rounded-full flex items-center justify-center">
                  <Package size={22} className="text-synap-600 dark:text-synap-400" />
                </div>
                <div>
                  <p className="font-medium text-dark-900 dark:text-white">
                    {pedido.cliente_nombre}
                  </p>
                  <p className="text-xs text-dark-400">{pedido.direccion_entrega}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-dark-500">Venta: {pedido.numero_venta}</span>
                    <span className="text-xs text-dark-500">Zona: {pedido.zona_nombre || 'N/A'}</span>
                    {pedido.repartidor_nombre && (
                      <span className="text-xs text-synap-500">Repartidor: {pedido.repartidor_nombre}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold text-dark-900 dark:text-white">
                    Gs. {Math.round(pedido.venta_total + pedido.costo_envio).toLocaleString('es-PY')}
                  </p>
                  <Badge variant={
                    pedido.estado === 'entregado' ? 'success' :
                    pedido.estado === 'en_camino' ? 'info' :
                    pedido.estado === 'cancelado' ? 'danger' : 'warning'
                  }>
                    {pedido.estado}
                  </Badge>
                  {pedido.tiempo_entrega_minutos && (
                    <p className="text-xs text-dark-400 mt-1">{Math.round(pedido.tiempo_entrega_minutos)} min</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  {pedido.estado === 'pendiente' && (
                    <>
                      <button onClick={() => cambiarEstado(pedido.id, 'confirmado')}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                        Confirmar
                      </button>
                      {repartidores.data && (
                        <select
                          className="text-xs rounded-lg border border-dark-200 px-2 py-1"
                          onChange={(e) => e.target.value && asignarRepartidor(pedido.id, e.target.value)}
                          defaultValue=""
                        >
                          <option value="">Asignar</option>
                          {repartidores.data.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.nombre}</option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                  {pedido.estado === 'confirmado' && (
                    <button onClick={() => cambiarEstado(pedido.id, 'preparando')}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                      Preparar
                    </button>
                  )}
                  {pedido.estado === 'preparando' && (
                    <button onClick={() => cambiarEstado(pedido.id, 'en_camino')}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
                      En Camino
                    </button>
                  )}
                  {pedido.estado === 'en_camino' && (
                    <button onClick={() => cambiarEstado(pedido.id, 'entregado')}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                      Entregado
                    </button>
                  )}
                  {pedido.estado !== 'entregado' && pedido.estado !== 'cancelado' && (
                    <button onClick={() => cambiarEstado(pedido.id, 'cancelado')}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {pedidos.data?.datos?.length === 0 && (
            <p className="text-dark-400 text-center py-8">No hay pedidos registrados</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Delivery;
