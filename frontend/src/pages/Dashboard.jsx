import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  User,
  RefreshCw,
  Wifi,
  WifiOff,
  QrCode,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { doResetSession } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Dashboard({ status }) {
  const [resetting, setResetting] = useState(false);
  const [flash, setFlash] = useState(null);

  const isConnected = status.status === 'connected';
  const isConnecting = status.status === 'connecting';

  async function handleReset() {
    if (
      !window.confirm(
        'Reset the session? You will need to scan the QR code again to reconnect.'
      )
    )
      return;

    setResetting(true);
    setFlash(null);

    try {
      await doResetSession();
      setFlash({ type: 'success', text: 'Session reset! Go to the QR page to reconnect.' });
    } catch (err) {
      setFlash({
        type: 'error',
        text: err.response?.data?.error ?? 'Failed to reset session.',
      });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Connection status card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div
          className={`px-6 py-4 flex items-center gap-3 border-b border-gray-100 ${
            isConnected ? 'bg-green-50' : isConnecting ? 'bg-yellow-50' : 'bg-red-50'
          }`}
        >
          {isConnected ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className={`w-5 h-5 ${isConnecting ? 'text-yellow-600' : 'text-red-500'}`} />
          )}
          <h2 className="font-semibold text-gray-800">Connection Status</h2>
          <div className="ml-auto">
            <StatusBadge status={status.status} size="md" />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          <Row
            label={<><Phone className="w-4 h-4 text-gray-400 mr-2" />Phone Number</>}
            value={status.phone ? `+${status.phone}` : '—'}
            mono
          />
          <Row
            label={<><User className="w-4 h-4 text-gray-400 mr-2" />Display Name</>}
            value={status.name ?? '—'}
          />
        </div>
      </div>

      {/* Not connected prompt */}
      {!isConnected && !isConnecting && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <QrCode className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">WhatsApp is not connected</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Scan the QR code to establish a connection.
            </p>
            <Link
              to="/qr"
              className="inline-block mt-2 text-xs font-semibold text-blue-700 hover:underline"
            >
              Go to QR page →
            </Link>
          </div>
        </div>
      )}

      {/* Session management */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Session Management</h2>
        <p className="text-sm text-gray-500 mb-4">
          Reset the session to delete all auth files and force a new QR code scan.
          Use this if the connection is stuck or you need to link a different account.
        </p>

        {flash && (
          <div
            className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
              flash.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {flash.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            {flash.text}
          </div>
        )}

        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Resetting…' : 'Reset Session'}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between px-6 py-3.5">
      <span className="text-sm text-gray-500 flex items-center">{label}</span>
      <span className={`text-sm text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
