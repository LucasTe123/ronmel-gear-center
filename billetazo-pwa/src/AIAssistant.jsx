// ============================================
// AIAssistant.jsx — Asistente IA con OpenRouter/Gemini
// Botón flotante en toda la app
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './Toast';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import {
  venderProducto,
  sumarStockProducto,
  agregarNuevoProducto,
  eliminarProducto,
  subscribeProductos,
  getVentasHoy,
  getVentasMes,
  getResumenVentas,
} from './firestore';
import { collection as col, addDoc, serverTimestamp } from 'firebase/firestore';

const OR_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';

function fmt(n) {
  return Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function cargarContexto(uid) {
  const [prodsSnap, ventasSnap, finSnap] = await Promise.all([
    getDocs(query(collection(db, 'users', uid, 'productos'))),
    getDocs(query(collection(db, 'users', uid, 'ventas'), orderBy('fecha', 'desc'))),
    getDocs(query(collection(db, 'users', uid, 'finanzas'), orderBy('fecha', 'desc'))),
  ]);

  const productos = prodsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const ventas    = ventasSnap.docs.map(d => ({
    id: d.id, ...d.data(),
    fecha: d.data().fecha?.toDate?.()?.toISOString() || new Date().toISOString(),
  }));
  const finanzas  = finSnap.docs.map(d => ({
    id: d.id, ...d.data(),
    fecha: d.data().fecha?.toDate?.()?.toISOString() || new Date().toISOString(),
  }));

  const ventasHoy = getVentasHoy(ventas);
  const ventasMes = getVentasMes ? getVentasMes(ventas) : ventas;
  const resVentas = getResumenVentas(ventas);
  const ingresos  = finanzas.filter(f => f.tipo === 'ingreso').reduce((a, f) => a + f.monto, 0);
  const gastos    = finanzas.filter(f => f.tipo === 'gasto').reduce((a, f) => a + f.monto, 0);
  return { productos, ventas, ventasHoy, resVentas, finanzas, ingresos, gastos };
}

function buildSystemPrompt(ctx, userName) {
  const { productos, ventasHoy, resVentas, ingresos, gastos } = ctx;
  const bajosStock = productos.filter(p => p.cantidad <= 3);
  const sinStock = productos.filter(p => p.cantidad === 0);
  
  const topVentas = ctx.ventas.reduce((acc, v) => {
    acc[v.nombreProducto] = (acc[v.nombreProducto] || 0) + v.cantidad;
    return acc;
  }, {});
  const topProductos = Object.keys(topVentas).sort((a, b) => topVentas[b] - topVentas[a]).slice(0, 3);

  return `Sos Billetazo IA, asistente experto en finanzas de ${userName || 'el usuario'}. Español rioplatense.

INVENTARIO: ${productos.map(p => `[${p.id}] ${p.nombre} (Bs${p.precioVenta})`).join(', ') || 'Sin productos'}
MÉTRICAS: Hoy ${ventasHoy.length} ventas (+Bs${fmt(resVentas.gananciaHoy)}). Balance: Bs${fmt(ingresos - gastos)}.
ALERTAS: Agotados: ${sinStock.map(p => p.nombre).join(', ') || '0'}. Bajos: ${bajosStock.map(p => p.nombre).join(', ') || '0'}

REGLAS CRÍTICAS PARA ENTENDER TEXTO:
1. El usuario escribirá textos largos como "hoy fui al super y compre 3 latas de atun por 50".
2. DEBES EXTRAER SÓLO LO IMPORTANTE para la 'descripcion'. Ejemplo: "3 latas de atun". NUNCA guardes "hoy fui y compre...".
3. Identifica si es un GASTO (ADD_EXPENSE) o un INGRESO (ADD_INCOME) y el 'monto'.
4. Asigna una 'categoria' estricta: Alimentación, Salud y Cuidado, Ropa y Accesorios, Hogar y Servicios, Transporte, Educación y Trabajo, Entretenimiento, Ingresos.

Si te piden acciones, responde SÓLO este JSON (sin formato Markdown, sin texto extra):
{"action":"NOMBRE","params":{"descripcion":"resumen conciso","monto":100,"categoria":"Alimentación"},"message":"✅ Gasto registrado."}

ACCIONES:
SELL_PRODUCT({productId,qty}), ADD_PRODUCT({nombre,precioCompra,precioVenta,cantidad}),
ADD_INCOME({descripcion,monto,categoria}), ADD_EXPENSE({descripcion,monto,categoria})`;
}

async function ejecutarAccion(uid, action, params, productos) {
  switch (action) {
    case 'SELL_PRODUCT': {
      const res = await venderProducto(uid, params.productId, params.qty, productos);
      return res.exito
        ? `✅ Venta: ${params.qty}x — Total Bs ${fmt(res.venta?.total)} — Ganancia Bs ${fmt(res.venta?.ganancia)}`
        : `❌ ${res.mensaje}`;
    }
    case 'ADD_PRODUCT':
      await agregarNuevoProducto(uid, params);
      return `✅ Producto "${params.nombre}" agregado.`;
    case 'DELETE_PRODUCT':
      await eliminarProducto(uid, params.productId);
      return `✅ Producto eliminado.`;
    case 'RESTOCK': {
      await sumarStockProducto(uid, params.productId, params.qty, productos);
      return `✅ +${params.qty} unidades al stock.`;
    }
    case 'ADD_INCOME':
      await addDoc(col(db, 'users', uid, 'finanzas'), {
        tipo: 'ingreso', descripcion: params.descripcion,
        monto: parseFloat(params.monto) || 0,
        categoria: params.categoria || 'Otro', fecha: serverTimestamp(),
      });
      return `✅ Ingreso Bs ${fmt(params.monto)} registrado.`;
    case 'ADD_EXPENSE':
      await addDoc(col(db, 'users', uid, 'finanzas'), {
        tipo: 'gasto', descripcion: params.descripcion,
        monto: parseFloat(params.monto) || 0,
        categoria: params.categoria || 'Otro', fecha: serverTimestamp(),
      });
      return `✅ Gasto Bs ${fmt(params.monto)} registrado.`;
    default: return '❓ Acción desconocida.';
  }
}

export default function AIAssistant() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [open, setOpen]        = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '¡Hola! Preguntame lo que quieras sobre tu negocio, o pedime que haga algo.' }
  ]);
  const [input, setInput]      = useState('');
  const [loading, setLoading]  = useState(false);
  const [productos, setProductos] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!uid) return;
    let unsub;
    import('./firestore').then(m => { unsub = m.subscribeProductos(uid, setProductos); });
    return () => unsub?.();
  }, [uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage() {
    const texto = input.trim();
    if (!texto || loading) return;
    setMessages(m => [...m, { role: 'user', text: texto }]);
    setInput('');
    setLoading(true);

    if (!OR_KEY) {
      setMessages(m => [...m, { role: 'assistant', text: '⚠️ Configurá VITE_OPENROUTER_KEY en .env.local' }]);
      setLoading(false);
      return;
    }

    try {
      const ctx = await cargarContexto(uid);
      const systemPrompt = buildSystemPrompt(ctx, user?.displayName);

      const history = messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      // ── OpenRouter → Gemini 2.0 Flash ─────────────────────────────────
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OR_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Billetazo',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
            { role: 'user', content: texto },
          ],
          max_tokens: 500,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);
      const rawResponse = json.choices?.[0]?.message?.content?.trim() || 'Sin respuesta.';

      let finalText = rawResponse;
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.action && parsed.params) {
            const result = await ejecutarAccion(uid, parsed.action, parsed.params, ctx.productos);
            finalText = `${parsed.message || ''}\n\n${result}`.trim();
          }
        } catch (_) {}
      }
      setMessages(m => [...m, { role: 'assistant', text: finalText }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', text: `❌ Error de IA: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  const SUGGESTIONS = ['¿Cuánto vendí hoy?', '¿Qué productos casi no tengo?', '¿Cuál es mi balance?'];

  return (
    <>
      {/* Botón flotante */}
      <button
        className="fab-ai"
        onClick={() => setOpen(o => !o)}
        title="Asistente IA"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Panel */}
      {open && (
        <div className="ai-panel">
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,rgba(110,64,201,0.2),rgba(10,132,255,0.1))' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6e40c9,#0a84ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Billetazo IA</div>
            </div>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '9px 12px', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? 'var(--accent-blue)' : '#33333d',
                  color: '#fff',
                }}>{m.text}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 5, paddingLeft: 4 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.2s ${i*0.2}s infinite` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugerencias */}
          {messages.length === 1 && (
            <div style={{ padding: '0 10px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setInput(s)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
            <input
              style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '9px 12px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }}
              placeholder="Preguntá o pedí algo..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
            <button
              onClick={sendMessage} disabled={loading || !input.trim()}
              style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: input.trim() ? 'var(--accent-blue)' : '#33333d', color: '#fff', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
    </>
  );
}
