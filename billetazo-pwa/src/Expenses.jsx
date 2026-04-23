// ============================================
// EXPENSES.JSX - Finanzas con Gráficos Avanzados
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './Toast';
import { ArrowDownRight, ArrowUpRight, Trash2, TrendingUp, TrendingDown, ShoppingCart, HeartPulse, Shirt, Home as HomeIcon, Car, BookOpen, Gamepad2, Wallet, Box, Plus } from 'lucide-react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

function fmt(n) {
  return Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      
      // Ease-out expo for slot machine feel
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

// ---- LOGICA DE CATEGORIZACION AUTOMATICA ----
const CATEGORY_MAP = [
  { id: 'Alimentación', icon: ShoppingCart, color: '#ff9f0a', keywords: ['comida','súper','super','mercado','carne','pollo','arroz','fideo','leche','pan','galleta','agua','almuerzo','cena','desayuno','pizza','bebida'] },
  { id: 'Salud y Cuidado', icon: HeartPulse, color: '#ff453a', keywords: ['farmacia','remedio','pastilla','médico','doctor','hospital','dentista','jabón','shampoo','pasta','cosmética','crema','perfume','salud'] },
  { id: 'Ropa y Accesorios', icon: Shirt, color: '#bf5af2', keywords: ['ropa','zapato','pantalón','camisa','zapatilla','tenis','vestido','abrigo','joya','reloj','lente','gorra'] },
  { id: 'Hogar y Servicios', icon: HomeIcon, color: '#0a84ff', keywords: ['luz','agua','gas','internet','wifi','alquiler','limpieza','casa','mueble','ferretería','herramienta','reparación','servicios'] },
  { id: 'Transporte', icon: Car, color: '#30d158', keywords: ['pasaje','taxi','uber','gasolina','peaje','bus','transporte','micro','trufi','auto','moto','mecánico'] },
  { id: 'Educación y Trabajo', icon: BookOpen, color: '#5e5ce6', keywords: ['colegio','universidad','curso','libro','cuaderno','lápiz','oficina','impresión','stock','proveedor','mercadería'] },
  { id: 'Entretenimiento', icon: Gamepad2, color: '#ff375f', keywords: ['cine','netflix','spotify','juego','fiesta','salir','bar','cerveza','trago','suscripción','juguete','regalo'] },
  { id: 'Ingresos', icon: Wallet, color: '#30d158', keywords: ['sueldo','venta','cobro','pago','premio','inversión','transferencia','depósito'] }
];

function categorizarMovimiento(descripcion, tipo) {
  const text = descripcion.toLowerCase();
  if (tipo === 'ingreso') return 'Ingresos';
  for (const cat of CATEGORY_MAP) {
    if (cat.id === 'Ingresos') continue;
    for (const kw of cat.keywords) {
      if (text.includes(kw)) return cat.id;
    }
  }
  return 'Otros';
}

function getCategoryData(catId) {
  const exact = CATEGORY_MAP.find(c => c.id === catId);
  if (exact) return exact;
  const lowerCat = String(catId).toLowerCase();
  for (const cat of CATEGORY_MAP) {
    if (lowerCat.includes(cat.id.toLowerCase())) return cat;
    for (const kw of cat.keywords) {
      if (lowerCat.includes(kw)) return cat;
    }
  }
  return { id: 'Otros', icon: Box, color: '#8e8e93' };
}

export default function Expenses() {
  const { user } = useAuth();
  const toast = useToast();
  const uid = user.uid;

  const [movimientos, setMovimientos] = useState([]);
  const [modal, setModal] = useState(false);
  const [tipoForm, setTipoForm] = useState('gasto');
  const [form, setForm] = useState({ descripcion: '', monto: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const finanzasRef = () => collection(db, 'users', uid, 'finanzas');

  useEffect(() => {
    const q = query(finanzasRef(), orderBy('fecha', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setMovimientos(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        fecha: d.data().fecha?.toDate?.()?.toISOString() || new Date().toISOString(),
      })));
    });
    return unsub;
  }, [uid]);

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0);
  const totalGastos   = movimientos.filter(m => m.tipo === 'gasto').reduce((a, m) => a + m.monto, 0);
  const balance       = totalIngresos - totalGastos;

  function abrirModal(tipo) {
    setTipoForm(tipo);
    setForm({ descripcion: '', monto: '' });
    setModal(true);
  }

  async function guardar() {
    if (!form.descripcion || !form.monto) { toast('Completá la descripción y el monto', 'error'); return; }
    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) { toast('Ingresá un monto válido mayor a 0', 'error'); return; }
    
    const categoriaAsignada = categorizarMovimiento(form.descripcion, tipoForm);
    await addDoc(finanzasRef(), {
      tipo: tipoForm, descripcion: form.descripcion, monto, categoria: categoriaAsignada, fecha: serverTimestamp(),
    });
    setModal(false);
    toast(`${tipoForm === 'gasto' ? 'Gasto' : 'Ingreso'} registrado`);
  }

  async function eliminarConfirmado() {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'finanzas', deleteTarget.id));
      toast('Registro eliminado');
    } catch(err) { toast('Error al eliminar: ' + err.message, 'error'); } 
    finally { setDeleteTarget(null); }
  }

  // CALENDAR DATA
  const today = new Date();
  const currentMonthName = today.toLocaleString('es-BO', { month: 'long' });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const calendarDays = [];
  for (let i = 0; i < startOffset; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
  const recordDays = new Set(movimientos.map(m => new Date(m.fecha).getDate()));

  // DONUT DATA
  const gastosPorCategoria = {};
  movimientos.filter(m => m.tipo === 'gasto').forEach(m => {
    const catFinal = getCategoryData(m.categoria).id;
    if (!gastosPorCategoria[catFinal]) gastosPorCategoria[catFinal] = 0;
    gastosPorCategoria[catFinal] += m.monto;
  });
  const chartDataDonut = Object.keys(gastosPorCategoria).map(key => ({
    name: key, value: gastosPorCategoria[key], color: getCategoryData(key).color
  })).sort((a,b) => b.value - a.value).slice(0, 5);
  if(chartDataDonut.length === 0) chartDataDonut.push({ name: 'Sin Gastos', value: 1, color: 'var(--border-color)' });

  // BAR CHART DATA
  const barData = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString('es-BO', { weekday: 'short' });
    const dayMovs = movimientos.filter(m => new Date(m.fecha).toDateString() === d.toDateString());
    let inDia = 0, outDia = 0;
    dayMovs.forEach(m => m.tipo === 'ingreso' ? inDia += m.monto : outDia += m.monto);
    barData.push({ name: dayStr, Income: inDia, Spend: outDia });
  }

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="header-left">
          <h1 className="page-title" style={{ fontSize: 32 }}>Finanzas Inteligentes</h1>
          <p className="page-greeting" style={{ fontSize: 16 }}>Controla tu flujo de caja</p>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* ACTION BUTTONS & METRICS (Left Side) */}
        <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* ACTION BUTTONS (Muted Aesthetic) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
             {/* Botón Ingreso (Estilo Blue Card) */}
             <div 
               onClick={() => abrirModal('ingreso')}
               style={{ 
                 background: 'var(--accent-blue)', 
                 borderRadius: 16, padding: '16px 20px', cursor: 'pointer', 
                 display: 'flex', flexDirection: 'column', gap: 12,
                 color: '#fff', transition: 'transform 0.2s', border: '1px solid rgba(255,255,255,0.05)',
                 boxShadow: '0 8px 24px rgba(77,107,245,0.25)'
               }}
               onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
               onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
             >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: -8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUp size={16} strokeWidth={3} />
                    </div>
                  </div>
                  <ArrowUpRight size={16} opacity={0.7} />
                </div>
                <div>
                   <div style={{ fontSize: 16, fontWeight: 600 }}>Nuevo Ingreso</div>
                   <div style={{ fontSize: 12, opacity: 0.8 }}>Añadir ganancia</div>
                </div>
             </div>

             {/* Botón Gasto (Estilo Dashed Card) */}
             <div 
               onClick={() => abrirModal('gasto')}
               style={{ 
                 background: 'transparent', 
                 borderRadius: 16, padding: '16px 20px', cursor: 'pointer', 
                 display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                 color: 'var(--text-secondary)', transition: 'all 0.2s', 
                 border: '1.5px dashed var(--border-color)',
               }}
               onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
               onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
             >
                <Plus size={24} opacity={0.6} />
                <div style={{ fontSize: 14, fontWeight: 500 }}>Registrar Gasto</div>
             </div>
          </div>

          {/* MAIN BALANCE METRICS */}
          <div className="card" style={{ 
               display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
               background: balance >= 0 ? 'rgba(48,209,88,0.05)' : 'rgba(255,69,58,0.05)',
               border: `1px solid ${balance >= 0 ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)'}`
            }}>
               <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ingresos Totales</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--status-success)', fontFamily: 'monospace' }}>
                    <AnimatedNumber value={totalIngresos} prefix="Bs " />
                  </div>
               </div>
               <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Gastos Totales</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--status-danger)', fontFamily: 'monospace' }}>
                    <AnimatedNumber value={totalGastos} prefix="Bs " />
                  </div>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Balance Neto</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: balance >= 0 ? 'var(--status-success)' : 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace' }}>
                    {balance >= 0 ? '+' : ''}<AnimatedNumber value={balance} prefix="Bs " />
                  </div>
               </div>
          </div>

          {/* DONUT CHART */}
          <div className="card" style={{ paddingBottom: 16 }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Gastos por Categoría</span>
            </div>
            <div style={{ height: 200, width: '100%', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartDataDonut} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                    {chartDataDonut.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 4px 10px ${entry.color}40)` }}/>
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: '#fff' }}
                    itemStyle={{ color: '#fff' }} formatter={(value) => `Bs ${fmt(value)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* HISTORIAL */}
          <div className="card" style={{ flex: 1 }}>
             <div className="card-title">Últimos Movimientos</div>
             {movimientos.length === 0 ? (
               <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Aún no hay registros.</div>
             ) : (
               <div className="list-container">
                 {movimientos.slice(0, 6).map(m => {
                   const esIngreso = m.tipo === 'ingreso';
                   const catData = getCategoryData(m.categoria);
                   const IconC = catData.icon;
                   
                   return (
                     <div key={m.id} className="list-row" style={{ borderColor: esIngreso ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)' }}>
                       <div className="row-icon-box" style={{ background: `${catData.color}20`, color: catData.color }}>
                         <IconC size={20} />
                       </div>
                       <div className="row-content">
                         <div className="row-title" style={{ textTransform: 'capitalize' }}>{m.descripcion}</div>
                         <div className="row-subtitle">
                           <span style={{ color: catData.color, fontWeight: 500 }}>{m.categoria}</span>
                         </div>
                       </div>
                       <div className="row-action" style={{ color: esIngreso ? 'var(--status-success)' : 'var(--status-danger)', marginRight: 16, fontWeight: 700, fontFamily: 'monospace' }}>
                         {esIngreso ? '+' : '-'}Bs {fmt(m.monto)}
                       </div>
                       <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8 }}>
                         <Trash2 size={18} />
                       </button>
                     </div>
                   );
                 })}
               </div>
             )}
          </div>
        </div>

        {/* RIGHT SIDE (CALENDAR & BAR CHART) */}
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* CALENDAR */}
          <div className="card" style={{ background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' }}>
             <div className="calendar-widget">
               <div className="calendar-header">
                 <span>Días de Actividad</span>
                 <span style={{ textTransform: 'capitalize' }}>{currentMonthName}</span>
               </div>
               <div className="calendar-grid">
                 {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => ( <div key={i} className="calendar-day-name">{d}</div> ))}
                 {calendarDays.map((day, i) => {
                    if (!day) return <div key={i} className="calendar-day empty" />;
                    const isToday = day === today.getDate();
                    const hasData = recordDays.has(day) && !isToday;
                    return (
                      <div key={i} className={`calendar-day ${isToday ? 'active' : ''} ${hasData ? 'has-data' : ''}`}>{day}</div>
                    );
                 })}
               </div>
             </div>
          </div>

          {/* BAR CHART */}
          <div className="card" style={{ flex: 1 }}>
             <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Flujo de Caja</span>
                <span style={{ fontSize: 12, background: 'var(--bg-base)', padding: '4px 8px', borderRadius: 8 }}>5 días</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ingresos</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    <AnimatedNumber value={barData.reduce((a, b) => a + b.Income, 0)} prefix="Bs " />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Gastos</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    <AnimatedNumber value={barData.reduce((a, b) => a + b.Spend, 0)} prefix="Bs " />
                  </div>
                </div>
             </div>
             <div style={{ height: 220, width: '100%', marginTop: 'auto' }}>
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={barData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                   <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--bg-base)', border: 'none', borderRadius: 8, color: '#fff', boxShadow: 'var(--shadow-lg)' }} />
                   <Bar dataKey="Income" fill="#a0bfff" radius={[4, 4, 0, 0]} barSize={16} />
                   <Bar dataKey="Spend" fill="var(--accent-lime)" radius={[4, 4, 0, 0]} barSize={16} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center', padding: 32 }}>
            <Trash2 size={48} color="var(--status-danger)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>¿Eliminar registro?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Se eliminará permanentemente: "{deleteTarget.descripcion}"</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1, background: 'var(--status-danger)' }} onClick={eliminarConfirmado}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{tipoForm === 'ingreso' ? 'Nuevo Ingreso' : 'Nuevo Gasto'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input className="form-input" placeholder="Ej: Sueldo, Venta, Comida..." value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Monto (Bs)</label>
                <input className="form-input" type="number" min="0" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />
              </div>
              <button className="btn btn-full" style={{ marginTop: 16, background: tipoForm === 'ingreso' ? 'var(--status-success)' : 'var(--status-danger)', color: '#fff', fontSize: 16, padding: 16 }} onClick={guardar}>
                Registrar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
