// SYNAP - Pagina de Login
// Autor: Luis Mario Taboada Nunez LMTN

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Store, Eye, EyeOff } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-synap-50 via-white to-synap-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-synap-500 to-synap-700 rounded-2xl shadow-xl shadow-synap-500/30 mb-4">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-dark-900 dark:text-white tracking-tight">SYNAP</h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">Sistema de Negocios Autoadministrable del Paraguay</p>
          <p className="text-xs text-dark-400 dark:text-dark-500 mt-3">by Luis Mario Taboada Nunez LMTN</p>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-dark-100 dark:border-dark-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingrese su usuario"
              autoComplete="username"
            />
            <div className="relative">
              <Input
                label="Contrasena"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contrasena"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-dark-400 hover:text-dark-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded-xl text-sm">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Iniciar Sesion
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
