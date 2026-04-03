// ============================================
// LOGIC_SALES.JS - Lógica de ventas
// Registrar ventas y ver historial
// ============================================

import { registrarVenta, getVentas } from './storage_manager';
import { reducirStock, getProductos } from './logic_inventory';

// Registrar una venta completa
// Ejemplo: venderProducto('id123', 2)
export async function venderProducto(productoId, cantidad) {
  const productos = await getProductos();
  const producto = productos.find(p => p.id === productoId);

  if (!producto) return { exito: false, mensaje: 'Producto no encontrado' };

  // Reducir stock primero
  const resultado = await reducirStock(productoId, cantidad);
  if (!resultado.exito) return resultado;

  // Guardar la venta
  const venta = {
    productoId,
    nombreProducto: producto.nombre,
    cantidad,
    precioVenta: producto.precioVenta,
    precioCompra: producto.precioCompra,
    ganancia: (producto.precioVenta - producto.precioCompra) * cantidad,
    total: producto.precioVenta * cantidad,
  };

  await registrarVenta(venta);
  return { exito: true, venta };
}

// Obtener ventas de hoy
export async function getVentasHoy() {
  const ventas = await getVentas();
  const hoy = new Date().toDateString();
  return ventas.filter(v => new Date(v.fecha).toDateString() === hoy);
}

// Obtener ventas de este mes
export async function getVentasMes() {
  const ventas = await getVentas();
  const ahora = new Date();
  return ventas.filter(v => {
    const fecha = new Date(v.fecha);
    return fecha.getMonth() === ahora.getMonth() &&
           fecha.getFullYear() === ahora.getFullYear();
  });
}

// Obtener ventas de este año
export async function getVentasAnio() {
  const ventas = await getVentas();
  const anio = new Date().getFullYear();
  return ventas.filter(v => new Date(v.fecha).getFullYear() === anio);
}

// Resumen de ventas (total ganado, cantidad vendida)
export async function getResumenVentas() {
  const ventasHoy = await getVentasHoy();
  const ventasMes = await getVentasMes();

  const sumar = (lista) => lista.reduce((acc, v) => acc + v.ganancia, 0);

  return {
    cantidadHoy: ventasHoy.length,
    gananciaHoy: sumar(ventasHoy),
    gananciaMes: sumar(ventasMes),
  };
}