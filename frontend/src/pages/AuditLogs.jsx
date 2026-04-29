import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, RefreshCw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  LogIn, UserPlus, UserMinus, KeyRound, Trash2,
  Smartphone, RotateCcw, Tags, Globe, AlertCircle,
  CalendarDays, Search, X, Filter,
} from 'lucide-react';
import { fetchAuditLogs } from '../services/api.js';

const AUTO_REFRESH_MS = 30_000;
const PAGE_SIZE = 50;

// ── Action metadata ───────────────────────────────────────────────────────────

const ACTION_META = {
  'login.success':        { label: 'Login',              color: 'bg-blue-100 text-blue-700',     Icon: LogIn },
  'login.failure':        { label: 'Login Failed',       color: 'bg-red-100 text-red-700',       Icon: AlertCircle },
  'user.create':          { label: 'Create User',        color: 'bg-green-100 text-green-700',   Icon: UserPlus },
  'user.delete':          { label: 'Delete User',        color: 'bg-red-100 text-red-700',       Icon: UserMinus },
  'user.password_change': { label: 'Change Password',    color: 'bg-yellow-100 text-yellow-700', Icon: KeyRound },
  'apikey.create':        { label: 'Create API Key',     color: 'bg-green-100 text-green-700',   Icon: KeyRound },
  'apikey.revoke':        { label: 'Revoke API Key',     color: 'bg-red-100 text-red-700',       Icon: Trash2 },
  'instance.add':         { label: 'Add Instance',       color: 'bg-green-100 text-green-700',   Icon: Smartphone },
  'instance.remove':      { label: 'Remove Instance',    color: 'bg-red-100 text-red-700',       Icon: Smartphone },
  'instance.reset':       { label: 'Reset Instance',     color: 'bg-yellow-100 text-yellow-700', Icon: RotateCcw },
  'alias.set':            { label: 'Set Group Alias',    color: 'bg-purple-100 text-purple-700', Icon: Tags },
  'alias.delete':         { label: 'Delete Group Alias', color: 'bg-red-100 text-red-700',       Icon: Tags },
  'ip.add':               { label: 'Add Allowed IP',     color: 'bg-green-100 text-green-700',   Icon: Globe },
  'ip.remove':            { label: 'Remove Allowed IP',  color: 'bg-red-100 text-red-700',       Icon: Globe },
};

function getActionMeta(action) {
  return ACTION_META[action] ?? { label: action, color: 'bg-gray-100 text-gray-600', Icon: ShieldCheck };
}

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgoStr(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

function DetailsGrid({ details }) {
  if (!details || typeof details !== 'object') return <span className="text-xs text-gray-400">{String(details ?? '—')}</span>;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {Object.entries(details).map(([k, v]) => (
        <div key={k} className="flex items-center gap-1 text-xs">
          <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
          <span className="font-mono text-gray-700">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditLogs() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [hasMore, setHasMore]   = useState(false);

  // Cursor-based pagination
  const [pageIdx, setPageIdx]   = useState(0);
  const [cursors, setCursors]   = useState([null]);

  // Filters
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');
  const [actionFilter, setActionFilter]   = useState('');
  const [actorInput, setActorInput]       = useState('');
  const [actor, setActor]                 = useState('');

  // Debounce actor input 400 ms
  useEffect(() => {
    const t = setTimeout(() => setActor(actorInput), 400);
    return () => clearTimeout(t);
  }, [actorInput]);

  const hasFilters = dateFrom || dateTo || actionFilter || actor;

  function clearFilters() {
    setDateFrom(''); setDateTo('');
    setActionFilter('');
    setActorInput(''); setActor('');
  }

  // ── Core fetch ───────────────────────────────────────────────────────────────
  async function doFetch(cursor, idx) {
    setLoading(true);
    setError(null);
    setExpanded(null);
    try {
      const res = await fetchAuditLogs({
        limit: PAGE_SIZE,
        cursor: cursor || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        action: actionFilter || undefined,
        actor: actor || undefined,
      });
      const { logs: newLogs, hasMore: more, nextCursor: nc } = res.data;
      setLogs(newLogs);
      setHasMore(more);
      setPageIdx(idx);
      if (nc) {
        setCursors((prev) => {
          const next = [...prev];
          if (!next[idx + 1]) next[idx + 1] = nc;
          return next;
        });
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }

  // loadLogs resets to page 0 — used on filter change + manual refresh + auto-refresh
  const loadLogs = useCallback(async () => {
    setCursors([null]);
    setPageIdx(0);
    setLoading(true);
    setError(null);
    setExpanded(null);
    try {
      const res = await fetchAuditLogs({
        limit: PAGE_SIZE,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        action: actionFilter || undefined,
        actor: actor || undefined,
      });
      const { logs: newLogs, hasMore: more, nextCursor: nc } = res.data;
      setLogs(newLogs);
      setHasMore(more);
      if (nc) setCursors([null, nc]);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, actionFilter, actor]);

  function goNext() {
    if (!hasMore || loading) return;
    const nextIdx = pageIdx + 1;
    const nextCursor = cursors[nextIdx];
    if (nextCursor) doFetch(nextCursor, nextIdx);
  }

  function goPrev() {
    if (pageIdx === 0 || loading) return;
    doFetch(cursors[pageIdx - 1], pageIdx - 1);
  }

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Auto-refresh only on page 0
  useEffect(() => {
    const timer = setInterval(() => {
      if (pageIdx === 0) loadLogs();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadLogs, pageIdx]);

  return (
    <div className="max-w-4xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All admin activity · auto-refreshes every 30 s on page 1
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

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 space-y-3">
        {/* Date range */}
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-600">Date:</span>
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
          <div className="flex items-center gap-1 ml-auto flex-wrap">
            {[
              { label: 'Today',   from: todayStr(),     to: todayStr() },
              { label: '7 days',  from: daysAgoStr(6),  to: todayStr() },
              { label: '30 days', from: daysAgoStr(29), to: todayStr() },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
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

        {/* Action type + actor row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition text-gray-700"
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_META).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by user…"
              value={actorInput}
              onChange={(e) => setActorInput(e.target.value)}
              className="pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition w-44"
            />
            {actorInput && (
              <button
                onClick={() => { setActorInput(''); setActor(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-auto"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-gray-500">Filters:</span>
          {(dateFrom || dateTo) && (
            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
              <CalendarDays className="w-3 h-3" />
              {dateFrom || '…'} → {dateTo || '…'}
            </span>
          )}
          {actionFilter && (
            <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
              <Filter className="w-3 h-3" />
              {ACTION_META[actionFilter]?.label ?? actionFilter}
            </span>
          )}
          {actor && (
            <span className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full">
              <Search className="w-3 h-3" />
              User: "{actor}"
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading && !logs.length && (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}

        {!loading && !logs.length && !error && (
          <div className="text-center py-14">
            <ShieldCheck className="w-12 h-12 mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm font-medium">No activity found</p>
            <p className="text-gray-400 text-xs mt-1">
              {hasFilters ? 'No entries match the selected filters.' : 'Actions performed by admin users will appear here.'}
            </p>
          </div>
        )}

        {logs.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {logs.map((log, idx) => {
              const { label, color, Icon } = getActionMeta(log.action);
              const isExpanded = expanded === idx;

              return (
                <li key={idx}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : idx)}
                    className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${color}`}>
                        <Icon className="w-3 h-3" />
                        {label}
                      </span>

                      <span className="text-xs font-semibold text-gray-700 flex-shrink-0">
                        {log.actor ?? <span className="text-gray-400 font-normal italic">system</span>}
                      </span>

                      {log.details && (
                        <span className="text-xs text-gray-400 truncate min-w-0">
                          {Object.values(log.details).map((v) => `${v}`).join(' · ')}
                        </span>
                      )}

                      <div className="ml-auto flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-400">{fmt(log.timestamp)}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-300" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-300" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Detail label="Timestamp"  value={fmt(log.timestamp)} />
                        <Detail label="Actor">
                          {log.actor
                            ? <span className="text-xs font-semibold">{log.actor}</span>
                            : <span className="text-xs text-gray-400 italic">system / unauthenticated</span>}
                        </Detail>
                        <Detail label="Source IP"  value={log.ip || '—'} mono />
                        <Detail label="Action">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
                            <Icon className="w-3 h-3" />{label}
                          </span>
                        </Detail>
                        {log.details && (
                          <div className="sm:col-span-2">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Details</p>
                            <DetailsGrid details={log.details} />
                          </div>
                        )}
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

function Detail({ label, value, mono = false, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      {children ?? <p className={`text-xs text-gray-700 ${mono ? 'font-mono' : ''}`}>{value}</p>}
    </div>
  );
}
