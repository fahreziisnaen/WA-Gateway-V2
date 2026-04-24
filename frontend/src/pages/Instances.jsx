import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Smartphone,
  Plus,
  Trash2,
  RefreshCw,
  QrCode,
  Wifi,
  WifiOff,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import {
  fetchInstances,
  addInstance,
  removeInstance,
  resetInstance,
  fetchInstanceQR,
} from '../services/api.js';
import socket from '../services/socket.js';
import StatusBadge from '../components/StatusBadge.jsx';

const QR_POLL_MS = 3000; // refresh QR every 3 seconds

export default function Instances() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  // QR modal state
  const [qrModal, setQrModal] = useState(null);
  // qrModal shape: { id, name, qr, error, status }
  const qrPollRef = useRef(null);
  const qrModalRef = useRef(null);
  useEffect(() => { qrModalRef.current = qrModal; }, [qrModal]);

  // Stop QR polling when instance connects (avoids side-effects inside state updaters)
  useEffect(() => {
    if (qrModal?.status === 'connected') stopQrPoll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrModal?.status]);

  // Copy state
  const [copied, setCopied] = useState(null);

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 5000);
  }

  // ── Instance list ───────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInstances();
      setInstances(res.data);
    } catch {
      showFlash('error', 'Failed to load instances');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll list every 5s for status
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  // ── Socket.IO — real-time instance status ───────────────────────────────────

  useEffect(() => {
    function onInstanceStatus(data) {
      setInstances((prev) => {
        const idx = prev.findIndex((i) => i.id === data.id);
        const record = { id: data.id, name: data.name, status: data.status, phone: data.phone, waName: data.waName };
        if (idx === -1) return [...prev, record];
        const next = [...prev];
        next[idx] = { ...next[idx], ...record };
        return next;
      });

      // Update QR modal if it's open for this instance
      setQrModal((prev) => {
        if (!prev || prev.id !== data.id) return prev;
        if (data.status === 'connected') {
          return { ...prev, status: 'connected', waName: data.waName, phone: data.phone, qr: null };
        }
        return { ...prev, status: data.status, ...(data.qr ? { qr: data.qr, error: null } : {}) };
      });
    }

    function onInstanceAdded(data) {
      setInstances((prev) => {
        if (prev.find((i) => i.id === data.id)) return prev;
        return [...prev, { id: data.id, name: data.name, status: data.status, phone: data.phone, waName: data.waName }];
      });
    }

    function onInstanceRemoved({ id }) {
      setInstances((prev) => prev.filter((i) => i.id !== id));
      if (qrModalRef.current?.id === id) {
        stopQrPoll();
        setQrModal(null);
      }
    }

    function onInstancesInit(list) {
      setInstances(list.map(({ id, name, status, phone, waName }) => ({ id, name, status, phone, waName })));
      // If QR modal is open and we now have QR data, update it
      const modal = qrModalRef.current;
      if (modal) {
        const match = list.find((i) => i.id === modal.id);
        if (match?.qr) setQrModal((prev) => prev ? { ...prev, qr: match.qr, error: null } : prev);
      }
    }

    socket.on('instance_status', onInstanceStatus);
    socket.on('instance_added', onInstanceAdded);
    socket.on('instance_removed', onInstanceRemoved);
    socket.on('instances_init', onInstancesInit);
    return () => {
      socket.off('instance_status', onInstanceStatus);
      socket.off('instance_added', onInstanceAdded);
      socket.off('instance_removed', onInstanceRemoved);
      socket.off('instances_init', onInstancesInit);
    };
  }, []);

  // ── QR polling ──────────────────────────────────────────────────────────────

  function stopQrPoll() {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
  }

  async function refreshQR(id) {
    try {
      const res = await fetchInstanceQR(id);
      setQrModal((prev) => {
        if (!prev || prev.id !== id) return prev; // modal closed
        return { ...prev, qr: res.data.qr, error: null };
      });
    } catch (err) {
      // 404 means either connected already or not yet generated — don't show error during polling
      if (err.response?.status !== 404) {
        setQrModal((prev) => {
          if (!prev || prev.id !== id) return prev;
          return { ...prev, error: 'Failed to fetch QR code' };
        });
      }
    }
  }

  function openQRModal(inst) {
    stopQrPoll();
    setQrModal({ id: inst.id, name: inst.name, qr: null, error: null, status: inst.status });

    // Fetch immediately
    refreshQR(inst.id);

    // Then poll — interval is explicitly stopped by closeQRModal, connected useEffect, or unmount
    qrPollRef.current = setInterval(() => refreshQR(inst.id), QR_POLL_MS);
  }

  function closeQRModal() {
    stopQrPoll();
    setQrModal(null);
  }

  // Cleanup on unmount
  useEffect(() => () => stopQrPoll(), []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true);
    try {
      const id = newId.trim().toLowerCase();
      const name = newName.trim();
      await addInstance(id, name);
      showFlash('success', `Instance "${name}" added. Scan the QR code to connect.`);
      setNewId(''); setNewName(''); setShowAdd(false);
      await load();
      // Auto-open QR modal for the new instance
      openQRModal({ id, name, status: 'connecting' });
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to add instance');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id, name) {
    if (!window.confirm(`Remove instance "${name}"? The session will be deleted.`)) return;
    try {
      if (qrModal?.id === id) closeQRModal();
      await removeInstance(id);
      showFlash('success', `Instance "${name}" removed`);
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to remove instance');
    }
  }

  async function handleReset(id, name) {
    if (!window.confirm(`Reset "${name}"? You will need to scan the QR code again.`)) return;
    try {
      await resetInstance(id);
      showFlash('success', `Instance "${name}" reset`);
      await load();
      // Auto-open QR after reset
      openQRModal({ id, name, status: 'connecting' });
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to reset instance');
    }
  }

  async function copyId(id) {
    await navigator.clipboard.writeText(id).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-gray-500" />
            WhatsApp Instances
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage multiple WhatsApp accounts. Use the Instance ID in the{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">from</code> field when sending messages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-wa-green hover:bg-wa-teal text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Instance
          </button>
        </div>
      </div>

      {flash && <Flash flash={flash} />}

      {/* Usage hint */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
        <p className="font-semibold mb-1">How to use multiple instances:</p>
        <p>Add the <code className="bg-blue-100 px-1 rounded">from</code> field in your API request to specify which WhatsApp account to send from:</p>
        <pre className="mt-2 bg-white border border-blue-200 rounded-lg p-2 text-xs overflow-x-auto">{`{
  "message": "Server alert!",
  "id": "120363...@g.us",
  "from": "wa1"       ← Instance ID listed below
}`}</pre>
        <p className="mt-1 text-xs text-blue-600">
          If <code className="bg-blue-100 px-1 rounded">from</code> is omitted, the first connected instance is used automatically.
        </p>
      </div>

      {/* Instance list */}
      <div className="space-y-3">
        {instances.map((inst) => (
          <div key={inst.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                inst.status === 'connected' ? 'bg-green-100'
                : inst.status === 'connecting' ? 'bg-yellow-100'
                : 'bg-gray-100'
              }`}>
                {inst.status === 'connected'
                  ? <Wifi className="w-5 h-5 text-green-600" />
                  : inst.status === 'connecting'
                  ? <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                  : <WifiOff className="w-5 h-5 text-gray-400" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{inst.name}</p>
                  <StatusBadge status={inst.status} />
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <button
                    onClick={() => copyId(inst.id)}
                    className="flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-gray-700 transition-colors"
                    title="Copy Instance ID"
                  >
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded">{inst.id}</code>
                    {copied === inst.id
                      ? <Check className="w-3 h-3 text-green-500" />
                      : <Copy className="w-3 h-3" />}
                  </button>
                  {inst.phone && <span className="text-xs text-gray-400 font-mono">+{inst.phone}</span>}
                  {inst.waName && <span className="text-xs text-gray-500">{inst.waName}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {inst.status !== 'connected' && (
                  <button
                    onClick={() => openQRModal(inst)}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    QR
                  </button>
                )}
                <button
                  onClick={() => handleReset(inst.id, inst.name)}
                  className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset
                </button>
                <button
                  onClick={() => handleRemove(inst.id, inst.name)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && instances.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <Smartphone className="w-12 h-12 mx-auto text-gray-200 mb-3" />
            <p className="text-sm font-medium">No instances yet</p>
            <p className="text-xs mt-1">Click "Add Instance" to get started.</p>
          </div>
        )}
      </div>

      {/* ── Add Instance Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Add WhatsApp Instance</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Instance ID <span className="text-gray-400">(letters, numbers, _ - only)</span>
                </label>
                <input
                  type="text"
                  placeholder="wa2"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase())}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">
                  Used as the <code className="bg-gray-100 px-1 rounded">from</code> field when sending messages.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="WhatsApp 2"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {adding ? 'Adding…' : 'Add & Scan QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QR Modal ── */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-gray-500" />
                {qrModal.name}
              </h2>
              <button onClick={closeQRModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {/* ── Connected state ── */}
              {qrModal.status === 'connected' ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-9 h-9 text-green-500" />
                  </div>
                  <p className="text-base font-semibold text-gray-900">Connected!</p>
                  {qrModal.waName && (
                    <p className="text-sm text-gray-600 mt-1">{qrModal.waName}</p>
                  )}
                  {qrModal.phone && (
                    <p className="text-xs font-mono text-gray-400 mt-0.5">+{qrModal.phone}</p>
                  )}
                  <button
                    onClick={closeQRModal}
                    className="mt-4 w-full py-2 bg-wa-green hover:bg-wa-teal text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* ── QR loading ── */}
                  {!qrModal.qr && !qrModal.error && (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-wa-green" />
                      <p className="text-sm">Generating QR code…</p>
                    </div>
                  )}

                  {/* ── QR error ── */}
                  {qrModal.error && (
                    <div className="text-center py-6 text-sm text-red-500">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-300" />
                      {qrModal.error}
                    </div>
                  )}

                  {/* ── QR image ── */}
                  {qrModal.qr && (
                    <div className="text-center">
                      {/* Live indicator */}
                      <div className="flex items-center justify-center gap-1.5 mb-3 text-xs text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Live — refreshes every 3s
                      </div>
                      <div className="inline-block p-3 border-2 border-gray-200 rounded-xl shadow-inner bg-white">
                        <img
                          src={qrModal.qr}
                          alt="WhatsApp QR Code"
                          className="w-72 h-72 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* ── Instructions ── */}
                  <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">How to scan:</p>
                    <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                      <li>Open WhatsApp on your phone</li>
                      <li>Tap <strong>Linked Devices</strong></li>
                      <li>Tap <strong>Link a Device</strong></li>
                      <li>Point your camera at this QR code</li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Flash({ flash }) {
  const isSuccess = flash.type === 'success';
  return (
    <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${
      isSuccess
        ? 'bg-green-50 border-green-200 text-green-700'
        : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      {isSuccess
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      {flash.text}
    </div>
  );
}
