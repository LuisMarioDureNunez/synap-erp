// SYNAP - Header Superior
// Autor: Luis Mario Taboada Nunez LMTN

import React from 'react';
import { Bell, Sun, Moon, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white dark:bg-dark-900 border-b border-dark-100 dark:border-dark-800 flex items-center justify-between px-6 ml-64">
      <div>
        <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
          Bienvenido, {usuario?.nombre_completo || 'Usuario'}
        </h2>
        <p className="text-xs text-dark-400 dark:text-dark-500">
          {new Date().toLocaleDateString('es-PY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-xl hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
        >
          {dark ? <Sun size={18} className="text-dark-300" /> : <Moon size={18} className="text-dark-600" />}
        </button>

        <button className="p-2 rounded-xl hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors relative">
          <Bell size={18} className="text-dark-600 dark:text-dark-300" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-dark-200 dark:border-dark-700">
          <div className="w-8 h-8 bg-synap-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">
            {usuario?.nombre_completo?.charAt(0) || 'U'}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors text-dark-400 hover:text-red-500"
            title="Cerrar sesion"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
