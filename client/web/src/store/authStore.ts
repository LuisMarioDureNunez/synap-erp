// SYNAP - Store de Autenticacion Zustand
// Autor: Luis Mario Taboada Nunez LMTN

import { create } from 'zustand';
import api from '../services/api';
import { Usuario, AuthState } from '../types';

interface AuthStore extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  cargarUsuario: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  usuario: null,
  access_token: localStorage.getItem('synap_access_token'),
  refresh_token: localStorage.getItem('synap_refresh_token'),
  isAuthenticated: !!localStorage.getItem('synap_access_token'),

  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    const { access_token, refresh_token, usuario } = response.data.data;
    localStorage.setItem('synap_access_token', access_token);
    localStorage.setItem('synap_refresh_token', refresh_token);
    localStorage.setItem('synap_usuario_id', usuario.id);
    set({ usuario, access_token, refresh_token, isAuthenticated: true });
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.clear();
    set({ usuario: null, access_token: null, refresh_token: null, isAuthenticated: false });
  },

  cargarUsuario: async () => {
    try {
      const response = await api.get('/auth/perfil');
      set({ usuario: response.data.data, isAuthenticated: true });
    } catch {
      localStorage.clear();
      set({ usuario: null, access_token: null, refresh_token: null, isAuthenticated: false });
    }
  },
}));
