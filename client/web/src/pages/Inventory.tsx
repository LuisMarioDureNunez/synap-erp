// SYNAP - Pagina de Inventario
// Autor: Luis Mario Taboada Nunez LMTN

import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, TrendingUp, Search, Plus, Truck } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useInventory } from '../hooks/useInventory';

const Inventory: React.FC = () => {
  const { stock, alertas, valoracion, cargarStock, cargarAlertas, cargarValoracion } = useInventory();
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarStock();
    cargarAlertas();
    cargarValoracion();
  }, []);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarStock({ busqueda });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Inventario</h1>
        <p className="text-dark-500 dark:text-dark-400">Gestion de stock, compras y proveedores</p>
      </div>

      {valoracion.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card hover>
            <p className="text-sm text-dark-500">Total Productos</p>
            <p className="text-2xl font-bold text-dark-900 dark:text-white">{valoracion.data.resumen?.total_productos || 0}</p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Costo Total</p>
            <p className="text-2xl font-bold text-dark-900 dark:text-white">
              Gs. {Math.round(valoracion.data.resumen?.costo_total || 0).toLocaleString('es-PY')}
            </p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Valor Venta</p>
            <p className="text-2xl font-bold text-green-600">
              Gs. {Math.round(valoracion.data.resumen?.precio_venta_total || 0).toLocaleString('es-PY')}
            </p>
          </Card>
          <Card hover>
            <p className="text-sm text-dark-500">Ganancia Potencial</p>
            <p className="text-2xl font-bold text-synap-600 dark:text-synap-400">
              Gs. {Math.round(valoracion.data.resumen?.ganancia_potencial || 0).toLocaleString('es-PY')}
            </p>
          </Card>
        </div>
      )}

      {alertas.data?.alertas?.length > 0 && (
        <Card className="border-l-4 border-l-yellow-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={20} className="text-yellow-500" />
            <h3 className="font-semibold text-dark-900 dark:text-white">Alertas de Inventario</h3>
          </div>
          <div className="space-y-2">
            {alertas.data.alertas.map((alerta: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <Badge variant={alerta.nivel === 'critico' ? 'danger' : 'warning'}>{alerta.tipo}</Badge>
                <span className="text-sm text-dark-700 dark:text-dark-300">{alerta.mensaje}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <form onSubmit={handleBuscar} className="flex gap-2">
              <Input
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                icon={<Search size={18} />}
              />
              <Button type="submit">Buscar</Button>
            </form>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Truck size={16} />}>Proveedores</Button>
            <Button variant="secondary" icon={<Plus size={16} />}>Nueva Compra</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-200 dark:border-dark-700">
                <th className="text-left p-3 text-sm font-medium text-dark-500">Producto</th>
                <th className="text-left p-3 text-sm font-medium text-dark-500">Codigo</th>
                <th className="text-right p-3 text-sm font-medium text-dark-500">Stock</th>
                <th className="text-right p-3 text-sm font-medium text-dark-500">P. Costo</th>
                <th className="text-right p-3 text-sm font-medium text-dark-500">P. Venta</th>
                <th className="text-center p-3 text-sm font-medium text-dark-500">Estado</th>
              </tr>
            </thead>
            <tbody>
              {stock.data?.map((producto: any) => (
                <tr key={producto.id} className="border-b border-dark-100 dark:border-dark-800 hover:bg-dark-50 dark:hover:bg-dark-900">
                  <td className="p-3">
                    <p className="font-medium text-dark-900 dark:text-white">{producto.nombre}</p>
                    <p className="text-xs text-dark-400">{producto.categoria_nombre}</p>
                  </td>
                  <td className="p-3 text-sm text-dark-600 dark:text-dark-400">{producto.codigo_interno || '-'}</td>
                  <td className="p-3 text-right font-medium text-dark-900 dark:text-white">{producto.stock_actual}</td>
                  <td className="p-3 text-right text-dark-600 dark:text-dark-400">Gs. {parseFloat(producto.precio_costo).toLocaleString('es-PY')}</td>
                  <td className="p-3 text-right font-semibold text-dark-900 dark:text-white">Gs. {parseFloat(producto.precio_venta).toLocaleString('es-PY')}</td>
                  <td className="p-3 text-center">
                    <Badge variant={producto.estado_stock === 'normal' ? 'success' : producto.estado_stock === 'bajo' ? 'warning' : 'danger'}>
                      {producto.estado_stock}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stock.data?.length === 0 && (
            <p className="text-center text-dark-400 py-8">No se encontraron productos</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Inventory;
