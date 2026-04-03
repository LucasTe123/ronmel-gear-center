// ============================================
// STORAGE_MANAGER.JS - Todo el guardado local
// Aquí se guarda y lee todo del iPhone
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// Claves de almacenamiento
const KEYS = {
  productos: 'rgc_productos',
  ventas: 'rgc_ventas',
};

// ---- PRODUCTOS ----

// Obtener todos los productos
export async function getProductos() {
  try {
    const data = await AsyncStorage.getItem(KEYS.productos);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// Guardar lista completa de productos
export async function saveProductos(productos) {
  try {
    await AsyncStorage.setItem(KEYS.productos, JSON.stringify(productos));
  } catch (e) {
    console.log('Error guardando productos', e);
  }
}

// Agregar un producto nuevo
export async function agregarProducto(producto) {
  const productos = await getProductos();
  const nuevo = {
    ...producto,
    id: Date.now().toString(), // ID único basado en tiempo
    creadoEn: new Date().toISOString(),
  };
  productos.push(nuevo);
  await saveProductos(productos);
  return nuevo;
}

// Actualizar un producto existente
export async function actualizarProducto(id, cambios) {
  const productos = await getProductos();
  const index = productos.findIndex(p => p.id === id);
  if (index !== -1) {
    productos[index] = { ...productos[index], ...cambios };
    await saveProductos(productos);
  }
}

// Eliminar un producto
export async function eliminarProducto(id) {
  const productos = await getProductos();
  const filtrados = productos.filter(p => p.id !== id);
  await saveProductos(filtrados);
}

// ---- VENTAS ----

// Obtener todas las ventas
export async function getVentas() {
  try {
    const data = await AsyncStorage.getItem(KEYS.ventas);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// Registrar una venta nueva
export async function registrarVenta(venta) {
  const ventas = await getVentas();
  const nueva = {
    ...venta,
    id: Date.now().toString(),
    fecha: new Date().toISOString(),
  };
  ventas.push(nueva);
  await AsyncStorage.setItem(KEYS.ventas, JSON.stringify(ventas));
  return nueva;
}