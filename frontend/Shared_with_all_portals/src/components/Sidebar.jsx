import React from 'react';
import { NavLink } from 'react-router-dom';
import { UserRound, Phone, LogOut, X } from 'lucide-react';

export default function Sidebar({ role, profile, center, unread, navigation, menu }) {
  const portalName = role === 'farmer' ? 'Farmer Portal' : role === 'admin' ? 'Admin Portal' : 'Procurement Center Portal';

  return (
    <>
      {menu.isMobile && menu.mobileOpen && (
        <button className="portal-sidebar-backdrop" aria-label="Dismiss sidebar" tabIndex={-1} onClick={menu.closeMobile} />
      )}
      <aside
        id="portal-sidebar"
        ref={menu.sidebarRef}
        className={`portal-sidebar ${menu.visible ? 'is-visible' : ''}`}
        aria-label={portalName + ' sidebar'}
        role={menu.isMobile && menu.mobileOpen ? 'dialog' : undefined}
        aria-modal={menu.isMobile && menu.mobileOpen ? true : undefined}
        aria-hidden={!menu.visible ? true : undefined}
        inert={!menu.visible ? '' : undefined}
        tabIndex={-1}
        onClick={event => { if (event.target.closest('a')) menu.closeMobile(); }}
      >
        {menu.isMobile && (
          <button className="portal-sidebar__close" type="button" onClick={menu.closeMobile} aria-label="Close sidebar">
            <X size={20} aria-hidden="true" />
          </button>
        )}
        <NavLink to={`/${role}/dashboard`} className="portal-sidebar__brand">
          <img className="portal-sidebar__brand-logo" src="/logo.png" alt="" aria-hidden="true" />
          <div><b>Krishi Kalyan</b><span>{portalName}</span></div>
        </NavLink>
        <NavLink className="portal-sidebar__profile" to={`/${role}/profile`}>
          <div className="portal-sidebar__avatar">
            {profile.photo ? <img src={profile.photo} alt="Profile" /> : <UserRound size={24} aria-hidden="true" />}
          </div>
          <div className="portal-sidebar__identity">
            <strong>{role === 'operator' ? center : profile.name}</strong>
            <span>{role === 'farmer' ? profile.email : role === 'admin' ? 'Super Admin' : 'Center Operator'}</span>
            <span>{role === 'farmer' ? `+91 ${profile.phone}` : 'Online'}</span>
          </div>
        </NavLink>
        <nav className="portal-sidebar__nav" aria-label={portalName + ' navigation'}>
          {navigation.map(([path, label, Icon]) => (
            <NavLink key={path} to={`/${role}/${path}`} className={({ isActive }) => `portal-sidebar__link ${isActive ? 'is-active' : ''}`}>
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              {path === 'notifications' && unread > 0 && <em className="portal-sidebar__badge">{unread}</em>}
            </NavLink>
          ))}
        </nav>
        {role === 'farmer' && (
          <div className="portal-sidebar__promo">
            <b>Save Time, Avoid Queue</b>
            <p>Book your slot and get real-time updates.</p>
            <NavLink className="portal-sidebar__action" to="/farmer/book-token">Book New Token</NavLink>
          </div>
        )}
        <div className="portal-sidebar__help">
          <b><Phone size={17} aria-hidden="true" />{role === 'operator' ? 'Center Helpline' : 'Need Help?'}</b>
          <span>1800-123-4567</span>
          <small>Mon – Sat, 9:00 AM – 6:00 PM</small>
          <NavLink className="portal-sidebar__action" to={`/${role}/support`}>
            {role === 'operator' ? 'Raise Ticket' : 'Contact Support'}
          </NavLink>
        </div>
        <NavLink className="portal-sidebar__logout" to={`/${role}/logout`}><LogOut size={19} aria-hidden="true" />Logout</NavLink>
      </aside>
    </>
  );
}
