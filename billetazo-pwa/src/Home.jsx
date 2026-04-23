// ============================================
// HOME.JSX - Dashboard Redesign with Charts & Calendar
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from './Toast';
import { Package, Plus, ArrowUpRight } from 'lucide-react';
import {
  subscribeProductos, subscribeVentas,
  getResumenInventario, getResumenVentas,
  venderProducto,
} from './firestore';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

function getSaludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function fmt(n) {
  return Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---- ANIMATED NUMBER (SLOT MACHINE EFFECT) ----
function AnimatedNumber({ value, prefix = '' }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 1200; 
    const startValue = displayValue;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + (value - startValue) * easeOut;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };
    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{prefix}{fmt(displayValue)}</span>;
}

export default function Home() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const uid = user.uid;

  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [productoSel, setProductoSel] = useState(null);
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    const unsubP = subscribeProductos(uid, setProductos);
    const unsubV = subscribeVentas(uid, setVentas);
    return () => { unsubP(); unsubV(); };
  }, [uid]);

  const resInv = getResumenInventario(productos);
  const resVentas = getResumenVentas(ventas);

  function abrirModal(p) {
    setProductoSel(p);
    setCantidad(1);
    setModalVisible(true);
  }

  function cerrarModal() {
    setModalVisible(false);
    setProductoSel(null);
    setCantidad(1);
  }

  async function confirmarVenta() {
    if (!productoSel) return;
    if (cantidad < 1) { toast('Cantidad inválida', 'error'); return; }

    const resultado = await venderProducto(uid, productoSel.id, cantidad, productos);
    if (!resultado.exito) {
      toast(resultado.mensaje, 'error');
      return;
    }

    cerrarModal();
    toast(`¡Venta registrada! +Bs ${fmt(productoSel.precioVenta * cantidad)}`);
  }

  // --- CALENDAR LOGIC ---
  const today = new Date();
  const currentMonthName = today.toLocaleString('es-BO', { month: 'long' });
  
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  
  const calendarDays = [];
  for (let i = 0; i < startOffset; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const salesDays = new Set(ventas.map(v => new Date(v.fecha).getDate()));

  // --- CHART DATA (DONUT) ---
  // Agrupar ventas por producto
  const ventasPorProd = {};
  ventas.forEach(v => {
    if (!ventasPorProd[v.nombreProducto]) ventasPorProd[v.nombreProducto] = 0;
    ventasPorProd[v.nombreProducto] += v.ganancia;
  });
  const chartData = Object.keys(ventasPorProd).map(key => ({
    name: key,
    value: ventasPorProd[key]
  })).sort((a,b) => b.value - a.value).slice(0, 5); // Top 5
  if(chartData.length === 0) {
    chartData.push({ name: 'Sin Ventas', value: 1 });
  }

  const COLORS = ['#d4ff36', '#4d6bf5', '#9d4edd', '#30d158', '#ff9f0a'];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="header-left">
          <p className="page-greeting">{getSaludo()}, {user.displayName || user.email?.split('@')[0]}!</p>
          <h1 className="page-title">¿Listo para las ventas de hoy?</h1>
        </div>
        <div className="header-right">
          <button className="btn btn-lime" onClick={() => setModalVisible(true)}>
            <Plus size={20} /> Venta Rápida
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* GRAPH & METRICS (Left side) */}
        <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Main Chart */}
          <div className="card" style={{ paddingBottom: 16 }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Ventas por Producto (Top 5)</span>
              <span style={{ fontSize: 13, background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 12 }}>Ganancia</span>
            </div>
            <div style={{ height: 200, width: '100%', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartData.length === 1 && entry.name === 'Sin Ventas' ? 'var(--border-color)' : COLORS[index % COLORS.length]} 
                            style={{ filter: `drop-shadow(0px 4px 10px ${COLORS[index % COLORS.length]}40)` }}/>
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value) => `Bs ${fmt(value)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                 <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{chartData.length === 1 && chartData[0].name === 'Sin Ventas' ? '0' : chartData.length}</div>
                 <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Items</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
               <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Ventas Hoy</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    <AnimatedNumber value={resVentas.cantidadHoy} />
                  </div>
               </div>
               <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Ganancia Hoy</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-success)', fontFamily: 'monospace' }}>
                    <AnimatedNumber value={resVentas.gananciaHoy} prefix="+Bs " />
                  </div>
               </div>
               <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Ganancia Mes</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-blue-light)', fontFamily: 'monospace' }}>
                    <AnimatedNumber value={resVentas.gananciaMes} prefix="Bs " />
                  </div>
               </div>
            </div>
          </div>

          {/* Inventario Resumen */}
          <div className="card">
            <div className="card-title">Inventario Actual</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div className="metric-group">
                <span className="metric-label">Total Productos</span>
                <span className="metric-value" style={{ fontFamily: 'monospace' }}><AnimatedNumber value={resInv.totalProductos} /></span>
                <span className="metric-sub" style={{ color: 'var(--status-success)' }}>Items en stock</span>
              </div>
              <div className="metric-group">
                <span className="metric-label">Capital Invertido</span>
                <span className="metric-value" style={{ fontSize: 24, fontFamily: 'monospace' }}><AnimatedNumber value={resInv.totalInvertido} prefix="Bs " /></span>
              </div>
              <div className="metric-group">
                <span className="metric-label">Ganancia Potencial</span>
                <span className="metric-value" style={{ fontSize: 24, color: 'var(--accent-lime)', fontFamily: 'monospace' }}><AnimatedNumber value={resInv.totalGanancia} prefix="+Bs " /></span>
              </div>
            </div>
          </div>
        </div>

        {/* CALENDAR & LIST (Right side) */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Calendar */}
          <div className="card" style={{ background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' }}>
             <div className="calendar-widget">
               <div className="calendar-header">
                 <span>Días de Actividad</span>
                 <span style={{ textTransform: 'capitalize' }}>{currentMonthName}</span>
               </div>
               <div className="calendar-grid">
                 {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                   <div key={i} className="calendar-day-name">{d}</div>
                 ))}
                 {calendarDays.map((day, i) => {
                    if (!day) return <div key={i} className="calendar-day empty" />;
                    const isToday = day === today.getDate();
                    const hasData = salesDays.has(day) && !isToday;
                    return (
                      <div key={i} className={`calendar-day ${isToday ? 'active' : ''} ${hasData ? 'has-data' : ''}`}>
                        {day}
                      </div>
                    );
                 })}
               </div>
             </div>
          </div>

          {/* Accesos directos / Productos */}
          <div className="card" style={{ flex: 1 }}>
             <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
               Tus Productos
               <span style={{ fontSize: 13, color: 'var(--accent-blue)', cursor: 'pointer' }} onClick={() => navigate('/inventario')}>Ver todo</span>
             </div>
             <div className="list-container">
               {productos.slice(0, 3).map(p => (
                 <div key={p.id} className="list-row" onClick={() => abrirModal(p)} style={{ padding: '12px' }}>
                    <div className="row-icon-box" style={{ width: 40, height: 40 }}>
                      <Package size={18} />
                    </div>
                    <div className="row-content">
                      <div className="row-title" style={{ fontSize: 14 }}>{p.nombre}</div>
                      <div className="row-subtitle" style={{ fontSize: 12 }}>Bs {p.precioVenta} c/u</div>
                    </div>
                    <div className="row-action" style={{ color: 'var(--accent-blue)' }}>
                      <ArrowUpRight size={18} />
                    </div>
                 </div>
               ))}
               {productos.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No hay productos.</div>
               )}
             </div>
          </div>
        </div>

      </div>

      {/* FAB para móvil */}
      <button className="fab" onClick={() => setModalVisible(true)} style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}>
        <Plus size={28} />
      </button>

      {/* MODAL VENTA */}
      {modalVisible && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Registrar Venta</span>
              <button className="modal-close" onClick={cerrarModal}>✕</button>
            </div>
            <div className="modal-body">
              {productoSel ? (
                <>
                  <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{productoSel.nombre}</h3>
                  <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 24 }}>Bs {productoSel.precioVenta} c/u</p>

                  <p className="form-label">Cantidad</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, margin: '24px 0' }}>
                    <button className="btn-icon" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} onClick={() => setCantidad(c => Math.max(1, c - 1))}>−</button>
                    <span style={{ fontSize: 40, fontWeight: 700, color: 'var(--text-primary)', minWidth: 60, textAlign: 'center' }}>{cantidad}</span>
                    <button className="btn-icon" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} onClick={() => setCantidad(c => Math.min(productoSel.cantidad, c + 1))}>+</button>
                  </div>

                  <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--accent-lime)', textAlign: 'center', marginBottom: 24 }}>
                    Total: Bs {fmt(productoSel.precioVenta * cantidad)}
                  </p>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setProductoSel(null); setCantidad(1); }}>
                      Volver
                    </button>
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={confirmarVenta}>
                      Confirmar
                    </button>
                  </div>
                </>
              ) : (
                <div className="list-container" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                  {productos.map(p => (
                    <div key={p.id} className="list-row" onClick={() => abrirModal(p)} style={{ cursor: 'pointer' }}>
                      <div className="row-content">
                        <div className="row-title">{p.nombre}</div>
                        <div className="row-subtitle">Bs {p.precioVenta} c/u</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: p.cantidad <= 2 ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
                        {p.cantidad} en stock
                      </div>
                    </div>
                  ))}
                  {productos.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Agregá productos en Inventario.</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
