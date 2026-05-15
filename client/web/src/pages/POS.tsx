// SYNAP - Pagina de Punto de Venta
// Autor: Luis Mario Taboada Nunez LMTN

import React, { useEffect, useState } from 'react';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, QrCode, Plus, Minus } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { usePos } from '../hooks/usePos';

const POS: React.FC = () => {
  const {
    productos, categorias, ventaActual, resumenDia,
    carrito, totalCarrito, cantidadItems,
    buscarProductos, cargarCategorias, crearVenta, cargarResumenDia,
    agregarAlCarrito, quitarDelCarrito, vaciarCarrito,
  } = usePos();

  const [busqueda, setBusqueda] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [showPago, setShowPago] = useState(false);
  const [clienteId, setClienteId] = useState('');

  useEffect(() => {
    buscarProductos({ limite: 50 });
    cargarCategorias();
    cargarResumenDia();
  }, []);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    buscarProductos({ busqueda, limite: 50 });
  };

  const handleCrearVenta = async () => {
    const venta = await crearVenta({
      metodo_pago: metodoPago,
      monto_recibido: metodoPago === 'efectivo' ? parseFloat(montoRecibido) : undefined,
      cliente_id: clienteId || undefined,
    });
    if (venta) {
      vaciarCarrito();
      setShowPago(false);
      setMontoRecibido('');
      cargarResumenDia();
    }
  };

  const vuelto = parseFloat(montoRecibido) - totalCarrito;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Punto de Venta</h1>
          <p className="text-dark-500 dark:text-dark-400">Gestion de ventas y productos</p>
        </div>
        {resumenDia.data && (
          <div className="flex gap-4">
            <Badge variant="success">Ventas hoy: Gs. {Math.round(resumenDia.data.total_ingresos || 0).toLocaleString('es-PY')}</Badge>
            <Badge variant="info">{resumenDia.data.total_ventas || 0} operaciones</Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <form onSubmit={handleBuscar} className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nombre, codigo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  icon={<Search size={18} />}
                />
              </div>
              <Button type="submit">Buscar</Button>
            </form>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
            {productos.loading && <p className="text-dark-500 p-4">Cargando productos...</p>}
            {productos.data?.map((producto: any) => (
              <Card key={producto.id} hover padding="sm" className="cursor-pointer" onClick={() => agregarAlCarrito(producto)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-dark-900 dark:text-white text-sm">{producto.nombre}</p>
                    <p className="text-xs text-dark-400">Stock: {producto.stock_actual}</p>
                    <p className="text-lg font-bold text-synap-600 dark:text-synap-400 mt-1">
                      Gs. {parseFloat(producto.precio_venta).toLocaleString('es-PY')}
                    </p>
                  </div>
                  {producto.stock_actual <= producto.stock_minimo && (
                    <Badge variant="warning">Bajo</Badge>
                  )}
                </div>
              </Card>
            ))}
            {productos.data?.length === 0 && !productos.loading && (
              <p className="text-dark-400 col-span-2 text-center py-8">No se encontraron productos</p>
            )}
          </div>
        </div>

        <div>
          <Card className="sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-dark-900 dark:text-white flex items-center gap-2">
                <ShoppingCart size={18} />
                Carrito ({cantidadItems})
              </h3>
              {carrito.length > 0 && (
                <button onClick={vaciarCarrito} className="text-red-500 hover:text-red-700 text-sm">
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto mb-4">
              {carrito.map((item) => (
                <div key={item.producto_id} className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-700">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-dark-900 dark:text-white">{item.nombre}</p>
                    <p className="text-xs text-dark-400">Gs. {item.precio_unitario.toLocaleString('es-PY')} x {item.cantidad}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => quitarDelCarrito(item.producto_id)} className="text-red-400 hover:text-red-600">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold text-dark-900 dark:text-white">
                      Gs. {item.subtotal.toLocaleString('es-PY')}
                    </span>
                  </div>
                </div>
              ))}
              {carrito.length === 0 && (
                <p className="text-dark-400 text-sm text-center py-8">Carrito vacio</p>
              )}
            </div>

            <div className="border-t border-dark-200 dark:border-dark-700 pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-dark-500">Subtotal</span>
                <span className="font-semibold text-dark-900 dark:text-white">Gs. {totalCarrito.toLocaleString('es-PY')}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-bold text-dark-900 dark:text-white">Total</span>
                <span className="font-bold text-synap-600 dark:text-synap-400">Gs. {totalCarrito.toLocaleString('es-PY')}</span>
              </div>
            </div>

            <Button
              className="w-full mt-4"
              size="lg"
              disabled={carrito.length === 0}
              onClick={() => setShowPago(true)}
            >
              Cobrar Gs. {totalCarrito.toLocaleString('es-PY')}
            </Button>
          </Card>
        </div>
      </div>

      <Modal isOpen={showPago} onClose={() => setShowPago(false)} title="Realizar Cobro" size="md">
        <div className="space-y-4">
          <div className="text-center py-3 bg-synap-50 dark:bg-synap-950 rounded-xl">
            <p className="text-3xl font-bold text-synap-600 dark:text-synap-400">
              Gs. {totalCarrito.toLocaleString('es-PY')}
            </p>
            <p className="text-sm text-dark-500">{cantidadItems} productos</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">Metodo de Pago</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                { id: 'tarjeta_credito', label: 'Tarjeta', icon: CreditCard },
                { id: 'transferencia', label: 'Transfer.', icon: CreditCard },
                { id: 'qr', label: 'QR', icon: QrCode },
              ].map((metodo) => (
                <button
                  key={metodo.id}
                  onClick={() => setMetodoPago(metodo.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    metodoPago === metodo.id
                      ? 'border-synap-500 bg-synap-50 dark:bg-synap-950'
                      : 'border-dark-200 dark:border-dark-700 hover:border-dark-300'
                  }`}
                >
                  <metodo.icon size={18} />
                  <span className="text-sm font-medium">{metodo.label}</span>
                </button>
              ))}
            </div>
          </div>

          {metodoPago === 'efectivo' && (
            <div>
              <Input
                label="Monto Recibido"
                type="number"
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                placeholder="Ingrese monto recibido"
              />
              {parseFloat(montoRecibido) >= totalCarrito && totalCarrito > 0 && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 rounded-xl">
                  <p className="text-green-700 dark:text-green-400">
                    Vuelto: Gs. {vuelto.toLocaleString('es-PY')}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowPago(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleCrearVenta}
              loading={ventaActual.loading}
              className="flex-1"
              disabled={metodoPago === 'efectivo' && parseFloat(montoRecibido) < totalCarrito}
            >
              Confirmar Venta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default POS;
