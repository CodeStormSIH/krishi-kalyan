import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Wheat, LayoutDashboard, UserRound, CalendarDays, UsersRound, ClipboardList, WalletCards, Bell, History, CircleHelp, LogOut, Menu, Building2, ChartNoAxesCombined, Settings, TriangleAlert, Ticket, ShieldCheck, Globe } from 'lucide-react';
import { useStore, canReadNotification } from '../services/store';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useSidebar } from '../hooks/useSidebar';
import '../styles/sidebar.css';
export const navigation = {
  farmer: [['dashboard', 'Dashboard', LayoutDashboard], ['profile', 'My Profile', UserRound], ['book-token', 'Book / My Token', CalendarDays], ['queue', 'My Queue Status', UsersRound], ['procurement', 'Procurement Status', ClipboardList], ['payment', 'Payment Status', WalletCards], ['notifications', 'Notifications', Bell], ['history', 'My History', History], ['support', 'Help & Support', CircleHelp]],
  operator: [['dashboard', 'Dashboard', LayoutDashboard], ['queue', 'Token & Queue', UsersRound], ['farmers', 'Farmers', UsersRound], ['procurement', 'Procurement', Wheat], ['stages', 'Procurement Stages', ClipboardList], ['payments', 'Payments', WalletCards], ['notifications', 'Notifications', Bell], ['reports', 'Reports', ChartNoAxesCombined], ['settings', 'Center Settings', Settings]],
  admin: [['dashboard', 'Dashboard', LayoutDashboard], ['farmers', 'Farmers', UsersRound], ['centers', 'Procurement Centers', Building2], ['queue', 'Token & Queue', Ticket], ['procurement', 'Procurement', Wheat], ['payments', 'Payments', WalletCards], ['notifications', 'Notifications', Bell], ['reports', 'Reports & Analytics', ChartNoAxesCombined], ['alerts', 'Alerts & Anomalies', TriangleAlert], ['users', 'Users & Roles', ShieldCheck], ['settings', 'System Settings', Settings]]
};
export default function Layout() {
  const {
    session,
    data,
    update,
    connection
  } = useStore();
  const role = session.role;
  const [language, setLanguage] = useState(() => localStorage.getItem('krishi-language') || 'English');
  const location = useLocation();
  const menu = useSidebar(location.pathname);
  const page = location.pathname.split('/').pop();
  const krishiUserStr = localStorage.getItem('krishi_user');
  if (!krishiUserStr) {
    return <Navigate to="/login" replace />;
  }
  const krishiUser = JSON.parse(krishiUserStr);
  
  const profile = {
    ...data.profiles[role],
    name: krishiUser.full_name || krishiUser.name || 'Farmer',
    email: krishiUser.email || '',
    phone: krishiUser.phone_number || krishiUser.phone || ''
  };

  const unread = data.notifications.filter(n => canReadNotification(n, role) && !n.read && n.delivery === 'Sent').length;
  const title = page === 'dashboard' ? role === 'farmer' ? `Good Morning, ${profile.name}! 👋` : role === 'admin' ? 'Admin Dashboard' : 'Procurement Center Dashboard' : navigation[role].find(n => n[0] === page)?.[1] || {
    support: 'Help & Support',
    profile: 'My Profile',
    logout: 'Logout'
  }[page] || 'Dashboard';
  return (
    <div className={`app-shell ${role === 'farmer' ? 'farmer-theme' : 'dark-theme'} ${!menu.isMobile && menu.desktopCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        role={role}
        profile={profile}
        center={data.selectedCenter}
        unread={unread}
        navigation={navigation[role]}
        menu={menu}
      />
      <main className="main portal-main" inert={menu.isMobile && menu.mobileOpen ? '' : undefined}>
        <header className="topbar">
          <button
            ref={menu.toggleRef}
            className="portal-menu-toggle"
            type="button"
            onClick={menu.toggle}
            aria-label={menu.visible ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={menu.visible}
            aria-controls="portal-sidebar"
            title={menu.visible ? 'Close sidebar' : 'Open sidebar'}
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <div className="page-heading">
            <h1>{title}</h1>
            <p>{page === 'dashboard'
              ? role === 'farmer' ? "Here's what's happening with your procurement today."
                : role === 'admin' ? 'Overview of procurement operations across all centers'
                  : 'Manage tokens, queue and procurement operations'
              : 'Manage your ' + title.toLowerCase() + ' information and services.'}</p>
          </div>
          <div className="top-actions">
            <span
              className={`connection-status connection-status--${connection.status}`}
              title={connection.message}
              role="status"
            >
              <span aria-hidden="true">●</span>
              {connection.status === 'connected' ? 'API connected' : connection.status === 'error' ? 'API offline' : 'Connecting…'}
            </span>
            <ThemeToggle />
            {role === 'operator' && (
              <select aria-label="Active procurement center" value={data.selectedCenter} onChange={e => update('selectedCenter', e.target.value)}>
                {data.centers.filter(c => c.status === 'Active').map(c => <option key={c.id}>{c.name}</option>)}
              </select>
            )}
            <div className="language">
              <Globe size={15} />
              <select aria-label="Language" value={language} onChange={e => {
                setLanguage(e.target.value);
                localStorage.setItem('krishi-language', e.target.value);
                document.documentElement.lang = e.target.value === 'English' ? 'en' : 'hi';
              }}>
                <option>English</option><option>हिन्दी</option>
              </select>
            </div>
            <NavLink className="icon-btn" to={`/${role}/notifications`} aria-label={`Notifications, ${unread} unread`}>
              <Bell size={19} />{unread > 0 && <span>{unread}</span>}
            </NavLink>
            {role === 'farmer' ? (
              <button className="logout-top icon-btn" style={{ fontSize: '0.9rem', width: 'auto', padding: '0 10px' }} onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.href = '/login'; }}>
                <LogOut size={17} /> Logout
              </button>
            ) : (
              <NavLink className="logout-top" to={`/${role}/profile`}>
                <UserRound size={17} /> Profile
              </NavLink>
            )}
          </div>
        </header>
        <div className="content">
          {role === 'operator' && (
            <div className="mobile-center">
              <select aria-label="Mobile procurement center" value={data.selectedCenter} onChange={e => update('selectedCenter', e.target.value)}>
                {data.centers.filter(c => c.status === 'Active').map(c => <option key={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <Outlet key={role === 'operator' && page === 'settings' ? data.selectedCenter : undefined} />
        </div>
      </main>
    </div>
  );
}
