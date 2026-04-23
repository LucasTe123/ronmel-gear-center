// ============================================
// APP.JSX - Enrutador principal
// ============================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ToastProvider } from './Toast';
import Login from './Login';
import Sidebar from './Sidebar';
import Home from './Home';
import Inventory from './Inventory';
import Sales from './Sales';
import Expenses from './Expenses';
import Settings from './Settings';
import AIAssistant from './AIAssistant';
import ShortcutSync from './ShortcutSync';

function AppLayout() {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"           element={<Home />} />
          <Route path="/inventario" element={<Inventory />} />
          <Route path="/ventas"     element={<Sales />} />
          <Route path="/gastos"     element={<Expenses />} />
          <Route path="/ajustes"    element={<Settings />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {/* Asistente IA flotante */}
      <AIAssistant />
      {/* Sincronización en segundo plano para el Atajo de Siri */}
      <ShortcutSync />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppLayout />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
