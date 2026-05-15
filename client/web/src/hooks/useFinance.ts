// SYNAP - Hook para modulo Finanzas
// Autor: Luis Mario Taboada Nunez LMTN

import { useAPI } from './useAPI';

export function useFinance() {
  const cajaActual = useAPI<any>();
  const historialCajas = useAPI<any[]>();
  const cuentas = useAPI<any[]>();
  const gastos = useAPI<any[]>();
  const resumen = useAPI<any>();
  const flujoCaja = useAPI<any[]>();

  const abrirCaja = (datos: any) => cajaActual.ejecutar('post', '/finance/caja/abrir', datos);
  const cerrarCaja = (datos: any) => cajaActual.ejecutar('post', '/finance/caja/cerrar', datos);
  const cargarCajaActual = () => cajaActual.ejecutar('get', '/finance/caja/actual');
  const cargarHistorialCajas = (filtros?: any) => historialCajas.ejecutar('get', '/finance/caja/historial', undefined, filtros);
  const listarCuentas = () => cuentas.ejecutar('get', '/finance/cuentas');
  const crearCuenta = (datos: any) => cuentas.ejecutar('post', '/finance/cuentas', datos);
  const registrarTransaccion = (datos: any) => cuentas.ejecutar('post', '/finance/transacciones', datos);
  const registrarGasto = (datos: any) => gastos.ejecutar('post', '/finance/gastos', datos);
  const listarGastos = (filtros?: any) => gastos.ejecutar('get', '/finance/gastos', undefined, filtros);
  const cargarResumen = (periodo?: string) => resumen.ejecutar('get', '/finance/resumen', undefined, { periodo });
  const cargarFlujoCaja = (dias?: number) => flujoCaja.ejecutar('get', '/finance/flujo-caja', undefined, { dias });

  return {
    cajaActual, historialCajas, cuentas, gastos, resumen, flujoCaja,
    abrirCaja, cerrarCaja, cargarCajaActual, cargarHistorialCajas,
    listarCuentas, crearCuenta, registrarTransaccion,
    registrarGasto, listarGastos, cargarResumen, cargarFlujoCaja,
  };
}
