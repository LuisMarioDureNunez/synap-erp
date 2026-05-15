// SYNAP - Dashboard Principal
// Autor: Luis Mario Taboada Nunez LMTN

import React, { useEffect, useState } from 'react';
import { ShoppingCart, DollarSign, Package, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import api from '../services/api';

const Dashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [alertas, setAlertas] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [dashRes, alertRes] = await Promise.all([
        api.get('/bi/dashboard'),
        api.get('/inventory/alertas'),
      ]);
      setDashboard(dashRes.data.data);
      setAlertas(alertRes.data.data);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    }
  };

  const statsCards = [
    { label: 'Ventas Hoy', value: `Gs. ${(dashboard?.ventas_hoy?.total || 0).toLocaleString('es-PY')}`, sub: `${dashboard?.ventas_hoy?.cantidad || 0} operaciones`, icon: ShoppingCart, color: 'from-blue-500 to-blue-600' },
    { label: 'Ventas del Mes', value: `Gs. ${(dashboard?.ventas_mes?.total || 0).toLocaleString('es-PY')}`, sub: `Ticket promedio: Gs. ${Math.round(dashboard?.ventas_mes?.ticket_promedio || 0).toLocaleString('es-PY')}`, icon: DollarSign, color: 'from-green-500 to-green-600' },
    { label: 'Inventario', value: `${dashboard?.inventario?.total_productos || 0} productos`, sub: `Valor: Gs. ${Math.round(dashboard?.inventario?.valor_venta || 0).toLocaleString('es-PY')}`, icon: Package, color: 'from-purple-500 to-purple-600' },
    { label: 'Clientes', value: dashboard?.clientes || 0, sub: 'Clientes registrados', icon: Users, color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Dashboard</h1>
        <p className="text-dark-500 dark:text-dark-400 mt-1">Resumen general de su negocio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index} hover className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-dark-500 dark:text-dark-400">{stat.label}</p>
                <p className="text-xl font-bold text-dark-900 dark:text-white mt-1">{stat.value}</p>
                <p className="text-xs text-dark-400 dark:text-dark-500 mt-1">{stat.sub}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                <stat.icon size={22} className="text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-synap-500" />
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Resumen Financiero</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-dark-100 dark:border-dark-700">
              <span className="text-dark-500">Fiados pendientes</span>
              <span className="font-semibold text-dark-900 dark:text-white">
                Gs. {Math.round(dashboard?.fiados?.total_pendiente || 0).toLocaleString('es-PY')}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-dark-100 dark:border-dark-700">
              <span className="text-dark-500">Ganancia potencial inventario</span>
              <span className="font-semibold text-green-600">
                Gs. {Math.round(dashboard?.inventario?.ganancia_potencial || 0).toLocaleString('es-PY')}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-dark-500">Empleados activos</span>
              <span className="font-semibold text-dark-900 dark:text-white">{dashboard?.empleados || 0}</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-yellow-500" />
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">Alertas del Sistema</h3>
          </div>
          {alertas?.alertas?.length > 0 ? (
            <div className="space-y-2">
              {alertas.alertas.map((alerta: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-dark-50 dark:bg-dark-900">
                  <Badge variant={alerta.nivel === 'critico' ? 'danger' : alerta.nivel === 'advertencia' ? 'warning' : 'info'}>
                    {alerta.tipo}
                  </Badge>
                  <p className="text-sm text-dark-700 dark:text-dark-300">{alerta.mensaje}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-400 dark:text-dark-500 text-sm">No hay alertas pendientes</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
