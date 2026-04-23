// ================================================================
// Settings.jsx — Ajustes Rediseñados (Layout Arreglado + Foto Galería)
// ================================================================

import React, { useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './Toast';
import { User, Smartphone, Cpu, Mic, Zap, Check, Copy, Camera, Upload } from 'lucide-react';
import { auth } from './firebase';
import { updateProfile } from 'firebase/auth';

const SHORTCUT_URL = import.meta.env.VITE_SHORTCUT_URL || '#';
const SIRI_TOKEN   = import.meta.env.VITE_SIRI_TOKEN   || '—';
const NETLIFY_URL  = typeof window !== 'undefined'
  ? `${window.location.origin}/.netlify/functions/siri`
  : 'https://tu-app.netlify.app/.netlify/functions/siri';

function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
      <input
        className="form-input"
        value={value}
        readOnly
        style={{ color: 'var(--text-muted)', fontFamily: 'monospace', cursor: 'default', background: 'var(--bg-base)', border: '1px solid var(--border-color)', flex: 1 }}
      />
      <button 
        className="btn btn-secondary" 
        onClick={copy} 
        style={{ padding: '0 16px', minWidth: 48, background: 'var(--bg-base)', border: '1px solid var(--border-color)' }}
      >
        {copied ? <Check size={18} color="var(--status-success)" /> : <Copy size={18} color="var(--text-secondary)" />}
      </button>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Comprimir en WebP de baja calidad para asegurar que quepa en el Auth profile (< 30kb idealmente)
        const compressedBase64 = canvas.toDataURL('image/webp', 0.6);
        
        updateProfile(auth.currentUser, { photoURL: compressedBase64 })
          .then(() => {
            toast('Foto de perfil actualizada con éxito');
            setTimeout(() => window.location.reload(), 1000);
          })
          .catch((error) => {
            toast('Error al actualizar: ' + error.message, 'error');
            setLoading(false);
          });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: 900 }}>
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div className="header-left">
          <p className="page-greeting">Ajustes del Sistema</p>
          <h1 className="page-title">Configuración</h1>
        </div>
      </div>

      {/* Cambiamos el grid para evitar que se aplaste todo en pantallas medianas/pequeñas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        
        {/* PERFIL */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 32 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
             <div style={{ 
               width: 80, height: 80, borderRadius: 24, 
               background: 'var(--bg-base)', border: '2px solid var(--border-color)',
               display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
               overflow: 'hidden', flexShrink: 0
             }}>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={40} />
                )}
             </div>
             <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Mi Perfil</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>{user?.email}</div>
                <button 
                   className="btn btn-secondary" 
                   onClick={() => fileInputRef.current?.click()} 
                   disabled={loading}
                   style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
                >
                  <Camera size={16} /> {loading ? 'Subiendo...' : 'Cambiar foto de la galería'}
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleImageUpload} 
                />
             </div>
           </div>

           <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>ID de Seguridad (UID)</div>
              <CopyField value={user?.uid || ''} />
           </div>
        </div>

        {/* INTEGRACION IA */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 32 }}>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-base)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-lime)' }}>
                <Cpu size={28} />
             </div>
             <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Motor de IA (Siri)</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Automatización mediante voz</div>
             </div>
           </div>

           <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: 15 }}>
             Vincula tu cuenta con iOS Shortcuts (Siri) para registrar gastos y consultar tu inventario sin abrir la aplicación. 
             Nuestra IA procesará tus notas de voz automáticamente.
           </p>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
              <div style={{ background: 'var(--bg-base)', padding: '20px', borderRadius: 16, border: '1px solid var(--border-color)' }}>
                 <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={16} color="var(--accent-lime)" /> Token de Acceso Seguro
                 </div>
                 <CopyField value={SIRI_TOKEN} />
              </div>
              <div style={{ background: 'var(--bg-base)', padding: '20px', borderRadius: 16, border: '1px solid var(--border-color)' }}>
                 <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Smartphone size={16} color="var(--accent-blue)" /> Endpoint del Servidor
                 </div>
                 <CopyField value={NETLIFY_URL} />
              </div>
           </div>

           <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', padding: 24, borderRadius: 16, marginTop: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Mic size={18} /> Ejemplos de uso para Siri
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                 <div style={{ fontSize: 14, color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 12, borderLeft: '4px solid var(--accent-lime)' }}>
                   "Oye Siri, gané 500 Bs vendiendo un teclado"
                 </div>
                 <div style={{ fontSize: 14, color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 12, borderLeft: '4px solid var(--status-danger)' }}>
                   "Oye Siri, gasté 20 Bs en pasaje"
                 </div>
                 <div style={{ fontSize: 14, color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 12, borderLeft: '4px solid var(--accent-blue)' }}>
                   "Oye Siri, ¿cuáles son mis productos más vendidos?"
                 </div>
              </div>
              <a href={SHORTCUT_URL} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                 <button className="btn btn-lime" style={{ width: '100%', padding: '16px', borderRadius: 14, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                   <Upload size={20} /> Descargar Atajo de Apple
                 </button>
              </a>
           </div>

        </div>

      </div>
    </div>
  );
}
