import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import { fetchLogs } from '../services/api.js';

const LIMITS = [50, 100, 200, 500];
const AUTO_REFRESH_MS = 15_000;

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(100);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLogs(limit);
      setLogs(res.data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to load logs.');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Auto-refresh
  useEffect(() => {
    const timer = setInterval(loadLogs, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadLogs]);

  const successCount = logs.filter((l) => l.status === 'success').length;
  const failCount = logs.filter((l) => l.status === 'failed').length;
  const successRate =
    logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;

  function fmt(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function clip(str, n) {
    if (!str) return '—';
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Auto-refreshes every 15 seconds</p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<BarChart3 className="w-4 h-4 text-gray-400" />}
          label="Total"
          value={logs.length}
          className="text-gray-900"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
          label="Success"
          value={successCount}
          className="text-green-600"
        />
        <StatCard
          icon={<XCircle className="w-4 h-4 text-red-500" />}
          label="Failed"
          value={failCount}
          className="text-red-600"
        />
        <StatCard
          icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
          label="Success Rate"
          value={`${successRate}%`}
          className="text-blue-600"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading && !logs.length && (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading logs…
          </div>
        )}

        {!loading && !logs.length && !error && (
          <div className="text-center py-14">
            <ScrollText className="w-12 h-12 mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm font-medium">No logs yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Logs appear here after messages are sent via the API.
            </p>
          </div>
        )}

        {logs.length > 0 && (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <Th>Timestamp</Th>
                  <Th>Recipient</Th>
                  <Th>Message</Th>
                  <Th>Status</Th>
                  <Th>Error</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {fmt(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                        {clip(log.id, 35)}
                      </code>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span
                        className="text-xs text-gray-700 line-clamp-2"
                        title={log.message}
                      >
                        {log.message || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-500 max-w-xs">
                      <span title={log.error}>{clip(log.error, 50)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Limit selector */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Show:</span>
        {LIMITS.map((n) => (
          <button
            key={n}
            onClick={() => setLimit(n)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              limit === n
                ? 'bg-wa-green text-white shadow-sm'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            {n}
          </button>
        ))}
        <span>entries</span>
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
      {children}
    </th>
  );
}

function StatCard({ icon, label, value, className }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-bold ${className}`}>{value}</p>
    </div>
  );
}
