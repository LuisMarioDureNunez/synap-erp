// SYNAP - Aplicacion Principal - Todos los modulos
// Autor: Luis Mario Taboada Nunez LMTN

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import CRM from './pages/CRM';
import Finance from './pages/Finance';
import HR from './pages/HR';
import Scheduling from './pages/Scheduling';
import Delivery from './pages/Delivery';
import BI from './pages/BI';
import Security from './pages/Security';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="crm" element={<CRM />} />
          <Route path="finance" element={<Finance />} />
          <Route path="hr" element={<HR />} />
          <Route path="scheduling" element={<Scheduling />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="ecommerce" element={<div className="p-8 text-dark-900 dark:text-white"><h1 className="text-2xl font-bold">E-Commerce</h1><p className="text-dark-500 mt-2">Configuracion de tienda online sincronizada con POS</p><p className="text-dark-400 mt-4">Modulo disponible via API en /api/ecommerce</p></div>} />
          <Route path="bi" element={<BI />} />
          <Route path="security" element={<Security />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
