export interface Usuario {
  id: string;
  username: string;
  nombre_completo: string;
  rol: string;
  negocio_id: string;
  sucursal_id?: string;
  avatar_url?: string;
}

export interface AuthState {
  usuario: Usuario | null;
  access_token: string | null;
  refresh_token: string | null;
  isAuthenticated: boolean;
}

export interface Producto {
  id: string;
  nombre: string;
  codigo_barras?: string;
  codigo_interno?: string;
  precio_venta: number;
  precio_costo: number;
  precio_mayorista?: number;
  stock_actual: number;
  stock_minimo: number;
  categoria_nombre?: string;
  imagen_url?: string;
  activo: boolean;
}

export interface Cliente {
  id: string;
  nombre: string;
  apellido?: string;
  documento?: string;
  telefono?: string;
  puntos_acumulados: number;
  total_compras?: number;
  total_gastado?: number;
  deuda_actual?: number;
}

export interface Venta {
  id: string;
  numero_venta: string;
  total: number;
  metodo_pago: string;
  estado: string;
  vendedor: string;
  cliente_nombre?: string;
  created_at: string;
}

export interface RespuestaAPI<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface Paginacion {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}
