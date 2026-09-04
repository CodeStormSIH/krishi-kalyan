import React, { createContext, useContext, useEffect, useState } from 'react';
import { initialData, dateISO } from '../data/seed';
const Context = createContext(null);
const KEY = 'krishi-kalyan-v1';
function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return value?.tokens && value?.settings ? value : initialData;
  } catch {
    return initialData;
  }
}
export function StoreProvider({
  children
}) {
  const [data, setData] = useState(read),
    [session, setSession] = useState(() => {
      try {
        return JSON.parse(sessionStorage.getItem('krishi-session'));
      } catch {
        return null;
      }
    }),
    [toast, setToast] = useState('');
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      setToast('Storage is full. Download your data or use a smaller image.');
    }
  }, [data]);
  useEffect(() => {
    const sync = event => {
      if (event.key !== KEY || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue);
        if (next.tokens && next.settings) setData(current => JSON.stringify(current) === event.newValue ? current : next);
      } catch { /* Ignore incomplete storage writes from another tab. */ }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    const id = setInterval(() => setData(d => {
      const due = d.notifications.some(n => n.delivery === 'Scheduled' && new Date(n.scheduledAt) <= new Date());
      return due ? {
        ...d,
        notifications: d.notifications.map(n => n.delivery === 'Scheduled' && new Date(n.scheduledAt) <= new Date() ? {
          ...n,
          delivery: 'Sent'
        } : n)
      } : d;
    }), 10000);
    return () => clearInterval(id);
  }, []);
  const update = (key, fn) => setData(d => ({
    ...d,
    [key]: typeof fn === 'function' ? fn(d[key]) : fn
  }));
  const patch = (key, id, values) => update(key, rows => rows.map(r => r.id === id ? {
    ...r,
    ...values
  } : r));
  const login = account => {
    const s = typeof account === 'string' ? { role: account } : account;
    sessionStorage.setItem('krishi-session', JSON.stringify(s));
    setSession(s);
  };
  const logout = () => {
    sessionStorage.removeItem('krishi-session');
    setSession(null);
  };
  const notify = (title, message, category = 'Updates') => update('notifications', rows => [{
    id: crypto.randomUUID(),
    title,
    message,
    category,
    read: false,
    date: dateISO(),
    time: new Date().toLocaleTimeString(),
    audience: 'All Farmers',
    delivery: 'Sent'
  }, ...rows]);
  const advanceQueue = center => setData(d => {
    const centerName = typeof center === 'string' ? center : d.selectedCenter;
    const waiting = d.tokens.filter(t => ['In Queue', 'Checked In'].includes(t.status) && t.center === centerName);
    if (!waiting.length) return d;
    const first = waiting[0];
    return {
      ...d,
      tokens: d.tokens.map(t => t.id === first.id ? {
        ...t,
        status: 'In Process',
        stage: Math.max(2, t.stage)
      } : t),
      queueLog: [{
        time: new Date().toLocaleTimeString(),
        message: `${first.name} (${first.id}) called for verification.`
      }, ...d.queueLog].slice(0, 20)
    };
  });
  return <Context.Provider value={{
    data,
    update,
    patch,
    session,
    login,
    logout,
    notify,
    advanceQueue,
    toast: setToast
  }}>{children}{toast && <div className="toast" role="status">✓ {toast}<button aria-label="Dismiss message" onClick={() => setToast('')}>×</button></div>}</Context.Provider>;
}
export const useStore = () => useContext(Context);
export function canReadNotification(n, role) {
  if (role !== 'farmer') return true;
  return !n.audience || ['All Farmers', 'Queue Farmers'].includes(n.audience) || ['Specific Farmer', 'Specific User'].includes(n.audience) && n.recipient === 'KRN123456';
}
export const money = value => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
}).format(value || 0);
export function download(name, rows) {
  const entries = Array.isArray(rows) ? rows : [rows];
  const keys = [...new Set(entries.flatMap(Object.keys))];
  const csv = [keys, ...entries.map(row => keys.map(k => typeof row[k] === 'object' ? JSON.stringify(row[k]) : row[k] ?? ''))].map(r => r.map(v => '"' + String(v).replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], {
    type: 'text/csv;charset=utf-8'
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Krishi_Kalyan_0.1-${name}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
