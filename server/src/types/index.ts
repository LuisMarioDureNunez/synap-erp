// ============================================
// SYNAP - SISTEMA DE TIPOS GLOBALES
// AUTOR: LUIS MARIO TABOADA NUÑEZ "LMTN"
// ============================================

// Tipos de roles del sistema
export type RolSistema =
  | "super_admin"
  | "admin"
  | "gerente"
  | "cajero"
  | "vendedor"
  | "inventario"
  | "cliente";

// Estados generales
export type EstadoRegistro = "activo" | "inactivo" | "eliminado";
export type EstadoVenta =
  | "pendiente"
  | "completada"
  | "anulada"
  | "reembolsada";
export type EstadoFiado =
  | "pendiente"
  | "pagado_parcial"
  | "pagado_total"
  | "vencido"
  | "incobrable";
export type EstadoPedido =
  | "pendiente"
  | "confirmado"
  | "preparando"
  | "en_camino"
  | "entregado"
  | "cancelado";
export type EstadoCita =
  | "pendiente"
  | "confirmada"
  | "en_progreso"
  | "completada"
  | "cancelada"
  | "no_asistio";
export type MetodoPago =
  | "efectivo"
  | "tarjeta_credito"
  | "tarjeta_debito"
  | "transferencia"
  | "qr"
  | "billetera"
  | "fiado";

// Interfaces base
export interface IUsuarioPayload {
  id: string;
  negocio_id: string;
  username: string;
  rol: RolSistema;
  nombre_completo: string;
  sucursal_id?: string;
}

export interface IRespuestaAPI<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface IPaginacion {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface IFiltrosBase {
  negocio_id: string;
  sucursal_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  busqueda?: string;
}

// Tipos para auditoria
export interface IAuditoriaCreate {
  negocio_id: string;
  usuario_id: string;
  accion: string;
  entidad: string;
  entidad_id?: string;
  datos_anteriores?: object;
  datos_nuevos?: object;
  ip_address?: string;
  user_agent?: string;
}

// Tipos para métricas
export interface IMetricaDiaria {
  negocio_id: string;
  sucursal_id?: string;
  fecha: string;
  total_ventas: number;
  cantidad_ventas: number;
  ticket_promedio: number;
  clientes_nuevos: number;
  productos_vendidos: number;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: IUsuarioPayload;
      requestId?: string;
      negocio_id?: string;
    }
  }
}

export {};
