const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const baseUrl = configuredBaseUrl.replace(/\/$/, '');

function endpoint(path) {
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
    const response = await fetch(endpoint(path), {
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
  farmer: {
    mandiTraffic: () => apiRequest('/api/v1/farmer/mandis/traffic'),
    createBooking: body => apiRequest('/api/v1/farmer/booking/create', { method: 'POST', body }),
    getPass: tokenId => apiRequest(`/api/v1/farmer/pass/${encodeURIComponent(tokenId)}`),
    rescheduleBooking: (tokenId, body) => apiRequest(`/api/v1/farmer/booking/${encodeURIComponent(tokenId)}/reschedule`, { method: 'PATCH', body }),
    cancelBooking: tokenId => apiRequest(`/api/v1/farmer/booking/${encodeURIComponent(tokenId)}/cancel`, { method: 'PUT' }),
    createPool: body => apiRequest('/api/v1/farmer/pool/create', { method: 'POST', body }),
    joinPool: body => apiRequest('/api/v1/farmer/pool/join', { method: 'POST', body }),
    poolManifest: poolId => apiRequest(`/api/v1/farmer/pool/${encodeURIComponent(poolId)}/manifest`),
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

export const apiBaseUrl = baseUrl || window.location.origin;
