const configuredBaseUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL || '').trim();
const baseUrl = configuredBaseUrl.replace(/\/$/, '');

const BASE_URL = baseUrl || 'http://localhost:8000/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('krishi_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const { timeout = 3000, signal: customSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const signal = customSignal || controller.signal;

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  sendOtp: (phoneNumber, options = {}) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone_number: phoneNumber }), ...options }),
  verifyOtp: (payload, options = {}) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(payload), ...options }),
  getCurrentUser: (options = {}) => request('/auth/me', { ...options }),
  getActiveBooking: (phoneNumber, options = {}) => request(`/farmer/my-active-booking?phone_number=${phoneNumber}`, { ...options }),
  getMandiDetails: (mandiId, options = {}) => request(`/farmer/mandis/traffic`, { ...options }),
  createBooking: (payload, options = {}) => request('/farmer/booking/create', { method: 'POST', body: JSON.stringify(payload), ...options }),
};

function getEndpoint(path) {
  if (baseUrl) return `${baseUrl}${path}`;
  return path === '/health' ? '/backend-health' : path;
}

function errorMessage(payload, fallback) {
  if (typeof payload === 'string' && payload) return payload;
  if (typeof payload?.detail === 'string') return payload.detail;
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map(item => item.msg || JSON.stringify(item)).join(', ');
  }
  return payload?.message || fallback;
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function apiRequest(path, { body, signal, ...options } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 45000);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    const response = await fetch(getEndpoint(path), {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const type = response.headers.get('content-type') || '';
    const payload = type.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      throw new ApiError(errorMessage(payload, `Request failed with status ${response.status}.`), response.status, payload);
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError('The backend took too long to respond. Please try again.', 0);
    if (error instanceof ApiError) throw error;
    throw new ApiError('Could not reach the Krishi Kalyan backend.', 0, error);
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export const backendApi = {
  health: () => apiRequest('/health'),
  web: {
    getState: () => apiRequest('/api/v1/web/state'),
    saveState: data => apiRequest('/api/v1/web/state', { method: 'PUT', body: { data } }),
  },
  farmer: {
    mandiTraffic: () => apiRequest('/api/v1/farmer/mandis/traffic'),
    createBooking: body => apiRequest('/api/v1/farmer/booking/create', { method: 'POST', body }),
    getPass: tokenId => apiRequest(`/api/v1/farmer/pass/${encodeURIComponent(tokenId)}`),
    rescheduleBooking: (tokenId, body) => apiRequest(`/api/v1/farmer/booking/${encodeURIComponent(tokenId)}/reschedule`, { method: 'PATCH', body }),
    cancelBooking: tokenId => apiRequest(`/api/v1/farmer/booking/${encodeURIComponent(tokenId)}/cancel`, { method: 'PUT' }),
    createPool: body => apiRequest('/api/v1/farmer/pool/create', { method: 'POST', body }),
    joinPool: body => apiRequest('/api/v1/farmer/pool/join', { method: 'POST', body }),
    poolManifest: poolId => apiRequest(`/api/v1/farmer/pool/${encodeURIComponent(poolId)}/manifest`),
    centerCrowd: centerId => apiRequest(`/api/v1/farmer/center-crowd/${encodeURIComponent(centerId)}`),
    queueEstimate: params => apiRequest(`/api/v1/farmer/queue-estimate?${new URLSearchParams(params).toString()}`),
  },
  center: {
    callNext: centerId => apiRequest(`/api/v1/farmer/center/call-next?center_id=${encodeURIComponent(centerId)}`, { method: 'POST' }),
  },
  gate: {
    scan: body => apiRequest('/api/v1/gate/scan', { method: 'POST', body }),
    entry: body => apiRequest('/api/v1/gate/entry', { method: 'POST', body }),
    verifyTransit: body => apiRequest('/api/v1/gate/transit/verify', { method: 'POST', body }),
    exit: body => apiRequest('/api/v1/gate/exit', { method: 'POST', body }),
  },
  admin: {
    liveStats: () => apiRequest('/api/v1/admin/live-stats'),
    congestionMetrics: () => apiRequest('/api/v1/admin/congestion-metrics'),
    activeVehicles: () => apiRequest('/api/v1/admin/active-vehicles'),
  },
  weighbridge: {
    recordGross: body => apiRequest('/api/v1/weighbridge/record-gross', { method: 'POST', body }),
    recordTare: body => apiRequest('/api/v1/weighbridge/record-tare', { method: 'POST', body }),
  },
  assaying: {
    inspect: body => apiRequest('/api/v1/assaying/inspect', { method: 'POST', body }),
  },
};

export const apiBaseUrl = baseUrl || (typeof window === 'undefined' ? '' : window.location.origin);
