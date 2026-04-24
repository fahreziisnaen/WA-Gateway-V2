import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import socket from './services/socket.js';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Instances from './pages/Instances.jsx';
import Groups from './pages/Groups.jsx';
import Logs from './pages/Logs.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import Docs from './pages/Docs.jsx';
import { fetchStatus } from './services/api.js';

function ProtectedApp() {
  const { isLoggedIn } = useAuth();
  const [instances, setInstances] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchStatus()
      .then((res) => setInstances(res.data.instances ?? []))
      .catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => {
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    // Update instance in list when status changes
    socket.on('instance_status', (data) => {
      setInstances((prev) => {
        const idx = prev.findIndex((i) => i.id === data.id);
        if (idx === -1) return [...prev, data];
        const next = [...prev];
        next[idx] = { ...next[idx], ...data };
        return next;
      });
    });

    // Add new instance to list immediately when created
    socket.on('instance_added', (data) => {
      setInstances((prev) => {
        if (prev.find((i) => i.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    // Remove instance from list immediately when deleted
    socket.on('instance_removed', ({ id }) => {
      setInstances((prev) => prev.filter((i) => i.id !== id));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('instance_status');
      socket.off('instance_added');
      socket.off('instance_removed');
    };
  }, []);

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  return (
    <Layout instances={instances} socketConnected={socketConnected}>
      <Routes>
        <Route path="/" element={<Dashboard instances={instances} />} />
        <Route path="/instances" element={<Instances />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/docs" element={<Docs instances={instances} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicLogin />} />
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </AuthProvider>
  );
}

function PublicLogin() {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) return <Navigate to="/" replace />;
  return <Login />;
}
