// ============================================
// FIRESTORE.JS - Reemplaza storage_manager.js
// Operaciones CRUD para productos y ventas
// Datos aislados por usuario (uid)
// ============================================

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, onSnapshot, query, orderBy, serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ---- HELPERS ----

function productosRef(uid) {
  return collection(db, 'users', uid, 'productos');
}

function ventasRef(uid) {
  return collection(db, 'users', uid, 'ventas');
}

// ---- PRODUCTOS ----

export async function getProductos(uid) {
  const snap = await getDocs(query(productosRef(uid), orderBy('creadoEn', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeProductos(uid, callback) {
  const q = query(productosRef(uid), orderBy('creadoEn', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function agregarProducto(uid, producto) {
  const nuevo = {
    ...producto,
    creadoEn: serverTimestamp(),
  };
  const ref = await addDoc(productosRef(uid), nuevo);
  return { id: ref.id, ...nuevo };
}

export async function actualizarProducto(uid, id, cambios) {
  await updateDoc(doc(db, 'users', uid, 'productos', id), cambios);
}

export async function eliminarProducto(uid, id) {
  await deleteDoc(doc(db, 'users', uid, 'productos', id));
}

// ---- VENTAS ----

export async function getVentas(uid) {
  const snap = await getDocs(query(ventasRef(uid), orderBy('fecha', 'desc')));
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    fecha: d.data().fecha?.toDate?.()?.toISOString() || new Date().toISOString(),
  }));
}

export function subscribeVentas(uid, callback) {
  const q = query(ventasRef(uid), orderBy('fecha', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      fecha: d.data().fecha?.toDate?.()?.toISOString() || new Date().toISOString(),
    })));
  });
}

export async function registrarVenta(uid, venta) {
  const nueva = {
    ...venta,
    fecha: serverTimestamp(),
  };
  const ref = await addDoc(ventasRef(uid), nueva);
  return { id: ref.id, ...nueva, fecha: new Date().toISOString() };
}

export async function eliminarVenta(uid, id) {
  await deleteDoc(doc(db, 'users', uid, 'ventas', id));
}

// ---- LÓGICA INVENTARIO ----

export function calcularGanancia(precioCompra, precioVenta) {
  return precioVenta - precioCompra;
}

export async function agregarNuevoProducto(uid, datos) {
  const producto = {
    nombre: datos.nombre,
    precioCompra: parseFloat(datos.precioCompra) || 0,
    precioVenta: parseFloat(datos.precioVenta) || 0,
    cantidad: parseInt(datos.cantidad) || 0,
    linkProveedor: datos.linkProveedor || '',
    imagenes: datos.imagenes || [],
  };
  return await agregarProducto(uid, producto);
}

export function getResumenInventario(productos) {
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
  };
}

export async function reducirStock(uid, productoId, cantidadVendida, productos) {
  const producto = productos.find(p => p.id === productoId);
  if (!producto) return { exito: false, mensaje: 'Producto no encontrado' };
  if (producto.cantidad < cantidadVendida) return { exito: false, mensaje: 'Stock insuficiente' };

  await actualizarProducto(uid, productoId, {
    cantidad: producto.cantidad - cantidadVendida,
  });
  return { exito: true };
}

export async function sumarStockProducto(uid, productoId, cantidadAgregar, productos) {
  const producto = productos.find(p => p.id === productoId);
  if (!producto) return { exito: false, mensaje: 'Producto no encontrado' };

  const cantidadActual = parseInt(producto.cantidad) || 0;
  const cantidadExtra = parseInt(cantidadAgregar) || 0;
  const cantidadNueva = cantidadActual + cantidadExtra;

  await actualizarProducto(uid, productoId, { cantidad: cantidadNueva });
  return { exito: true, nuevaCantidad: cantidadNueva };
}

// ---- LÓGICA VENTAS ----

export function getVentasHoy(ventas) {
  const hoy = new Date().toDateString();
  return ventas.filter(v => new Date(v.fecha).toDateString() === hoy);
}

export function getVentasMes(ventas) {
  const ahora = new Date();
  return ventas.filter(v => {
    const fecha = new Date(v.fecha);
    return fecha.getMonth() === ahora.getMonth() &&
           fecha.getFullYear() === ahora.getFullYear();
  });
}

export function getResumenVentas(ventas) {
  const ventasHoy = getVentasHoy(ventas);
  const ventasMes = getVentasMes(ventas);
  const sumar = (lista) => lista.reduce((acc, v) => acc + (v.ganancia || 0), 0);

  return {
    cantidadHoy: ventasHoy.length,
    gananciaHoy: sumar(ventasHoy),
    gananciaMes: sumar(ventasMes),
  };
}

export async function venderProducto(uid, productoId, cantidad, productos) {
  const producto = productos.find(p => p.id === productoId);
  if (!producto) return { exito: false, mensaje: 'Producto no encontrado' };

  const resultado = await reducirStock(uid, productoId, cantidad, productos);
  if (!resultado.exito) return resultado;

  const venta = {
    productoId,
    nombreProducto: producto.nombre,
    cantidad,
    precioVenta: producto.precioVenta,
    precioCompra: producto.precioCompra,
    ganancia: (producto.precioVenta - producto.precioCompra) * cantidad,
    total: producto.precioVenta * cantidad,
  };

  const nuevaVenta = await registrarVenta(uid, venta);
  return { exito: true, venta: nuevaVenta };
}
