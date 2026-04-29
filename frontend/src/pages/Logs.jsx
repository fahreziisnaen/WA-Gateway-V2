import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollText, RefreshCw, CheckCircle2, XCircle, Clock,
  BarChart3, Smartphone, Globe, Users, Phone,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  CalendarDays, X, Search,
} from 'lucide-react';
import { fetchLogs } from '../services/api.js';

const AUTO_REFRESH_MS = 15_000;
const PAGE_SIZE = 100;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Logs() {
  const [logs, setLogs]         = useState([]);
  const [stats, setStats]       = useState({ total: 0, success: 0, failed: 0 });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [hasMore, setHasMore]   = useState(false);

  // Cursor-based pagination: cursors[i] = the cursor value needed to fetch page i
  // Page 0 always uses cursor=null (latest records)
  const [pageIdx, setPageIdx]   = useState(0);
  const [cursors, setCursors]   = useState([null]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]             = useState('');

  // Debounce search input 400 ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Core fetch (reads current filter state via closure) ──────────────────────
  async function doFetch(cursor, idx) {
    setLoading(true);
    setError(null);
    setExpanded(null);
    try {
      const res = await fetchLogs({
        limit: PAGE_SIZE,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
        cursor: cursor || undefined,
      });
      const { logs: newLogs, hasMore: more, nextCursor: nc, stats: s } = res.data;
      setLogs(newLogs);
      setStats(s);
      setHasMore(more);
      setPageIdx(idx);
      // Store next cursor so we can navigate forward next time
      if (nc) {
        setCursors((prev) => {
          const next = [...prev];
          if (!next[idx + 1]) next[idx + 1] = nc;
          return next;
        });
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to load logs.');
    } finally {
      setLoading(false);
    }
  }

  // ── loadLogs: always resets to page 0 (used on filter change + manual refresh) ─
  const loadLogs = useCallback(async () => {
    setCursors([null]);
    setPageIdx(0);
    setLoading(true);
    setError(null);
    setExpanded(null);
    try {
      const res = await fetchLogs({
        limit: PAGE_SIZE,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      });
      const { logs: newLogs, hasMore: more, nextCursor: nc, stats: s } = res.data;
      setLogs(newLogs);
      setStats(s);
      setHasMore(more);
      if (nc) setCursors([null, nc]);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to load logs.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter, search]);

  function goNext() {
    if (!hasMore || loading) return;
    const nextIdx = pageIdx + 1;
    const nextCursor = cursors[nextIdx];
    if (nextCursor) doFetch(nextCursor, nextIdx);
  }

  function goPrev() {
    if (pageIdx === 0 || loading) return;
    const prevIdx = pageIdx - 1;
    doFetch(cursors[prevIdx], prevIdx);
  }

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Auto-refresh only on page 0 (new records appear at the top)
  useEffect(() => {
    const timer = setInterval(() => {
      if (pageIdx === 0) loadLogs();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadLogs, pageIdx]);

  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
  const hasDateFilter = dateFrom || dateTo;
  const hasSearch = !!search;

  function toggleStatus(val) {
    setStatusFilter((prev) => (prev === val ? 'all' : val));
    setExpanded(null);
  }

  function clearDateFilter() {
    setDateFrom('');
    setDateTo('');
    setExpanded(null);
  }

  function applyPreset(from, to) {
    setDateFrom(from);
    setDateTo(to);
    setExpanded(null);
  }

  return (
    <div className="max-w-4xl space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Auto-refreshes every 15 s on page 1 · retained for 90 days
          </p>
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

      {/* ── Date range filter ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-600">Date range:</span>

          <input
            type="date"
            value={dateFrom}
            max={dateTo || todayStr()}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            max={todayStr()}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
          />

          {hasDateFilter && (
            <button
              onClick={clearDateFilter}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}

          {/* Quick presets */}
          <div className="flex items-center gap-1 ml-auto">
            {[
              { label: 'Today',   from: todayStr(),    to: todayStr() },
              { label: '7 days',  from: daysAgoStr(6), to: todayStr() },
              { label: '30 days', from: daysAgoStr(29),to: todayStr() },
              { label: '90 days', from: daysAgoStr(89),to: todayStr() },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.from, p.to)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  dateFrom === p.from && dateTo === p.to
                    ? 'bg-wa-green text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by instance, IP, recipient, or message…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(''); setSearch(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<BarChart3 className="w-4 h-4 text-gray-400" />}
          label="Total"
          value={stats.total}
          color="text-gray-900"
          active={statusFilter === 'all'}
          onClick={() => { setStatusFilter('all'); setExpanded(null); }}
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
          label="Success"
          value={stats.success}
          color="text-green-600"
          active={statusFilter === 'success'}
          activeRing="ring-green-300"
          onClick={() => toggleStatus('success')}
        />
        <StatCard
          icon={<XCircle className="w-4 h-4 text-red-500" />}
          label="Failed"
          value={stats.failed}
          color="text-red-600"
          active={statusFilter === 'failed'}
          activeRing="ring-red-300"
          onClick={() => toggleStatus('failed')}
        />
        <StatCard
          icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
          label="Success Rate"
          value={`${successRate}%`}
          color="text-blue-600"
        />
      </div>

      {/* Active filter badges */}
      {(statusFilter !== 'all' || hasDateFilter || hasSearch) && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-gray-500">Filters:</span>

          {hasDateFilter && (
            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
              <CalendarDays className="w-3 h-3" />
              {dateFrom || '…'} → {dateTo || '…'}
            </span>
          )}

          {statusFilter !== 'all' && (
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${
              statusFilter === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {statusFilter === 'success'
                ? <CheckCircle2 className="w-3 h-3" />
                : <XCircle className="w-3 h-3" />}
              {statusFilter === 'success' ? 'Success only' : 'Failed only'}
            </span>
          )}

          {hasSearch && (
            <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
              <Search className="w-3 h-3" />
              "{search}"
            </span>
          )}

          <button
            onClick={() => { setStatusFilter('all'); clearDateFilter(); setSearchInput(''); setSearch(''); }}
            className="text-gray-400 hover:text-gray-700 underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── Log list ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading && !logs.length && (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading logs…
          </div>
        )}

        {!loading && !logs.length && !error && (
          <div className="text-center py-14">
            <ScrollText className="w-12 h-12 mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm font-medium">No logs found</p>
            <p className="text-gray-400 text-xs mt-1">
              {hasDateFilter ? 'No entries in the selected date range.' : 'Logs appear here after messages are sent via the API.'}
            </p>
          </div>
        )}

        {logs.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {logs.map((log, idx) => {
              const isExpanded = expanded === idx;
              const isGroup    = log.id?.endsWith('@g.us');
              const isPersonal = log.id?.endsWith('@s.whatsapp.net') || log.id?.endsWith('@c.us');
              const number     = isPersonal
                ? log.id.replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '')
                : null;

              return (
                <li key={idx}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : idx)}
                    className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {log.status === 'success'
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <XCircle className="w-4 h-4 text-red-500" />}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                            <Clock className="w-3 h-3" />{fmt(log.timestamp)}
                          </span>
                          {log.sourceIp && (
                            <span className="flex items-center gap-1 text-xs text-gray-400 font-mono whitespace-nowrap">
                              <Globe className="w-3 h-3" />{log.sourceIp}
                            </span>
                          )}
                          {log.instanceId && (
                            <span className="flex items-center gap-1 text-xs whitespace-nowrap">
                              <Smartphone className="w-3 h-3 text-gray-400" />
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 text-xs">{log.instanceId}</code>
                              {log.instancePhone && (
                                <span className="text-gray-400 font-mono text-xs">+{log.instancePhone}</span>
                              )}
                            </span>
                          )}
                        </div>

                        <div className="flex items-start gap-4 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isGroup
                              ? <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              : <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-gray-800">
                                {log.recipientName ?? (isGroup ? '—' : number ? `+${number}` : '—')}
                              </span>
                              {isGroup && (
                                <span className="ml-1.5 text-xs text-gray-400 font-mono truncate max-w-[160px] inline-block align-bottom" title={log.id}>
                                  {log.id}
                                </span>
                              )}
                              {isPersonal && log.recipientName && (
                                <span className="ml-1.5 text-xs text-gray-400 font-mono">+{number}</span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 truncate max-w-[300px]" title={log.message}>
                            {log.message || '—'}
                          </p>
                        </div>

                        {log.status === 'failed' && log.error && (
                          <p className="text-xs text-red-500 bg-red-50 rounded px-2 py-1 inline-block">
                            {log.error}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-gray-300 mt-0.5">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                        <Detail label="Timestamp" value={fmt(log.timestamp)} />
                        <Detail label="Status">
                          {log.status === 'success'
                            ? <span className="text-xs font-medium text-green-700">Success</span>
                            : <span className="text-xs font-medium text-red-700">Failed</span>}
                        </Detail>
                        <Detail label="Source IP" value={log.sourceIp || '—'} mono />
                        <Detail label="Instance">
                          {log.instanceId
                            ? <span className="text-xs font-mono">{log.instanceId}{log.instancePhone ? ` (+${log.instancePhone})` : ''}</span>
                            : <span className="text-xs text-gray-400">—</span>}
                        </Detail>
                        <Detail label="Recipient">
                          <span className="text-xs">
                            {log.recipientName && <span className="font-semibold block">{log.recipientName}</span>}
                            <span className="font-mono text-gray-400">{log.id ?? '—'}</span>
                          </span>
                        </Detail>
                        {log.status === 'failed' && (
                          <Detail label="Error">
                            <span className="text-xs text-red-600 break-words">{log.error || '—'}</span>
                          </Detail>
                        )}
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Message</p>
                        <pre className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap break-words font-sans">
                          {log.message || '—'}
                        </pre>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Pagination ── */}
      {(logs.length > 0 || pageIdx > 0) && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Page {pageIdx + 1} · {logs.length} entr{logs.length === 1 ? 'y' : 'ies'}
            {pageIdx === 0 && !loading && ' · auto-refreshing'}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              disabled={pageIdx === 0 || loading}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>

            <span className="w-16 text-center text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl py-2 shadow-sm">
              {pageIdx + 1}
            </span>

            <button
              onClick={goNext}
              disabled={!hasMore || loading}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, active, onClick, activeRing = 'ring-gray-300' }) {
  const clickable = !!onClick;
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      className={`bg-white rounded-xl border shadow-sm p-4 text-left w-full transition-all
        ${clickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
        ${active ? `border-transparent ring-2 ${activeRing}` : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {clickable && (
        <p className="text-[10px] text-gray-400 mt-1">{active ? 'Click to clear' : 'Click to filter'}</p>
      )}
    </button>
  );
}

function Detail({ label, value, mono = false, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      {children ?? <p className={`text-xs text-gray-700 ${mono ? 'font-mono' : ''}`}>{value}</p>}
    </div>
  );
}
