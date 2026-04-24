import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach JWT from localStorage to every dashboard request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wa_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('wa_token');
      localStorage.removeItem('wa_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (username, password) =>
  api.post('/auth/login', { username, password });

// ── Status (legacy) ───────────────────────────────────────────────────────────
export const fetchStatus = () => api.get('/status');

// ── Instances ─────────────────────────────────────────────────────────────────
export const fetchInstances = () => api.get('/instances');
export const addInstance = (id, name) => api.post('/instances', { id, name });
export const removeInstance = (id) => api.delete(`/instances/${id}`);
export const resetInstance = (id) => api.post(`/instances/${id}/reset`);
export const fetchInstanceQR = (id) => api.get(`/instances/${id}/qr`);
export const fetchInstanceGroups = (id) => api.get(`/instances/${id}/groups`);

// ── Other dashboard endpoints ─────────────────────────────────────────────────
export const fetchLogs = ({ limit = 100, from, to, cursor, status } = {}) => {
  const params = new URLSearchParams({ limit });
  if (from)   params.set('from', from);
  if (to)     params.set('to', to);
  if (cursor) params.set('cursor', cursor);
  if (status && status !== 'all') params.set('status', status);
  return api.get(`/logs?${params}`);
};

// ── Groups (legacy — now per instance) ───────────────────────────────────────
export const fetchGroups = (instanceId) => api.get(`/instances/${instanceId}/groups`);

// ── Users ─────────────────────────────────────────────────────────────────────
export const fetchUsers = () => api.get('/admin/users');
export const createUser = (username, password) =>
  api.post('/admin/users', { username, password });
export const changePassword = (id, password) =>
  api.put(`/admin/users/${id}/password`, { password });
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

// ── API Keys ──────────────────────────────────────────────────────────────────
export const fetchApiKeys = () => api.get('/admin/apikeys');
export const createApiKey = (name) => api.post('/admin/apikeys', { name });
export const revokeApiKey = (id) => api.delete(`/admin/apikeys/${id}`);

// ── Group Aliases ──────────────────────────────────────────────────────────────
export const fetchGroupAliases = () => api.get('/admin/group-aliases');
export const setGroupAlias = (alias, jid, label) =>
  api.post('/admin/group-aliases', { alias, jid, label });
export const deleteGroupAlias = (alias) =>
  api.delete(`/admin/group-aliases/${encodeURIComponent(alias)}`);

// ── Allowed IPs (whitelist) ────────────────────────────────────────────────────
export const fetchAllowedIps = () => api.get('/admin/allowed-ips');
export const addAllowedIp = (ip, label) =>
  api.post('/admin/allowed-ips', { ip, label });
export const removeAllowedIp = (ip) =>
  api.delete(`/admin/allowed-ips/${encodeURIComponent(ip)}`);

export default api;
