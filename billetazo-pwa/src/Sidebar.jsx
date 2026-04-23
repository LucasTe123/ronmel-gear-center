// ============================================
// SIDEBAR.JSX - Navegación lateral PC Redesign
// ============================================

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Home, Package, Activity, DollarSign, Settings, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',           label: 'Inicio',     icon: <Home size={22} /> },
  { to: '/inventario', label: 'Inventario', icon: <Package size={22} /> },
  { to: '/ventas',     label: 'Ventas',     icon: <Activity size={22} /> },
  { to: '/gastos',     label: 'Finanzas',   icon: <DollarSign size={22} /> },
  { to: '/ajustes',    label: 'Ajustes',    icon: <Settings size={22} /> },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || '?';
  const initial = displayName[0]?.toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/icon.png" alt="Billetazo" />
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title={label}
          >
            {icon}
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar" title={displayName} style={{ overflow: 'hidden' }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initial
          )}
        </div>
        <button className="btn-logout" onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
