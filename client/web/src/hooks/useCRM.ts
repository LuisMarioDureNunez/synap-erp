// SYNAP - Hook para modulo CRM
// Autor: Luis Mario Taboada Nunez LMTN

import { useAPI } from './useAPI';

export function useCRM() {
  const clientes = useAPI<any[]>();
  const clienteActual = useAPI<any>();
  const segmentos = useAPI<any>();
  const cumpleaneros = useAPI<any>();
  const fiados = useAPI<any[]>();
  const resumenFiados = useAPI<any>();
  const rankingPuntos = useAPI<any[]>();

  const listarClientes = (filtros?: any) => clientes.ejecutar('get', '/crm/clientes', undefined, filtros);
  const obtenerCliente = (id: string) => clienteActual.ejecutar('get', `/crm/clientes/${id}`);
  const crearCliente = (datos: any) => clienteActual.ejecutar('post', '/crm/clientes', datos);
  const actualizarCliente = (id: string, datos: any) => clienteActual.ejecutar('put', `/crm/clientes/${id}`, datos);
  const segmentarClientes = () => segmentos.ejecutar('get', '/crm/clientes/segmentar');
  const cargarCumpleaneros = (dias?: number) => cumpleaneros.ejecutar('get', '/crm/clientes/cumpleaneros', undefined, { dias });
  const listarFiados = (filtros?: any) => fiados.ejecutar('get', '/crm/fiados', undefined, filtros);
  const crearFiado = (datos: any) => fiados.ejecutar('post', '/crm/fiados', datos);
  const registrarPagoFiado = (datos: any) => fiados.ejecutar('post', '/crm/fiados/pago', datos);
  const cargarResumenFiados = () => resumenFiados.ejecutar('get', '/crm/fiados/resumen');
  const cargarRankingPuntos = (limite?: number) => rankingPuntos.ejecutar('get', '/crm/puntos/ranking', undefined, { limite });

  return {
    clientes, clienteActual, segmentos, cumpleaneros, fiados, resumenFiados, rankingPuntos,
    listarClientes, obtenerCliente, crearCliente, actualizarCliente,
    segmentarClientes, cargarCumpleaneros,
    listarFiados, crearFiado, registrarPagoFiado, cargarResumenFiados, cargarRankingPuntos,
  };
}
