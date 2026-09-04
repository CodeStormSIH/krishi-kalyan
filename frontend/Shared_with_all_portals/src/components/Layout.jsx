import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Wheat, LayoutDashboard, UserRound, CalendarDays, UsersRound, ClipboardList, WalletCards, Bell, History, CircleHelp, LogOut, Menu, X, Building2, ChartNoAxesCombined, Settings, TriangleAlert, Ticket, ShieldCheck, Phone, Globe } from 'lucide-react';
import { useStore, canReadNotification } from '../services/store';
export const navigation = {
  farmer: [['dashboard', 'Dashboard', LayoutDashboard], ['profile', 'My Profile', UserRound], ['book-token', 'Book / My Token', CalendarDays], ['queue', 'My Queue Status', UsersRound], ['procurement', 'Procurement Status', ClipboardList], ['payment', 'Payment Status', WalletCards], ['notifications', 'Notifications', Bell], ['history', 'My History', History], ['support', 'Help & Support', CircleHelp]],
  operator: [['dashboard', 'Dashboard', LayoutDashboard], ['queue', 'Token & Queue', UsersRound], ['farmers', 'Farmers', UsersRound], ['procurement', 'Procurement', Wheat], ['stages', 'Procurement Stages', ClipboardList], ['payments', 'Payments', WalletCards], ['notifications', 'Notifications', Bell], ['reports', 'Reports', ChartNoAxesCombined], ['settings', 'Center Settings', Settings]],
  admin: [['dashboard', 'Dashboard', LayoutDashboard], ['farmers', 'Farmers', UsersRound], ['centers', 'Procurement Centers', Building2], ['queue', 'Token & Queue', Ticket], ['procurement', 'Procurement', Wheat], ['payments', 'Payments', WalletCards], ['notifications', 'Notifications', Bell], ['reports', 'Reports & Analytics', ChartNoAxesCombined], ['alerts', 'Alerts & Anomalies', TriangleAlert], ['users', 'Users & Roles', ShieldCheck], ['settings', 'System Settings', Settings]]
};
export default function Layout() {
  const {
    session,
    data,
    update
  } = useStore();
  const role = session.role;
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('krishi-language') || 'English');
  const location = useLocation();
  const page = location.pathname.split('/').pop();
  const profile = data.profiles[role];
  const unread = data.notifications.filter(n => canReadNotification(n, role) && !n.read && n.delivery === 'Sent').length;
  const title = page === 'dashboard' ? role === 'farmer' ? `Good Morning, ${profile.name}! 👋` : role === 'admin' ? 'Admin Dashboard' : 'Procurement Center Dashboard' : navigation[role].find(n => n[0] === page)?.[1] || {
    support: 'Help & Support',
    profile: 'My Profile',
    logout: 'Logout'
  }[page] || 'Dashboard';
  return <div className={`app-shell ${role === 'farmer' ? 'farmer-theme' : 'dark-theme'}`}>
{open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
<aside className={`sidebar ${open ? 'sidebar-open' : ''}`}><NavLink to={`/${role}/dashboard`} className="brand"><Wheat size={35} /><div><b>Krishi_Kalyan_0.1</b><span>{role === 'farmer' ? 'Farmer Portal' : role === 'admin' ? 'Admin Portal' : 'Procurement Center Portal'}</span></div></NavLink><NavLink className="farmer-mini" to={`/${role}/profile`}><div className="avatar">{profile.photo ? <img src={profile.photo} alt="Profile" /> : role === 'farmer' ? '👨🏽‍🌾' : <UserRound />}</div><div><strong>{role === 'operator' ? data.selectedCenter : profile.name}</strong><span>{role === 'farmer' ? profile.email : role === 'admin' ? 'Super Admin' : 'Center Operator'}</span><span>{role === 'farmer' ? `+91 ${profile.phone}` : '🟢 Online'}</span></div></NavLink><nav className="side-nav">{navigation[role].map(([path, label, Icon]) => <NavLink key={path} to={`/${role}/${path}`} className={({
          isActive
        }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}><Icon size={18} /><span>{label}</span>{path === 'notifications' && unread > 0 && <em>{unread}</em>}</NavLink>)}</nav>{role === 'farmer' ? <div className="side-promo"><b>Save Time, Avoid Queue</b><span>Book your slot and<br />get real-time updates</span><NavLink to="/farmer/book-token">Book New Token</NavLink><div className="farm-landscape"><div className="sun" /><div className="hill one" /><div className="hill two" /><span>🚜</span></div></div> : null}<div className="help-card"><b><Phone size={18} /> {role === 'operator' ? 'Center Helpline' : 'Need Help?'}</b><span>1800-123-4567</span><small>Mon – Sat, 9:00 AM – 6:00 PM</small>{role !== 'farmer' && <NavLink className="primary-btn wide" to={`/${role}/support`}>{role === 'admin' ? 'Contact Support' : 'Raise Ticket'}</NavLink>}</div><NavLink className="logout-side" to={`/${role}/logout`}><LogOut size={18} /> Logout</NavLink></aside>
<main className="main"><header className="topbar"><button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button><div className="page-heading"><h1>{title}</h1><p>{page === 'dashboard' ? role === 'farmer' ? "Here's what's happening with your procurement today." : role === 'admin' ? 'Overview of procurement operations across all centers' : 'Manage tokens, queue and procurement operations' : 'Manage your ' + title.toLowerCase() + ' information and services.'}</p></div><div className="top-actions">{role === 'operator' && <select aria-label="Active procurement center" value={data.selectedCenter} onChange={e => update('selectedCenter', e.target.value)}>{data.centers.filter(c => c.status === 'Active').map(c => <option key={c.id}>{c.name}</option>)}</select>}<div className="language"><Globe size={15} /><select aria-label="Language" value={language} onChange={e => {
              setLanguage(e.target.value);
              localStorage.setItem('krishi-language', e.target.value);
              document.documentElement.lang = e.target.value === 'English' ? 'en' : 'hi';
            }}><option>English</option><option>हिन्दी</option></select></div><NavLink className="icon-btn" to={`/${role}/notifications`} aria-label={`Notifications, ${unread} unread`}><Bell size={19} />{unread > 0 && <span>{unread}</span>}</NavLink><NavLink className="logout-top" to={`/${role}/${role === 'farmer' ? 'logout' : 'profile'}`}>{role === 'farmer' ? <LogOut size={17} /> : <UserRound size={17} />} {role === 'farmer' ? 'Logout' : 'Profile'}</NavLink></div></header><div className="content">{role === "operator" && <div className="mobile-center"><select aria-label="Mobile procurement center" value={data.selectedCenter} onChange={e => update("selectedCenter", e.target.value)}>{data.centers.filter(c => c.status === "Active").map(c => <option key={c.id}>{c.name}</option>)}</select></div>}<Outlet key={role === "operator" && page === "settings" ? data.selectedCenter : undefined} /></div></main></div>;
}
