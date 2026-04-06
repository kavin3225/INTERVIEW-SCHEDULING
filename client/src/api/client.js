const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function api(url, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
  forgotPassword: (email) => api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  submitRecoveryRequest: (body) => api('/auth/recovery-request', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (token, password) =>
    api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
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
  listMessages: (id) => api(`/slots/${id}/messages`),
  sendMessage: (id, body) => api(`/slots/${id}/messages`, { method: 'POST', body: JSON.stringify(body) }),
};

export const bookingsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/bookings${q ? `?${q}` : ''}`);
  },
  get: (id) => api(`/bookings/${id}`),
  create: (body) => api('/bookings', {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  updateStatus: (id, status) => api(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id) => api(`/bookings/${id}`, { method: 'DELETE' }),
  reschedule: (id, newSlotId) =>
    api(`/bookings/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ newSlotId }),
    }),
  listMessages: (id) => api(`/bookings/${id}/messages`),
  sendMessage: (id, body) => api(`/bookings/${id}/messages`, { method: 'POST', body: JSON.stringify(body) }),
};

export const reportsApi = {
  overview: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/reports/overview${q ? `?${q}` : ''}`);
  },
  downloadPdf: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const token = getToken();
    const res = await fetch(`${API_BASE}/reports/overview/pdf${q ? `?${q}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || res.statusText || 'PDF download failed');
    }
    return res.blob();
  },
  downloadCsv: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const token = getToken();
    const res = await fetch(`${API_BASE}/reports/overview/csv${q ? `?${q}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || res.statusText || 'CSV download failed');
    }
    return res.blob();
  },
};

export const usersApi = {
  list: () => api('/users'),
  createAdmin: (body) => api('/users/admin', { method: 'POST', body: JSON.stringify(body) }),
  createRecruiter: (body) => api('/users/recruiter', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id) => api(`/users/${id}`, { method: 'DELETE' }),
  kickByEmail: (email) => api('/users/kick', { method: 'POST', body: JSON.stringify({ email }) }),
  updateRecovery: (id, body) => api(`/users/${id}/recovery`, { method: 'PATCH', body: JSON.stringify(body) }),
  listRecoveryRequests: () => api('/users/recovery-requests/all'),
  updateRecoveryRequest: (id, body) => api(`/users/recovery-requests/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const blockedDatesApi = {
  list: () => api('/blocked-dates'),
  block: (blockedDate, reason) => api('/blocked-dates', { method: 'POST', body: JSON.stringify({ blockedDate, reason }) }),
  unblock: (id) => api(`/blocked-dates/${id}`, { method: 'DELETE' }),
};
