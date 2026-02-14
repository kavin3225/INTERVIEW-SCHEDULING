const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function api(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
  return data;
}

export const authApi = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (body) => api('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => api('/auth/me'),
};

export const slotsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/slots${q ? `?${q}` : ''}`);
  },
  get: (id) => api(`/slots/${id}`),
  create: (body) => api('/slots', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/slots/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => api(`/slots/${id}`, { method: 'DELETE' }),
};

export const bookingsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/bookings${q ? `?${q}` : ''}`);
  },
  get: (id) => api(`/bookings/${id}`),
  create: (body) => api('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  updateStatus: (id, status) => api(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export const reportsApi = {
  overview: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/reports/overview${q ? `?${q}` : ''}`);
  },
};

export const usersApi = {
  list: () => api('/users'),
};
