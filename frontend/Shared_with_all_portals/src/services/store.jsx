import React, { createContext, useContext, useEffect, useState } from 'react';
import { initialData, dateISO } from '../data/seed';
import { backendApi } from './api';
const Context = createContext(null);
const KEY = 'krishi-kalyan-v1';

// 1. Cache Invalidation
try {
  const oldVal = localStorage.getItem(KEY);
  if (oldVal && (oldVal.includes('Ram Prasad') || oldVal.includes('TK245689'))) {
    localStorage.removeItem(KEY);
  }
} catch (e) {}

function getInitialUser() {
  try {
    const user = JSON.parse(localStorage.getItem('krishi_user'));
    return user || { full_name: 'Kisan Mitr', phone_number: '', role: 'FARMER' };
  } catch {
    return { full_name: 'Kisan Mitr', phone_number: '', role: 'FARMER' };
  }
}

function getInitialBooking() {
  try {
    return JSON.parse(localStorage.getItem('latest_booking')) || null;
  } catch {
    return null;
  }
}

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    let baseData = value?.tokens && value?.settings ? value : { ...initialData };
    
    // Ensure tokens retain initial seed records + any active user booking
    let currentTokens = (baseData.tokens && baseData.tokens.length > 0) ? [...baseData.tokens] : [...initialData.tokens];
    const activeBooking = getInitialBooking();
    if (activeBooking) {
      const activeId = activeBooking.id || activeBooking.token_id;
      if (!currentTokens.some(t => t.id === activeId)) {
        currentTokens.unshift(activeBooking);
      }
    }

    baseData.farmers = (baseData.farmers && baseData.farmers.length > 0) ? baseData.farmers : initialData.farmers;
    baseData.user = getInitialUser();
    baseData.myToken = activeBooking;
    baseData.procurement = activeBooking;
    baseData.tokens = currentTokens;
    
    return baseData;
  } catch {
    return initialData;
  }
}

export function getCenterCrowdMetrics(centerName, tokens = [], centers = []) {
  const cName = centerName || 'Samastipur Center';
  const centerTokens = (tokens || []).filter(t => t.center === cName || (t.center && t.center.toLowerCase().includes(cName.toLowerCase())));
  const centerObj = (centers || []).find(c => c.name === cName) || {};

  const waitingTokens = centerTokens.filter(t => ['In Queue', 'Checked In', 'BOOKED', 'CONFIRMED'].includes(t.status));
  const inProcessTokens = centerTokens.filter(t => ['In Process', 'GATE_IN', 'GROSS_WEIGHED', 'READY_FOR_AUCTION'].includes(t.status) || (t.stage >= 1 && t.stage < 5));
  const completedTokens = centerTokens.filter(t => ['Completed', 'USED'].includes(t.status) || t.stage === 5);

  const waitingCount = waitingTokens.length;
  const inProcessCount = inProcessTokens.length;
  const completedCount = completedTokens.length;
  const maxCapacity = centerObj.capacity || 50;
  const activeVehicles = Math.max(waitingCount + inProcessCount, centerObj.active_vehicles || 0);
  const capacityPct = Math.min(100, Math.round((activeVehicles / maxCapacity) * 100));

  let congestionLevel = 'GREEN';
  let congestionLabel = 'Low Crowd';
  let statusMessage = 'Smooth flow · Minimal waiting';

  if (capacityPct > 75) {
    congestionLevel = 'RED';
    congestionLabel = 'Heavy Congestion';
    statusMessage = 'High crowd · Significant queue delays';
  } else if (capacityPct >= 40) {
    congestionLevel = 'AMBER';
    congestionLabel = 'Moderate Crowd';
    statusMessage = 'Steady movement · Expected wait ~20-30 mins';
  }

  const avgTurnaround = 5; // 5 mins per token
  const estimatedWaitMins = Math.max(5, waitingCount * avgTurnaround);

  return {
    centerName: cName,
    centerId: centerObj.id || 'SPC1234',
    waitingCount,
    inProcessCount,
    completedCount,
    activeVehicles,
    maxCapacity,
    capacityPct,
    congestionLevel,
    congestionLabel,
    avgTurnaround,
    estimatedWaitMins,
    statusMessage,
    waitingTokens,
  };
}

export function getFarmerWaitEstimate(farmerPhoneOrToken, centerName, tokens = [], centers = []) {
  const metrics = getCenterCrowdMetrics(centerName, tokens, centers);
  const { waitingTokens, avgTurnaround, congestionLevel, congestionLabel, activeVehicles, capacityPct } = metrics;

  const token = (tokens || []).find(t =>
    (farmerPhoneOrToken && (t.id === farmerPhoneOrToken || t.token_id === farmerPhoneOrToken || t.phone === farmerPhoneOrToken))
  );

  if (!token) {
    return {
      hasToken: false,
      position: null,
      farmersAhead: waitingTokens.length,
      estimatedWaitMins: metrics.estimatedWaitMins,
      congestionLevel,
      congestionLabel,
      activeVehicles,
      capacityPct,
      statusMessage: `${waitingTokens.length} farmers currently waiting at ${centerName || 'center'}. Expected wait: ~${metrics.estimatedWaitMins} mins.`,
    };
  }

  const waitingIndex = waitingTokens.findIndex(t => t.id === token.id || t.token_id === token.id);
  const isInQueue = ['In Queue', 'Checked In', 'BOOKED', 'CONFIRMED'].includes(token.status);
  const isInProcess = ['In Process', 'GATE_IN', 'GROSS_WEIGHED', 'READY_FOR_AUCTION'].includes(token.status) || (token.stage >= 1 && token.stage < 5);

  let position = waitingIndex >= 0 ? waitingIndex + 1 : 1;
  let farmersAhead = Math.max(0, position - 1);
  let estimatedWaitMins = farmersAhead * avgTurnaround;
  let statusMessage = '';

  if (isInProcess) {
    position = 0;
    farmersAhead = 0;
    estimatedWaitMins = 0;
    statusMessage = 'Your token is currently being verified at Gate 1 / Verification Bay.';
  } else if (isInQueue) {
    if (position === 1) {
      estimatedWaitMins = Math.max(2, avgTurnaround);
      statusMessage = 'You are next in queue! Please proceed toward Gate 1.';
    } else {
      statusMessage = `${farmersAhead} farmers ahead of you in queue. Estimated wait: ~${estimatedWaitMins} mins.`;
    }
  } else if (token.status === 'Completed' || token.status === 'USED' || token.stage === 5) {
    position = 0;
    farmersAhead = 0;
    estimatedWaitMins = 0;
    statusMessage = 'Procurement cycle completed successfully.';
  } else {
    estimatedWaitMins = Math.max(5, (waitingTokens.length + 1) * avgTurnaround);
    statusMessage = `Scheduled for ${token.slot || 'today'}. Current center wait time: ~${metrics.estimatedWaitMins} mins.`;
  }

  return {
    hasToken: true,
    token,
    position,
    farmersAhead,
    estimatedWaitMins,
    congestionLevel,
    congestionLabel,
    activeVehicles,
    capacityPct,
    statusMessage,
  };
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
    [toast, setToast] = useState(''),
    [connection, setConnection] = useState({ status: 'checking', message: 'Checking backend…' }),
    [backendReady, setBackendReady] = useState(false);
  useEffect(() => {
    Promise.all([
      backendApi.health().catch(() => null),
      backendApi.farmer.mandiTraffic().catch(() => []),
      backendApi.web.getState().catch(() => null)
    ])
      .then(([health, mandis, saved]) => {
        const databaseConnected = health?.services?.database === 'connected' || health?.status === 'healthy';
        setConnection({
          status: databaseConnected ? 'connected' : 'error',
          message: databaseConnected ? 'Backend and database connected' : 'Database health check failed'
        });
        if (saved?.data?.tokens && saved?.data?.settings) {
          setData(saved.data);
          setBackendReady(true);
          return;
        }
        if (Array.isArray(mandis) && mandis.length > 0) {
          setData(current => ({
            ...current,
            centers: mandis.map(mandi => {
              const existing = current.centers.find(center => center.id === mandi.mandi_id) || {};
              return {
                ...existing,
                id: mandi.mandi_id,
                name: mandi.name,
                district: mandi.district,
                status: 'Active',
                activeVehicles: mandi.active_vehicles,
                capacity: mandi.max_capacity,
                congestion: mandi.congestion_level,
                turnaroundMinutes: mandi.estimated_turnaround_time_mins,
              };
            })
          }));
        }
        setBackendReady(true);
      })
      .catch(error => {
        setConnection({ status: 'error', message: error.message });
        setToast(error.message);
      });
  }, []);
  useEffect(() => {
    if (!backendReady) return;
    const timer = window.setTimeout(() => {
      backendApi.web.saveState(data).catch(error => {
        if (error?.status !== 404) {
          setToast(error.message);
        }
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [data, backendReady]);
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
  const setUser = (userData) => {
    localStorage.setItem('krishi_user', JSON.stringify(userData));
    setData(d => ({ ...d, user: userData }));
  };

  const addBooking = (newBooking) => {
    localStorage.setItem('latest_booking', JSON.stringify(newBooking));
    setData(d => ({
      ...d,
      myToken: newBooking,
      procurement: newBooking,
      tokens: [newBooking, ...(d.tokens || [])]
    }));
  };

  const login = account => {
    const s = typeof account === 'string' ? { role: account } : account;
    sessionStorage.setItem('krishi-session', JSON.stringify(s));
    setSession(s);
  };
  const logout = () => {
    sessionStorage.removeItem('krishi-session');
    localStorage.removeItem('krishi_user');
    localStorage.removeItem('krishi_token');
    localStorage.removeItem('latest_booking');
    localStorage.removeItem(KEY);
    setSession(null);
    setData(read());
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
    const waiting = d.tokens.filter(t => ['In Queue', 'Checked In', 'BOOKED', 'CONFIRMED'].includes(t.status) && t.center === centerName);
    if (!waiting.length) return d;
    const first = waiting[0];
    const updatedTokens = d.tokens.map(t => t.id === first.id ? {
      ...t,
      status: 'In Process',
      stage: Math.max(2, t.stage)
    } : t);

    try {
      const activeBooking = JSON.parse(localStorage.getItem('latest_booking'));
      if (activeBooking && (activeBooking.id === first.id || activeBooking.token_id === first.id)) {
        activeBooking.status = 'GATE_IN';
        activeBooking.stage = Math.max(2, activeBooking.stage || 0);
        localStorage.setItem('latest_booking', JSON.stringify(activeBooking));
      }
    } catch (e) {}

    const callNotif = {
      id: crypto.randomUUID(),
      title: `Gate Entry Called: ${first.id}`,
      message: `${first.name} (${first.id}) called for verification at Gate 1.`,
      category: 'Queue',
      read: false,
      date: dateISO(),
      time: new Date().toLocaleTimeString(),
      audience: 'All Farmers',
      delivery: 'Sent'
    };

    return {
      ...d,
      tokens: updatedTokens,
      notifications: [callNotif, ...(d.notifications || [])],
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
    setUser,
    addBooking,
    notify,
    advanceQueue,
    getCenterCrowd: (centerName) => getCenterCrowdMetrics(centerName || data.selectedCenter, data.tokens, data.centers),
    getFarmerEstimate: (phoneOrToken, centerName) => getFarmerWaitEstimate(phoneOrToken, centerName || data.selectedCenter, data.tokens, data.centers),
    connection,
    toast: setToast
  }}>{children}{toast && <div className="toast" style={toast.startsWith('Error:') ? {backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171'} : {}} role="status">{toast.startsWith('Error:') ? '⚠' : '✓'} {toast.replace('Error: ', '')}<button aria-label="Dismiss message" onClick={() => setToast('')}>×</button></div>}</Context.Provider>;
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
  a.download = `Krishi-Kalyan-${name}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
