// SYNAP - Hook para modulo POS
// Autor: Luis Mario Taboada Nunez LMTN

import { useState } from 'react';
import { useAPI } from './useAPI';
import { Producto, Venta } from '../types';

export function usePos() {
  const productos = useAPI<Producto[]>();
  const categorias = useAPI<any[]>();
  const ventas = useAPI<any[]>();
  const ventaActual = useAPI<any>();
  const resumenDia = useAPI<any>();
  const [carrito, setCarrito] = useState<Array<{ producto_id: string; nombre: string; cantidad: number; precio_unitario: number; subtotal: number }>>([]);

  const buscarProductos = (filtros?: any) => productos.ejecutar('get', '/pos/productos', undefined, filtros);
  const cargarCategorias = () => categorias.ejecutar('get', '/pos/categorias');
  const crearVenta = (datos: any) => {
    const ventaConDetalles = { ...datos, detalles: carrito.map(item => ({ producto_id: item.producto_id, cantidad: item.cantidad, precio_unitario: item.precio_unitario })) };
    return ventaActual.ejecutar('post', '/pos/ventas', ventaConDetalles);
  };
  const listarVentas = (filtros?: any) => ventas.ejecutar('get', '/pos/ventas', undefined, filtros);
  const cargarResumenDia = () => resumenDia.ejecutar('get', '/pos/resumen-dia');

  const agregarAlCarrito = (producto: Producto, cantidad: number = 1) => {
    setCarrito(prev => {
      const existente = prev.find(item => item.producto_id === producto.id);
      if (existente) {
        return prev.map(item =>
          item.producto_id === producto.id
            ? { ...item, cantidad: item.cantidad + cantidad, subtotal: (item.cantidad + cantidad) * item.precio_unitario }
            : item
        );
      }
      return [...prev, { producto_id: producto.id, nombre: producto.nombre, cantidad, precio_unitario: producto.precio_venta, subtotal: cantidad * producto.precio_venta }];
    });
  };

  const quitarDelCarrito = (producto_id: string) => {
    setCarrito(prev => prev.filter(item => item.producto_id !== producto_id));
  };

  const vaciarCarrito = () => setCarrito([]);

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);
  const cantidadItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  return {
    productos, categorias, ventas, ventaActual, resumenDia,
    carrito, totalCarrito, cantidadItems,
    buscarProductos, cargarCategorias, crearVenta, listarVentas, cargarResumenDia,
    agregarAlCarrito, quitarDelCarrito, vaciarCarrito,
  };
}
