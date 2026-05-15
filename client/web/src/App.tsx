// SYNAP - Aplicacion Principal
// Autor: Luis Mario Taboada Nunez LMTN

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

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
          <Route path="pos" element={<div className="p-4 text-dark-900 dark:text-white">POS - Modulo en construccion</div>} />
          <Route path="inventory" element={<div className="p-4 text-dark-900 dark:text-white">Inventario - Modulo en construccion</div>} />
          <Route path="crm" element={<div className="p-4 text-dark-900 dark:text-white">CRM - Modulo en construccion</div>} />
          <Route path="finance" element={<div className="p-4 text-dark-900 dark:text-white">Finanzas - Modulo en construccion</div>} />
          <Route path="hr" element={<div className="p-4 text-dark-900 dark:text-white">RRHH - Modulo en construccion</div>} />
          <Route path="scheduling" element={<div className="p-4 text-dark-900 dark:text-white">Agenda - Modulo en construccion</div>} />
          <Route path="delivery" element={<div className="p-4 text-dark-900 dark:text-white">Delivery - Modulo en construccion</div>} />
          <Route path="ecommerce" element={<div className="p-4 text-dark-900 dark:text-white">E-Commerce - Modulo en construccion</div>} />
          <Route path="bi" element={<div className="p-4 text-dark-900 dark:text-white">BI & IA - Modulo en construccion</div>} />
          <Route path="security" element={<div className="p-4 text-dark-900 dark:text-white">Seguridad - Modulo en construccion</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
