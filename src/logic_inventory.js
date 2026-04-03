// ============================================
// LOGIC_INVENTORY.JS - Lógica de inventario
// Cálculos y operaciones de productos
// ============================================

import {
  getProductos,
  agregarProducto,
  actualizarProducto,
  eliminarProducto,
} from './storage_manager';

// Agregar producto nuevo
// Ejemplo: agregarNuevoProducto({ nombre: 'Sincronizador 3ra', precioCompra: 50, precioVenta: 80, cantidad: 5 })
export async function agregarNuevoProducto(datos) {
  const producto = {
    nombre: datos.nombre,
    precioCompra: parseFloat(datos.precioCompra) || 0,
    precioVenta: parseFloat(datos.precioVenta) || 0,
    cantidad: parseInt(datos.cantidad) || 0,
    linkProveedor: datos.linkProveedor || '',
    imagenes: datos.imagenes || [],
  };
  return await agregarProducto(producto);
}

// Calcular ganancia de un producto
export function calcularGanancia(precioCompra, precioVenta) {
  return precioVenta - precioCompra;
}

// Resumen general del inventario
export async function getResumenInventario() {
  const productos = await getProductos();

  let totalInvertido = 0;
  let totalEnVentas = 0;
  let totalGanancia = 0;

  productos.forEach(p => {
    totalInvertido += p.precioCompra * p.cantidad;
    totalEnVentas += p.precioVenta * p.cantidad;
    totalGanancia += calcularGanancia(p.precioCompra, p.precioVenta) * p.cantidad;
  });

  return {
    totalProductos: productos.length,
    totalInvertido,
    totalEnVentas,
    totalGanancia,
    productos,
  };
}

// Reducir stock cuando se hace una venta
export async function reducirStock(productoId, cantidadVendida) {
  const productos = await getProductos();
  const producto = productos.find(p => p.id === productoId);

  if (!producto) return { exito: false, mensaje: 'Producto no encontrado' };
  if (producto.cantidad < cantidadVendida) return { exito: false, mensaje: 'Stock insuficiente' };

  await actualizarProducto(productoId, {
    cantidad: producto.cantidad - cantidadVendida,
  });

  return { exito: true };
}

export { getProductos, eliminarProducto, actualizarProducto };