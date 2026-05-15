-- ============================================
-- SYNAP - SISTEMA DE NEGOCIOS AUTOMATIZADO DEL PARAGUAY
-- AUTOR: LUIS MARIO DURE NUNEZ "LMTN"
-- MIGRACION: 001 - NUCLEO PRINCIPAL
-- FECHA: 2025
-- POSTGRESQL 16
-- ============================================

-- EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ESQUEMAS POR MODULO
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS pos;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS hr;
CREATE SCHEMA IF NOT EXISTS scheduling;
CREATE SCHEMA IF NOT EXISTS delivery;
CREATE SCHEMA IF NOT EXISTS ecommerce;
CREATE SCHEMA IF NOT EXISTS bi;
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS system;

-- ============================================
-- ESQUEMA: SYSTEM - CONFIGURACION GLOBAL
-- ============================================

CREATE TABLE system.negocios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    razon_social VARCHAR(300),
    ruc VARCHAR(20) UNIQUE,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(150),
    logo_url TEXT,
    config_json JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE system.sucursales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    es_central BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE system.licencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL DEFAULT 'basico',
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    modulos_habilitados JSONB DEFAULT '["pos","inventory","crm"]',
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ESQUEMA: AUTH - AUTENTICACION Y SEGURIDAD
-- ============================================

CREATE TABLE auth.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID REFERENCES system.negocios(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES system.sucursales(id) ON DELETE SET NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(150) UNIQUE,
    nombre_completo VARCHAR(200) NOT NULL,
    avatar_url TEXT,
    rol VARCHAR(50) NOT NULL DEFAULT 'cajero',
    activo BOOLEAN DEFAULT true,
    verificado BOOLEAN DEFAULT false,
    dos_factores_activo BOOLEAN DEFAULT false,
    dos_factores_secreto VARCHAR(100),
    ultimo_acceso TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auth.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID REFERENCES system.negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    permisos JSONB NOT NULL DEFAULT '[]',
    es_sistema BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auth.sesiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    dispositivo VARCHAR(100),
    expira_en TIMESTAMP NOT NULL,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auth.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expira_en TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ESQUEMA: POS - PUNTO DE VENTA
-- ============================================

CREATE TABLE pos.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    icono VARCHAR(50),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pos.productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES pos.categorias(id) ON DELETE SET NULL,
    codigo_barras VARCHAR(100),
    codigo_interno VARCHAR(100),
    nombre VARCHAR(300) NOT NULL,
    descripcion TEXT,
    precio_costo DECIMAL(15,2) DEFAULT 0,
    precio_venta DECIMAL(15,2) NOT NULL,
    precio_mayorista DECIMAL(15,2),
    stock_actual DECIMAL(12,3) DEFAULT 0,
    stock_minimo DECIMAL(12,3) DEFAULT 0,
    stock_maximo DECIMAL(12,3) DEFAULT 0,
    unidad_medida VARCHAR(20) DEFAULT 'unidad',
    es_fraccionable BOOLEAN DEFAULT false,
    peso_unitario DECIMAL(10,3),
    imagen_url TEXT,
    aplica_iva BOOLEAN DEFAULT true,
    porcentaje_iva DECIMAL(5,2) DEFAULT 10,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pos.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    apellido VARCHAR(200),
    documento VARCHAR(30),
    tipo_documento VARCHAR(20) DEFAULT 'ci',
    telefono VARCHAR(20),
    email VARCHAR(150),
    direccion TEXT,
    fecha_nacimiento DATE,
    puntos_acumulados INTEGER DEFAULT 0,
    categoria_cliente VARCHAR(50) DEFAULT 'regular',
    permite_fiado BOOLEAN DEFAULT false,
    limite_fiado DECIMAL(15,2) DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pos.ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES system.sucursales(id) ON DELETE SET NULL,
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id),
    cliente_id UUID REFERENCES pos.clientes(id) ON DELETE SET NULL,
    numero_venta VARCHAR(50) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    descuento DECIMAL(15,2) DEFAULT 0,
    iva_total DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo',
    monto_recibido DECIMAL(15,2),
    vuelto DECIMAL(15,2),
    es_fiado BOOLEAN DEFAULT false,
    estado VARCHAR(30) DEFAULT 'completada',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pos.venta_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES pos.ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES pos.productos(id),
    cantidad DECIMAL(12,3) NOT NULL,
    precio_unitario DECIMAL(15,2) NOT NULL,
    descuento DECIMAL(15,2) DEFAULT 0,
    iva DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pos.cajas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES system.sucursales(id) ON DELETE SET NULL,
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id),
    monto_inicial DECIMAL(15,2) NOT NULL DEFAULT 0,
    monto_final DECIMAL(15,2),
    total_ventas DECIMAL(15,2) DEFAULT 0,
    total_efectivo DECIMAL(15,2) DEFAULT 0,
    total_tarjeta DECIMAL(15,2) DEFAULT 0,
    total_transferencia DECIMAL(15,2) DEFAULT 0,
    total_otros DECIMAL(15,2) DEFAULT 0,
    diferencia DECIMAL(15,2),
    abierta BOOLEAN DEFAULT true,
    abierta_en TIMESTAMP DEFAULT NOW(),
    cerrada_en TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ESQUEMA: INVENTORY - INVENTARIO AVANZADO
-- ============================================

CREATE TABLE inventory.proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    ruc VARCHAR(20),
    telefono VARCHAR(20),
    email VARCHAR(150),
    direccion TEXT,
    contacto_nombre VARCHAR(200),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory.compras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    proveedor_id UUID NOT NULL REFERENCES inventory.proveedores(id),
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id),
    numero_compra VARCHAR(50) NOT NULL,
    subtotal DECIMAL(15,2) DEFAULT 0,
    iva DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    estado VARCHAR(30) DEFAULT 'recibida',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory.compra_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compra_id UUID NOT NULL REFERENCES inventory.compras(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES pos.productos(id),
    cantidad DECIMAL(12,3) NOT NULL,
    precio_unitario DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory.lotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES pos.productos(id),
    compra_id UUID REFERENCES inventory.compras(id),
    codigo_lote VARCHAR(100) NOT NULL,
    cantidad_inicial DECIMAL(12,3) NOT NULL,
    cantidad_actual DECIMAL(12,3) NOT NULL,
    fecha_vencimiento DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory.movimientos_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES pos.productos(id),
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id),
    tipo VARCHAR(30) NOT NULL,
    cantidad DECIMAL(12,3) NOT NULL,
    stock_anterior DECIMAL(12,3),
    stock_nuevo DECIMAL(12,3),
    referencia_id UUID,
    referencia_tipo VARCHAR(50),
    motivo TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ESQUEMA: CRM - CLIENTES Y FIDELIZACION
-- ============================================

CREATE TABLE crm.fiados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES pos.clientes(id),
    venta_id UUID REFERENCES pos.ventas(id),
    monto_total DECIMAL(15,2) NOT NULL,
    saldo_pendiente DECIMAL(15,2) NOT NULL DEFAULT 0,
    estado VARCHAR(30) DEFAULT 'pendiente',
    fecha_vencimiento DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crm.pagos_fiados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiado_id UUID NOT NULL REFERENCES crm.fiados(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id),
    monto DECIMAL(15,2) NOT NULL,
    metodo_pago VARCHAR(50) DEFAULT 'efectivo',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crm.programa_puntos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    puntos_por_compra DECIMAL(10,2) DEFAULT 1,
    monto_por_punto DECIMAL(10,2) DEFAULT 1000,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crm.puntos_transacciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES pos.clientes(id),
    venta_id UUID REFERENCES pos.ventas(id),
    puntos_ganados INTEGER DEFAULT 0,
    puntos_canjeados INTEGER DEFAULT 0,
    saldo_puntos INTEGER DEFAULT 0,
    tipo VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ESQUEMA: FINANCE - FINANZAS
-- ============================================

CREATE TABLE finance.cuentas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    saldo DECIMAL(15,2) DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE finance.transacciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    cuenta_id UUID NOT NULL REFERENCES finance.cuentas(id),
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id),
    tipo VARCHAR(30) NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    descripcion TEXT,
    referencia_id UUID,
    referencia_tipo VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE finance.gastos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.usuarios(id),
    categoria VARCHAR(100),
    monto DECIMAL(15,2) NOT NULL,
    descripcion TEXT,
    comprobante_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ESQUEMA: HR - RECURSOS HUMANOS
-- ============================================

CREATE TABLE hr.empleados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.usuarios(id),
    nombre VARCHAR(200) NOT NULL,
    documento VARCHAR(30),
    cargo VARCHAR(100),
    salario_base DECIMAL(15,2),
    fecha_ingreso DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE hr.asistencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empleado_id UUID NOT NULL REFERENCES hr.empleados(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES system.sucursales(id),
    tipo VARCHAR(30) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT NOW(),
    metodo_registro VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE hr.comisiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empleado_id UUID NOT NULL REFERENCES hr.empleados(id) ON DELETE CASCADE,
    venta_id UUID REFERENCES pos.ventas(id),
    porcentaje DECIMAL(5,2) NOT NULL,
    monto DECIMAL(15,2) NOT NULL,
    pagada BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ESQUEMA: SCHEDULING - CITAS Y AGENDA
-- ============================================

CREATE TABLE scheduling.servicios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    duracion_minutos INTEGER NOT NULL,
    precio DECIMAL(15,2),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scheduling.citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES pos.clientes(id),
    servicio_id UUID REFERENCES scheduling.servicios(id),
    empleado_id UUID REFERENCES hr.empleados(id),
    fecha_hora TIMESTAMP NOT NULL,
    duracion_minutos INTEGER,
    estado VARCHAR(30) DEFAULT 'pendiente',
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ESQUEMA: DELIVERY - REPARTO Y LOGISTICA
-- ============================================

CREATE TABLE delivery.repartidores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    telefono VARCHAR(20),
    vehiculo VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE delivery.zonas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    costo DECIMAL(10,2) DEFAULT 0,
    tiempo_estimado_minutos INTEGER,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE delivery.pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES pos.ventas(id) ON DELETE CASCADE,
    repartidor_id UUID REFERENCES delivery.repartidores(id),
    zona_id UUID REFERENCES delivery.zonas(id),
    direccion_entrega TEXT NOT NULL,
    costo_envio DECIMAL(10,2) DEFAULT 0,
    estado VARCHAR(30) DEFAULT 'pendiente',
    hora_asignacion TIMESTAMP,
    hora_entrega TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ESQUEMA: ECOMMERCE - TIENDA ONLINE
-- ============================================

CREATE TABLE ecommerce.tienda_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE UNIQUE,
    nombre_tienda VARCHAR(200),
    dominio VARCHAR(200),
    activa BOOLEAN DEFAULT false,
    config_json JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.pedidos_online (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tienda_id UUID NOT NULL REFERENCES ecommerce.tienda_config(id),
    cliente_id UUID REFERENCES pos.clientes(id),
    datos_cliente JSONB,
    total DECIMAL(15,2) NOT NULL,
    estado VARCHAR(30) DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ESQUEMA: SECURITY - SEGURIDAD Y AUDITORIA
-- ============================================

CREATE TABLE security.auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.usuarios(id),
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(100),
    entidad_id UUID,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE security.intentos_acceso (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    exito BOOLEAN DEFAULT false,
    motivo_fallo VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE security.bloqueos_ip (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address VARCHAR(45) NOT NULL,
    motivo TEXT,
    bloqueado_hasta TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ESQUEMA: BI - BUSINESS INTELLIGENCE
-- ============================================

CREATE TABLE bi.metricas_diarias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES system.sucursales(id),
    fecha DATE NOT NULL,
    total_ventas DECIMAL(15,2) DEFAULT 0,
    cantidad_ventas INTEGER DEFAULT 0,
    ticket_promedio DECIMAL(15,2) DEFAULT 0,
    clientes_nuevos INTEGER DEFAULT 0,
    productos_vendidos INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bi.predicciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    negocio_id UUID NOT NULL REFERENCES system.negocios(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL,
    datos_json JSONB NOT NULL,
    fecha_prediccion DATE,
    precision DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDICES PARA OPTIMIZACION EXTREMA
-- ============================================

CREATE INDEX idx_ventas_negocio_fecha ON pos.ventas(negocio_id, created_at DESC);
CREATE INDEX idx_venta_detalles_venta ON pos.venta_detalles(venta_id);
CREATE INDEX idx_productos_negocio ON pos.productos(negocio_id);
CREATE INDEX idx_productos_codigo ON pos.productos(codigo_barras);
CREATE INDEX idx_clientes_negocio ON pos.clientes(negocio_id);
CREATE INDEX idx_clientes_documento ON pos.clientes(documento);
CREATE INDEX idx_fiados_cliente ON crm.fiados(cliente_id);
CREATE INDEX idx_fiados_estado ON crm.fiados(estado);
CREATE INDEX idx_auditoria_negocio ON security.auditoria(negocio_id, created_at DESC);
CREATE INDEX idx_auditoria_usuario ON security.auditoria(usuario_id);
CREATE INDEX idx_sesiones_usuario ON auth.sesiones(usuario_id);
CREATE INDEX idx_movimientos_producto ON inventory.movimientos_stock(producto_id, created_at DESC);
CREATE INDEX idx_lotes_producto ON inventory.lotes(producto_id);
CREATE INDEX idx_lotes_vencimiento ON inventory.lotes(fecha_vencimiento);
CREATE INDEX idx_citas_fecha ON scheduling.citas(fecha_hora);
CREATE INDEX idx_citas_cliente ON scheduling.citas(cliente_id);
CREATE INDEX idx_pedidos_estado ON delivery.pedidos(estado);
CREATE INDEX idx_asistencias_empleado ON hr.asistencias(empleado_id, fecha_hora DESC);
CREATE INDEX idx_metricas_negocio_fecha ON bi.metricas_diarias(negocio_id, fecha);

-- ============================================
-- FUNCIONES AUTOMATICAS
-- ============================================

CREATE OR REPLACE FUNCTION system.actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_negocios_updated
    BEFORE UPDATE ON system.negocios
    FOR EACH ROW EXECUTE FUNCTION system.actualizar_timestamp();

CREATE TRIGGER trg_productos_updated
    BEFORE UPDATE ON pos.productos
    FOR EACH ROW EXECUTE FUNCTION system.actualizar_timestamp();

CREATE TRIGGER trg_clientes_updated
    BEFORE UPDATE ON pos.clientes
    FOR EACH ROW EXECUTE FUNCTION system.actualizar_timestamp();

CREATE TRIGGER trg_usuarios_updated
    BEFORE UPDATE ON auth.usuarios
    FOR EACH ROW EXECUTE FUNCTION system.actualizar_timestamp();

-- FUNCION PARA ACTUALIZAR STOCK AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION inventory.actualizar_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pos.productos
    SET stock_actual = stock_actual - NEW.cantidad,
        updated_at = NOW()
    WHERE id = NEW.producto_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_venta_detalle_stock
    AFTER INSERT ON pos.venta_detalles
    FOR EACH ROW EXECUTE FUNCTION inventory.actualizar_stock();

-- ============================================
-- DATOS SEMILLA INICIALES
-- ============================================

INSERT INTO system.negocios (id, nombre, razon_social, ruc) VALUES
('00000000-0000-0000-0000-000000000001', 'SYNAP Demo', 'LMTN Software S.A.', '9999999-0');

INSERT INTO auth.usuarios (id, negocio_id, username, password_hash, nombre_completo, rol, verificado) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 'admin', '$2b$12$LJ3m4ys3Lk0TSwHCpNqrSO5YJGHybKvIbPQFzQEtGvCfGqP8pNqTi',
 'Luis Mario Dure Nuñez', 'super_admin', true);

-- ============================================
-- FIN DE MIGRACION 001
-- PROPIEDAD DE LUIS MARIO DURE NUÑEZ "LMTN"
-- SYNAP - TODOS LOS DERECHOS RESERVADOS
-- ============================================
