// ================================================================
// ShortcutSync.jsx
// Componente invisible que:
//  1. Sincroniza un cache público en Firestore (shortcut_cache)
//     para que la función de Netlify pueda leer los datos sin auth
//  2. Escucha acciones pendientes del Atajo y las ejecuta
// ================================================================

import { useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  collection, doc, setDoc, onSnapshot, deleteDoc,
  query, serverTimestamp, getDocs, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { subscribeProductos, subscribeVentas, venderProducto, sumarStockProducto } from './firestore';
import { collection as col, addDoc } from 'firebase/firestore';

const SIRI_TOKEN = import.meta.env.VITE_SIRI_TOKEN || 'billetazo-siri-token-2025';

function fmt2(n) { return Number(n || 0).toFixed(2); }

// ── Construir objeto cache con todos los datos relevantes ─────────────────
function buildCache(productos, ventas, finanzas) {
  const ahora  = new Date();
  const hoy    = ahora.toDateString();
  const ayer   = new Date(ahora - 86400000).toDateString();
  const mes    = ahora.getMonth();
  const anio   = ahora.getFullYear();

  const ventasHoy  = ventas.filter(v => new Date(v.fecha).toDateString() === hoy);
  const ventasAyer = ventas.filter(v => new Date(v.fecha).toDateString() === ayer);
  const ventasMes  = ventas.filter(v => {
    const f = new Date(v.fecha);
    return f.getMonth() === mes && f.getFullYear() === anio;
  });

  const gananciaHoy  = ventasHoy.reduce((a, v) => a + (v.ganancia || 0), 0);
  const gananciaAyer = ventasAyer.reduce((a, v) => a + (v.ganancia || 0), 0);
  const gananciaMes  = ventasMes.reduce((a, v) => a + (v.ganancia || 0), 0);

  // Producto más vendido hoy
  const conteo = {};
  ventasHoy.forEach(v => { conteo[v.nombreProducto] = (conteo[v.nombreProducto] || 0) + v.cantidad; });
  const topProductoHoy = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  const ingresos = finanzas.filter(f => f.tipo === 'ingreso').reduce((a, f) => a + f.monto, 0);
  const gastos   = finanzas.filter(f => f.tipo === 'gasto').reduce((a, f) => a + f.monto, 0);

  return {
    token: SIRI_TOKEN,
    updatedAt: new Date().toISOString(),
    cantidadHoy:    ventasHoy.length,
    gananciaHoy:    parseFloat(fmt2(gananciaHoy)),
    gananciaAyer:   parseFloat(fmt2(gananciaAyer)),
    gananciaMes:    parseFloat(fmt2(gananciaMes)),
    ingresos:       parseFloat(fmt2(ingresos)),
    gastos:         parseFloat(fmt2(gastos)),
    topProductoHoy,
    productos: productos.map(p => ({
      id:           p.id,
      nombre:       p.nombre,
      cantidad:     p.cantidad,
      precioVenta:  p.precioVenta,
      precioCompra: p.precioCompra,
    })),
  };
}

export default function ShortcutSync() {
  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    let productos = [];
    let ventas    = [];
    let finanzas  = [];

    // Función para re-sincronizar el cache
    async function sync() {
      try {
        const cache = buildCache(productos, ventas, finanzas);
        await setDoc(doc(db, 'shortcut_cache', uid), cache);
      } catch (e) {
        console.warn('ShortcutSync: error al sincronizar cache', e);
      }
    }

    // Suscribirse a productos, ventas y finanzas
    const unsubP = subscribeProductos(uid, p => { productos = p; sync(); });
    const unsubV = subscribeVentas(uid, v => { ventas = v; sync(); });

    // Suscribirse a finanzas
    const finRef = collection(db, 'users', uid, 'finanzas');
    const unsubF = onSnapshot(query(finRef, orderBy('fecha', 'desc')), snap => {
      finanzas = snap.docs.map(d => ({
        id: d.id, ...d.data(),
        fecha: d.data().fecha?.toDate?.()?.toISOString() || new Date().toISOString(),
      }));
      sync();
    });

    // ── Escuchar acciones pendientes del Atajo ─────────────────────────
    const pendingRef = collection(db, 'shortcut_actions', uid, 'pending');
    const unsubA = onSnapshot(pendingRef, async snap => {
      for (const docSnap of snap.docs) {
        const action = docSnap.data();
        if (action.status !== 'pending') continue;
        if (action.token !== SIRI_TOKEN) { await deleteDoc(docSnap.ref); continue; }

        let params;
        try { params = typeof action.params === 'string' ? JSON.parse(action.params) : action.params; }
        catch { await deleteDoc(docSnap.ref); continue; }

        // Ejecutar acción
        try {
          switch (action.action) {
            case 'SELL_PRODUCT':
              await venderProducto(uid, params.productId, params.qty, productos);
              break;
            case 'RESTOCK':
              await sumarStockProducto(uid, params.productId, params.qty, productos);
              break;
            case 'ADD_EXPENSE':
              await addDoc(col(db, 'users', uid, 'finanzas'), {
                tipo: 'gasto', descripcion: params.descripcion,
                monto: parseFloat(params.monto) || 0,
                categoria: params.categoria || 'Otro',
                fecha: serverTimestamp(),
              });
              break;
            case 'ADD_INCOME':
              await addDoc(col(db, 'users', uid, 'finanzas'), {
                tipo: 'ingreso', descripcion: params.descripcion,
                monto: parseFloat(params.monto) || 0,
                categoria: params.categoria || 'Otro',
                fecha: serverTimestamp(),
              });
              break;
            default:
              break;
          }
        } catch (e) {
          console.warn('ShortcutSync: error al ejecutar acción', e);
        }
        // Eliminar acción procesada
        await deleteDoc(docSnap.ref);
      }
    });

    return () => { unsubP(); unsubV(); unsubF(); unsubA(); };
  }, [uid]);

  return null; // componente invisible
}
