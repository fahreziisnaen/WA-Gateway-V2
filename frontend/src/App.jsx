import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import QRPage from './pages/QRPage.jsx';
import Groups from './pages/Groups.jsx';
import Logs from './pages/Logs.jsx';
import { fetchStatus } from './services/api.js';

// Connect Socket.IO to the same origin (nginx proxies /socket.io/ → backend)
const socket = io('/', {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnectionDelay: 3000,
  reconnectionAttempts: Infinity,
});

const INITIAL_STATUS = { status: 'disconnected', phone: null, name: null };

export default function App() {
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch initial status via HTTP so the UI is accurate on first load
  useEffect(() => {
    fetchStatus()
      .then((res) => setStatus(res.data))
      .catch(() => {}); // ignore — socket will update soon
  }, []);

  useEffect(() => {
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    // Real-time WhatsApp connection updates
    socket.on('status', (data) => {
      setStatus((prev) => ({ ...prev, ...data }));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('status');
    };
  }, []);

  return (
    <Layout status={status} socketConnected={socketConnected}>
      <Routes>
        <Route path="/" element={<Dashboard status={status} />} />
        <Route path="/qr" element={<QRPage status={status} />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/logs" element={<Logs />} />
      </Routes>
    </Layout>
  );
}
