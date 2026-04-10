import React, { useState, useEffect, useCallback } from 'react';
import { QrCode, RefreshCw, CheckCircle2, Smartphone } from 'lucide-react';
import { fetchQR } from '../services/api.js';

const REFRESH_INTERVAL_MS = 30_000;

export default function QRPage({ status }) {
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadQR = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchQR();
      setQr(res.data.qr);
      setLastRefresh(new Date());
    } catch (err) {
      if (err.response?.status === 404) {
        // No QR yet (might be connecting or not started)
        setQr(null);
      } else {
        setError('Failed to fetch QR code. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load QR when not connected
  useEffect(() => {
    if (status.status !== 'connected') loadQR();
  }, [status.status, loadQR]);

  // Auto-refresh every 30s when connecting/disconnected
  useEffect(() => {
    if (status.status === 'connected') return;
    const timer = setInterval(loadQR, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status.status, loadQR]);

  // ── Already connected ────────────────────────────────────────────────────
  if (status.status === 'connected') {
    return (
      <div className="max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">QR Code</h1>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Already Connected</h2>
          <p className="text-sm text-gray-500">
            WhatsApp is active as{' '}
            <span className="font-semibold text-gray-700">{status.name}</span>
            {status.phone && (
              <>
                {' '}
                <span className="font-mono text-gray-500">(+{status.phone})</span>
              </>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-3">
            To link a different account, use <em>Reset Session</em> on the Dashboard.
          </p>
        </div>
      </div>
    );
  }

  // ── QR display ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">QR Code</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-gray-500" />
            Scan to Link
          </h2>
          <button
            onClick={loadQR}
            disabled={loading}
            title="Refresh QR"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="text-center py-6 text-red-500 text-sm">{error}</div>
          )}

          {!error && !qr && !loading && (
            <div className="text-center py-8 text-gray-400">
              <QrCode className="w-14 h-14 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Waiting for QR code…</p>
              <p className="text-xs mt-1">The backend may still be initialising.</p>
            </div>
          )}

          {!error && !qr && loading && (
            <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          )}

          {qr && (
            <div className="text-center">
              <div className="inline-block p-3 bg-white rounded-xl border-2 border-gray-200 shadow-inner">
                <img
                  src={qr}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56 object-contain"
                />
              </div>

              {lastRefresh && (
                <p className="text-xs text-gray-400 mt-3">
                  Last refreshed: {lastRefresh.toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" /> How to scan
          </p>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Open WhatsApp on your phone</li>
            <li>Tap <strong>Linked Devices</strong></li>
            <li>Tap <strong>Link a Device</strong></li>
            <li>Point your camera at this QR code</li>
          </ol>
          <p className="text-[10px] text-gray-400 mt-2">Auto-refreshes every 30 seconds</p>
        </div>
      </div>
    </div>
  );
}
