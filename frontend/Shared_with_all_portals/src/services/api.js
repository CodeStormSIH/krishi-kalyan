const BASE_URL = 'http://localhost:8000/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('krishi_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'API request failed');
  }

  return response.json();
}

export const api = {
  sendOtp: (phoneNumber) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone_number: phoneNumber }) }),
  verifyOtp: (payload) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(payload) }),
  getCurrentUser: () => request('/auth/me'),
  getActiveBooking: (phoneNumber) => request(`/farmer/my-active-booking?phone_number=${phoneNumber}`),
  getMandiDetails: (mandiId) => request(`/farmer/mandis/traffic`),
  createBooking: (payload) => request('/farmer/booking/create', { method: 'POST', body: JSON.stringify(payload) }),
};
