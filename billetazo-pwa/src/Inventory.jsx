// ============================================
// INVENTORY.JSX - Pantalla de inventario Redesign
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './Toast';
import { Package, Plus, Trash2, Search, ExternalLink, Image as ImageIcon, Check } from 'lucide-react';
import {
  subscribeProductos,
  agregarNuevoProducto,
  eliminarProducto,
  sumarStockProducto,
  calcularGanancia,
  subscribeVentas,
} from './firestore';

function fmt(n) {
  return Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---- IMAGE VIEWER ----
function ImageViewer({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(images.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1));
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000, background: 'rgba(0,0,0,0.9)' }}>
      <button className="modal-close" style={{ position: 'absolute', top: 24, right: 24 }} onClick={onClose}>✕</button>
      {idx > 0 && (
        <button className="btn-icon" style={{ position: 'absolute', left: 24, background: 'rgba(255,255,255,0.1)' }} onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}>‹</button>
      )}
      <img
        src={images[idx]}
        alt="Foto producto"
        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 16 }}
        onClick={e => e.stopPropagation()}
      />
      {idx < images.length - 1 && (
        <button className="btn-icon" style={{ position: 'absolute', right: 24, background: 'rgba(255,255,255,0.1)' }} onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}>›</button>
      )}
    </div>
  );
}

export default function Inventory() {
  const { user } = useAuth();
  const toast = useToast();
  const uid = user.uid;

  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [prodSel, setProdSel] = useState(null);
  const [stockPanel, setStockPanel] = useState(false);
  const [cantidadStock, setCantidadStock] = useState('');
  const [imageViewer, setImageViewer] = useState({ open: false, images: [], idx: 0 });
  const [busqueda, setBusqueda] = useState('');

  const [form, setForm] = useState({
    nombre: '', precioCompra: '', precioVenta: '', cantidad: '', linkProveedor: '',
  });
  const [imagenes, setImagenes] = useState([]);

  const stockInputRef = useRef(null);

  useEffect(() => {
    const unsubP = subscribeProductos(uid, data => {
      setProductos(data);
      setCargando(false);
    });
    const unsubV = subscribeVentas(uid, setVentas);
    return () => { unsubP(); unsubV(); };
  }, [uid]);

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  async function guardarProducto() {
    if (!form.nombre || !form.precioCompra || !form.precioVenta || !form.cantidad) {
      toast('Completá los campos obligatorios', 'error');
      return;
    }
    await agregarNuevoProducto(uid, { ...form, imagenes });
    setForm({ nombre: '', precioCompra: '', precioVenta: '', cantidad: '', linkProveedor: '' });
    setImagenes([]);
    setModalAgregar(false);
    toast('Producto agregado');
  }

  const [deleteTarget, setDeleteTarget] = useState(null);

  async function confirmarEliminar() {
    if (!deleteTarget) return;
    try {
      await eliminarProducto(uid, deleteTarget.id);
      if (prodSel?.id === deleteTarget.id) { setModalDetalle(false); setProdSel(null); }
      toast('Producto eliminado');
    } catch (err) {
      toast('Error al eliminar: ' + err.message, 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  function verDetalle(p) {
    setProdSel(p);
    setStockPanel(false);
    setCantidadStock('');
    setModalDetalle(true);
  }

  function abrirPanelStock() {
    setStockPanel(true);
    setCantidadStock('');
    setTimeout(() => stockInputRef.current?.focus(), 100);
  }

  async function handleAnadirStock() {
    const cant = parseInt(cantidadStock);
    if (isNaN(cant) || cant <= 0) { toast('Ingresá una cantidad válida', 'error'); return; }
    const res = await sumarStockProducto(uid, prodSel.id, cant, productos);
    if (res.exito) {
      setProdSel(p => ({ ...p, cantidad: p.cantidad + cant }));
      setStockPanel(false);
      setCantidadStock('');
      toast(`+${cant} unidades agregadas`);
    }
  }

  function handleImageFile(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Compress settings (Max width/height 800px)
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Output compressed WebP or JPEG
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.7);
          setImagenes(prev => [...prev, compressedDataUrl]);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  const ventasProd = ventas.filter(v => prodSel && (v.productoId === prodSel.id || v.nombreProducto === prodSel.nombre));

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="header-left">
          <p className="page-greeting">Catálogo</p>
          <h1 className="page-title">Inventario</h1>
        </div>
        <div className="header-right">
          <button className="btn btn-lime" onClick={() => setModalAgregar(true)}>
            <Plus size={20} /> Nuevo Producto
          </button>
        </div>
      </div>

      <div className="form-group" style={{ position: 'relative', marginBottom: 32 }}>
        <Search size={20} style={{ position: 'absolute', left: 16, top: 14, color: 'var(--text-muted)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 48, background: 'var(--bg-card)', border: 'none' }}
          placeholder="Buscar producto por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      <div className="dashboard-grid">
        <div className="card col-span-12">
          {productosFiltrados.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Package size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Sin productos</p>
              <p>Presioná Nuevo Producto para empezar</p>
            </div>
          ) : (
            <div className="list-container">
              {productosFiltrados.map(p => (
                <div key={p.id} className="list-row" onClick={() => verDetalle(p)} style={{ cursor: 'pointer' }}>
                  {p.imagenes?.length > 0 ? (
                    <img src={p.imagenes[0]} alt={p.nombre} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
                  ) : (
                    <div className="row-icon-box">
                      <ImageIcon size={24} color="var(--text-muted)" />
                    </div>
                  )}
                  <div className="row-content">
                    <div className="row-title">{p.nombre}</div>
                    <div className="row-subtitle">Venta: Bs {p.precioVenta} · Compra: Bs {p.precioCompra}</div>
                  </div>
                  <div className="row-action" style={{ color: p.cantidad <= 2 ? 'var(--status-danger)' : 'var(--text-secondary)', marginRight: 16, fontSize: 14 }}>
                    Stock: {p.cantidad}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(p); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', padding: 8 }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETALLE */}
      {modalDetalle && prodSel && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalDetalle(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <span className="modal-title">{prodSel.nombre}</span>
              <button className="modal-close" onClick={() => setModalDetalle(false)}>✕</button>
            </div>
            <div className="modal-body">
              {prodSel.imagenes?.length > 0 && (
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', marginBottom: 24, paddingBottom: 8 }}>
                  {prodSel.imagenes.map((uri, i) => (
                    <img key={i} src={uri} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 16, cursor: 'pointer' }}
                      onClick={() => setImageViewer({ open: true, images: prodSel.imagenes, idx: i })} />
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'var(--bg-base)', padding: 16, borderRadius: 12 }}>
                  <div className="metric-label">Stock actual</div>
                  <div className="metric-value" style={{ fontSize: 24, color: prodSel.cantidad <= 2 ? 'var(--status-danger)' : 'var(--text-primary)' }}>{prodSel.cantidad}</div>
                </div>
                <div style={{ background: 'var(--bg-base)', padding: 16, borderRadius: 12 }}>
                  <div className="metric-label">Ganancia unitaria</div>
                  <div className="metric-value" style={{ fontSize: 24, color: 'var(--accent-lime)' }}>Bs {fmt(calcularGanancia(prodSel.precioCompra, prodSel.precioVenta))}</div>
                </div>
                <div style={{ background: 'var(--bg-base)', padding: 16, borderRadius: 12 }}>
                  <div className="metric-label">Precio compra</div>
                  <div className="metric-value" style={{ fontSize: 20 }}>Bs {fmt(prodSel.precioCompra)}</div>
                </div>
                <div style={{ background: 'var(--bg-base)', padding: 16, borderRadius: 12 }}>
                  <div className="metric-label">Precio venta</div>
                  <div className="metric-value" style={{ fontSize: 20 }}>Bs {fmt(prodSel.precioVenta)}</div>
                </div>
              </div>

              {!stockPanel ? (
                <button className="btn btn-primary btn-full" style={{ marginBottom: 24 }} onClick={abrirPanelStock}>
                  <Plus size={18} /> Añadir Stock
                </button>
              ) : (
                <div style={{ background: 'var(--bg-base)', padding: 20, borderRadius: 16, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    ref={stockInputRef}
                    className="form-input"
                    type="number"
                    placeholder="Cantidad a sumar..."
                    min="1"
                    value={cantidadStock}
                    onChange={e => setCantidadStock(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAnadirStock()}
                  />
                  <button className="btn btn-lime" onClick={handleAnadirStock}><Check size={20} /></button>
                  <button className="btn btn-secondary" onClick={() => setStockPanel(false)}>✕</button>
                </div>
              )}

              {/* Ventas metrics */}
              <div style={{ background: 'var(--bg-base)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
                <div className="metric-label" style={{ marginBottom: 16 }}>Rendimiento del producto</div>
                {ventasProd.length === 0 ? (
                  <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Sin ventas registradas.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div className="metric-label">Unidades vendidas</div>
                      <div className="metric-value" style={{ fontSize: 24 }}>{ventasProd.reduce((a, v) => a + v.cantidad, 0)}</div>
                    </div>
                    <div>
                      <div className="metric-label">Total generado</div>
                      <div className="metric-value" style={{ fontSize: 24, color: 'var(--accent-blue)' }}>
                        Bs {fmt(ventasProd.reduce((a, v) => a + (v.precioVenta * v.cantidad), 0))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                {prodSel.linkProveedor && (
                  <a href={prodSel.linkProveedor} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none' }}>
                    <ExternalLink size={18} /> Proveedor
                  </a>
                )}
                <button className="btn" style={{ flex: 1, background: 'rgba(255,69,58,0.1)', color: 'var(--status-danger)' }} onClick={() => setDeleteTarget(prodSel)}>
                  <Trash2 size={18} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR */}
      {modalAgregar && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalAgregar(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nuevo Producto</span>
              <button className="modal-close" onClick={() => { setModalAgregar(false); setImagenes([]); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Imágenes</label>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                  {imagenes.map((uri, i) => (
                    <div key={i} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                      <img src={uri} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                      <button style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: '50%', background: 'var(--status-danger)', color: '#fff', border: 'none', cursor: 'pointer' }} onClick={() => setImagenes(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                  <label style={{ width: 80, height: 80, borderRadius: 12, border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <Plus size={24} color="var(--text-muted)" />
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageFile} />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del producto *</label>
                <input className="form-input" placeholder="Ej: Sincronizador 3ra" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Precio compra (Bs) *</label>
                  <input className="form-input" type="number" placeholder="0" value={form.precioCompra} onChange={e => setForm({ ...form, precioCompra: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio venta (Bs) *</label>
                  <input className="form-input" type="number" placeholder="0" value={form.precioVenta} onChange={e => setForm({ ...form, precioVenta: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad en stock *</label>
                <input className="form-input" type="number" placeholder="0" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Link proveedor (opcional)</label>
                <input className="form-input" placeholder="https://..." value={form.linkProveedor} onChange={e => setForm({ ...form, linkProveedor: e.target.value })} />
              </div>

              <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={guardarProducto}>
                Guardar Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center', padding: 32 }}>
            <Trash2 size={48} color="var(--status-danger)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>¿Eliminar producto?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Se eliminará permanentemente: "{deleteTarget.nombre}"</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1, background: 'var(--status-danger)' }} onClick={confirmarEliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {imageViewer.open && (
        <ImageViewer images={imageViewer.images} startIndex={imageViewer.idx} onClose={() => setImageViewer({ open: false, images: [], idx: 0 })} />
      )}
    </div>
  );
}
