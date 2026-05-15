// SYNAP - Sidebar de Navegacion
// Autor: Luis Mario Taboada Nunez LMTN

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Wallet,
  UserCheck, Calendar, Truck, Globe, BarChart3, Shield, LogOut, Store
} from 'lucide-react';
import { clsx } from 'clsx';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/pos', icon: ShoppingCart, label: 'Punto de Venta' },
  { path: '/inventory', icon: Package, label: 'Inventario' },
  { path: '/crm', icon: Users, label: 'Clientes CRM' },
  { path: '/finance', icon: Wallet, label: 'Finanzas' },
  { path: '/hr', icon: UserCheck, label: 'RRHH' },
  { path: '/scheduling', icon: Calendar, label: 'Agenda' },
  { path: '/delivery', icon: Truck, label: 'Delivery' },
  { path: '/ecommerce', icon: Globe, label: 'E-Commerce' },
  { path: '/bi', icon: BarChart3, label: 'BI & IA' },
  { path: '/security', icon: Shield, label: 'Seguridad' },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-dark-900 border-r border-dark-100 dark:border-dark-800 z-40 flex flex-col">
      <div className="p-5 border-b border-dark-100 dark:border-dark-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-synap-500 to-synap-700 rounded-xl flex items-center justify-center shadow-lg shadow-synap-500/30">
            <Store size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-900 dark:text-white tracking-tight">SYNAP</h1>
            <p className="text-xs text-dark-400 dark:text-dark-500">by LMTN</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-synap-50 text-synap-700 dark:bg-synap-950 dark:text-synap-300 shadow-sm'
                  : 'text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-800 hover:text-dark-900 dark:hover:text-dark-200'
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-dark-100 dark:border-dark-800">
        <div className="text-xs text-dark-400 dark:text-dark-600 text-center pb-2">
          v2.0 - Luis Mario Taboada Nunez
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
