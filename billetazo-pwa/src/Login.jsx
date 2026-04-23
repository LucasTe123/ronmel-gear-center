// ============================================
// LOGIN.JSX - Autenticación Redesign
// ============================================

import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './firebase';
import { LogIn, UserPlus, KeyRound } from 'lucide-react';

export default function Login() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isReset, setIsReset] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isReset) {
      if (!email) {
        setError('Ingresá tu email para recuperar la contraseña');
        return;
      }
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Te enviamos un email con las instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.');
        setIsReset(false);
      } catch (err) {
        setError(err.code === 'auth/user-not-found' ? 'No existe cuenta con ese email' : 'Error al enviar email de recuperación');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isRegister && !nombre.trim()) {
      setError('Ingresá tu nombre');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, {
          displayName: nombre.trim(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'El email ya está registrado',
        'auth/invalid-email': 'Email inválido',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-credential': 'Email o contraseña incorrectos',
        'auth/too-many-requests': 'Demasiados intentos. Intentá más tarde.',
      };
      setError(msgs[err.code] || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(77, 107, 245, 0.1), transparent 50%)'
    }}>
      <div className="card" style={{ 
        width: '100%', 
        maxWidth: 420, 
        padding: '48px 40px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <img src="/icon.png" alt="Billetazo" style={{ 
          width: 72, 
          height: 72, 
          borderRadius: 20, 
          marginBottom: 24,
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-color)'
        }} />
        <h1 className="page-title" style={{ marginBottom: 8 }}>Billetazo</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
          {isReset ? 'Recuperar contraseña' : isRegister ? 'Creá tu cuenta para empezar' : 'Bienvenido de vuelta'}
        </p>

        {error && (
          <div style={{ 
            background: 'rgba(255,69,58,0.1)', 
            color: 'var(--status-danger)', 
            padding: 12, 
            borderRadius: 12, 
            marginBottom: 24,
            fontSize: 14,
            border: '1px solid rgba(255,69,58,0.2)'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            background: 'rgba(48,209,88,0.1)', 
            color: 'var(--status-success)', 
            padding: 12, 
            borderRadius: 12, 
            marginBottom: 24,
            fontSize: 14,
            border: '1px solid rgba(48,209,88,0.2)'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {!isReset && isRegister && (
            <div className="form-group">
              <label className="form-label">Tu nombre</label>
              <input
                className="form-input"
                type="text"
                placeholder="Ej: Ronmel"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                autoFocus
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus={!isRegister && !isReset}
            />
          </div>

          {!isReset && (
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Contraseña</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {!isReset && !isRegister && (
             <div style={{ textAlign: 'right', marginBottom: 24 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => { setIsReset(true); setError(''); setSuccess(''); }}>
                  ¿Olvidaste tu contraseña?
                </span>
             </div>
          )}
          {isRegister && <div style={{ marginBottom: 32 }} />}

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
            style={{ fontSize: 16, padding: '16px', marginTop: isReset ? 24 : 0 }}
          >
            {loading ? 'Cargando...' : isReset ? (
              <><KeyRound size={20} /> Recuperar</>
            ) : isRegister ? (
              <><UserPlus size={20} /> Crear cuenta</>
            ) : (
              <><LogIn size={20} /> Iniciar sesión</>
            )}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
          {isReset ? '¿Recordaste tu contraseña? ' : isRegister ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}
          <span 
            onClick={() => { setIsReset(false); setIsRegister(isReset ? false : !isRegister); setError(''); setSuccess(''); setNombre(''); }}
            style={{ color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 600 }}
          >
            {isReset ? 'Volver al inicio' : isRegister ? 'Iniciá sesión' : 'Registrate'}
          </span>
        </p>
      </div>
    </div>
  );
}
