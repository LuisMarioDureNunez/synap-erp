// SYNAP - Aplicacion Principal Completa
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
import BI from './pages/BI';

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
          <Route path="hr" element={<div className="p-8 text-dark-900 dark:text-white"><h1 className="text-2xl font-bold">RRHH</h1><p className="text-dark-500">Modulo en desarrollo</p></div>} />
          <Route path="scheduling" element={<div className="p-8 text-dark-900 dark:text-white"><h1 className="text-2xl font-bold">Agenda</h1><p className="text-dark-500">Modulo en desarrollo</p></div>} />
          <Route path="delivery" element={<div className="p-8 text-dark-900 dark:text-white"><h1 className="text-2xl font-bold">Delivery</h1><p className="text-dark-500">Modulo en desarrollo</p></div>} />
          <Route path="ecommerce" element={<div className="p-8 text-dark-900 dark:text-white"><h1 className="text-2xl font-bold">E-Commerce</h1><p className="text-dark-500">Modulo en desarrollo</p></div>} />
          <Route path="bi" element={<BI />} />
          <Route path="security" element={<div className="p-8 text-dark-900 dark:text-white"><h1 className="text-2xl font-bold">Seguridad</h1><p className="text-dark-500">Modulo en desarrollo</p></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
