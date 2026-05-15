// SYNAP - Hook para modulo Inventario
// Autor: Luis Mario Taboada Nunez LMTN

import { useAPI } from './useAPI';

export function useInventory() {
  const stock = useAPI<any[]>();
  const proveedores = useAPI<any[]>();
  const compras = useAPI<any[]>();
  const alertas = useAPI<any>();
  const valoracion = useAPI<any>();
  const conteo = useAPI<any>();

  const cargarStock = (filtros?: any) => stock.ejecutar('get', '/inventory/stock', undefined, filtros);
  const listarProveedores = (busqueda?: string) => proveedores.ejecutar('get', '/inventory/proveedores', undefined, { busqueda });
  const crearCompra = (datos: any) => compras.ejecutar('post', '/inventory/compras', datos);
  const listarCompras = (filtros?: any) => compras.ejecutar('get', '/inventory/compras', undefined, filtros);
  const cargarAlertas = () => alertas.ejecutar('get', '/inventory/alertas');
  const cargarValoracion = () => valoracion.ejecutar('get', '/inventory/valoracion');
  const iniciarConteo = (sucursal_id?: string) => conteo.ejecutar('post', '/inventory/conteo/iniciar', { sucursal_id });
  const registrarConteo = (datos: any) => conteo.ejecutar('post', '/inventory/conteo/registrar', datos);

  return {
    stock, proveedores, compras, alertas, valoracion, conteo,
    cargarStock, listarProveedores, crearCompra, listarCompras, cargarAlertas, cargarValoracion, iniciarConteo, registrarConteo,
  };
}
