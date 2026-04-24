// ============================================
// AuthContext.jsx — Sesión Firebase Auth global
// CORREGIDO: Estado de carga explícito con 'loading'
// ============================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth } from './firebase';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  // ✅ FIX: Separar 'loading' de 'user' para saber cuándo Auth terminó de cargar
  const [user, setUser] = useState(undefined); // undefined = todavía cargando
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);       // u = objeto usuario si está logueado, null si no
      setLoading(false); // Auth ya terminó de verificar
    });
    return unsub;
  }, []);

  function signOut() {
    return fbSignOut(auth);
  }

  // ✅ FIX: Exponer 'loading' para que otros componentes sepan si Auth está listo
  return (
    <AuthCtx.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}