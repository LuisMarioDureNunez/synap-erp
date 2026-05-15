// SYNAP - Hook generico para consultas API
// Autor: Luis Mario Taboada Nunez LMTN

import { useState, useCallback } from 'react';
import api from '../services/api';
import { RespuestaAPI } from '../types';

interface UseAPIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAPI<T = any>() {
  const [state, setState] = useState<UseAPIState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const ejecutar = useCallback(async (
    metodo: 'get' | 'post' | 'put' | 'delete',
    url: string,
    body?: any,
    params?: any
  ): Promise<T | null> => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await api[metodo](url, body || params, params ? { params } : undefined);
      const respuesta: RespuestaAPI<T> = response.data;
      if (respuesta.success) {
        setState({ data: respuesta.data || null, loading: false, error: null });
        return respuesta.data || null;
      } else {
        setState({ data: null, loading: false, error: respuesta.error || 'Error desconocido' });
        return null;
      }
    } catch (err: any) {
      const mensaje = err.response?.data?.error || err.message || 'Error de conexion';
      setState({ data: null, loading: false, error: mensaje });
      return null;
    }
  }, []);

  return { ...state, ejecutar, setData: (data: T) => setState({ data, loading: false, error: null }) };
}
