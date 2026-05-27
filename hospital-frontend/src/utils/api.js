export const API_BASE = process.env.REACT_APP_API_BASE || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : 'https://carenest-hospital-bedmanagement.onrender.com');

const getToken = () => localStorage.getItem('token');

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

export const api = {
  get: (endpoint) => apiRequest(endpoint),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body) })
};

export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  let formatted = dateStr;
  if (typeof formatted === 'string') {
    // If it does not contain a timezone offset, treat it as UTC and convert to ISO-8601
    if (!formatted.endsWith('Z') && !formatted.includes('+') && !formatted.includes('-')) {
      formatted = formatted.replace(' ', 'T');
      if (!formatted.endsWith('Z')) {
        formatted += 'Z';
      }
    }
  }
  return new Date(formatted);
};

export const formatDateTimeIST = (dateInput) => {
  if (!dateInput) return '—';
  const date = dateInput instanceof Date ? dateInput : parseDate(dateInput);
  if (!date || isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};

export const formatDateIST = (dateInput) => {
  if (!dateInput) return '—';
  const date = dateInput instanceof Date ? dateInput : parseDate(dateInput);
  if (!date || isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
};

export const formatTimeIST = (dateInput) => {
  if (!dateInput) return '—';
  const date = dateInput instanceof Date ? dateInput : parseDate(dateInput);
  if (!date || isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
};
