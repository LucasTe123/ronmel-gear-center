// ============================================
// SALES.JSX - Historial de ventas Redesign
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './Toast';
import { Trash2, Activity } from 'lucide-react';
import { subscribeVentas, getVentasHoy, getResumenVentas, eliminarVenta } from './firestore';

function fmt(n) {
  return Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Sales() {
  const { user } = useAuth();
  const toast = useToast();
  const uid = user.uid;

  const [ventas, setVentas] = useState([]);

  useEffect(() => {
    const unsub = subscribeVentas(uid, setVentas);
    return unsub;
  }, [uid]);

  const ventasHoy = getVentasHoy(ventas);
  const resumen = getResumenVentas(ventas);

  const [deleteTarget, setDeleteTarget] = useState(null);

  async function borrarVentaConfirmado() {
    if (!deleteTarget) return;
    try {
      await eliminarVenta(uid, deleteTarget.id);
      toast('Venta eliminada');
    } catch(err) {
      toast('Error al eliminar: ' + err.message, 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="header-left">
          <p className="page-greeting">Historial y Métricas</p>
          <h1 className="page-title">Tus Ventas</h1>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* Métricas Top */}
        <div className="card col-span-4" style={{ background: 'var(--accent-blue)' }}>
          <div className="card-title" style={{ color: 'rgba(255,255,255,0.8)' }}>Ventas de Hoy</div>
          <div className="metric-group" style={{ marginTop: 'auto' }}>
            <span className="metric-value" style={{ fontSize: 40, marginBottom: 4 }}>{resumen.cantidadHoy}</span>
            <span className="metric-sub" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15 }}>
               Operaciones
            </span>
          </div>
        </div>
        
        <div className="card col-span-4">
          <div className="card-title">Ganancia Hoy</div>
          <div className="metric-group" style={{ marginTop: 'auto' }}>
            <span className="metric-value" style={{ color: 'var(--status-success)' }}>Bs {fmt(resumen.gananciaHoy)}</span>
            <span className="metric-sub">Neto diario</span>
          </div>
        </div>

        <div className="card col-span-4">
          <div className="card-title">Este Mes</div>
          <div className="metric-group" style={{ marginTop: 'auto' }}>
            <span className="metric-value" style={{ color: 'var(--accent-lime)' }}>Bs {fmt(resumen.gananciaMes)}</span>
            <span className="metric-sub">Acumulado mensual</span>
          </div>
        </div>

        {/* Historial detallado */}
        <div className="card col-span-12">
           <div className="card-title">Historial del día</div>
           
           {ventasHoy.length === 0 ? (
             <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
               <Activity size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
               <p>Aún no hay ventas registradas hoy.</p>
             </div>
           ) : (
             <div className="list-container">
               {ventasHoy.map(v => {
                 const hora = new Date(v.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                 return (
                   <div key={v.id} className="list-row">
                     <div className="row-content">
                       <div className="row-title">{v.nombreProducto}</div>
                       <div className="row-subtitle">{hora} · {v.cantidad} unidad{v.cantidad > 1 ? 'es' : ''}</div>
                     </div>
                     <div className="row-action" style={{ color: 'var(--status-success)', marginRight: 16 }}>
                       +Bs {fmt(v.ganancia)}
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(v); }} style={{ background: 'transparent', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', padding: 8 }}>
                       <Trash2 size={18} />
                     </button>
                   </div>
                 );
               })}
             </div>
           )}
        </div>

      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center', padding: 32 }}>
            <Trash2 size={48} color="var(--status-danger)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>¿Eliminar venta?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Eliminarás la venta de {deleteTarget.cantidad}x {deleteTarget.nombreProducto}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1, background: 'var(--status-danger)' }} onClick={borrarVentaConfirmado}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
