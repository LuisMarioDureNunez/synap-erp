// SYNAP - Cliente API Axios
// Autor: Luis Mario Taboada Nunez LMTN

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('synap_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('synap_refresh_token');
        const usuarioId = localStorage.getItem('synap_usuario_id');
        if (!refreshToken || !usuarioId) throw new Error('No hay tokens');
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
          usuario_id: usuarioId,
        });
        const { access_token, refresh_token } = response.data.data;
        localStorage.setItem('synap_access_token', access_token);
        localStorage.setItem('synap_refresh_token', refresh_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
