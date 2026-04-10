import axios from 'axios';

/**
 * In development, Vite proxies /api/* → http://localhost:3000/*
 * In production (Docker), nginx proxies /api/* → http://backend:3000/*
 *
 * VITE_API_KEY is baked in at build time via docker-compose build args.
 */
const API_KEY = import.meta.env.VITE_API_KEY || '';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'x-api-key': API_KEY }),
  },
  timeout: 15_000,
});

// ── Endpoint helpers ──────────────────────────────────────────────────────────

export const fetchStatus = () => api.get('/status');

export const fetchQR = () => api.get('/qr');

export const fetchGroups = () => api.get('/groups');

export const fetchLogs = (limit = 100) => api.get(`/logs?limit=${limit}`);

export const doResetSession = () => api.post('/reset-session');

export const sendMessage = (id, message) =>
  api.post('/send-message', { id, message });

export default api;
