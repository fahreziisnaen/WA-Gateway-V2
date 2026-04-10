import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Copy, Check, RefreshCw, Info } from 'lucide-react';
import { fetchGroups } from '../services/api.js';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(null);

  async function loadGroups() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGroups();
      // Sort alphabetically by name
      const sorted = [...res.data].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      setGroups(sorted);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to load groups. Is WhatsApp connected?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) => g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q)
    );
  }, [groups, search]);

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 2_000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(text);
      setTimeout(() => setCopied(null), 2_000);
    }
  }

  const initials = (name) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');

  // Deterministic avatar colour from group id
  const avatarColor = (id) => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-orange-100 text-orange-700',
      'bg-teal-100 text-teal-700',
      'bg-indigo-100 text-indigo-700',
    ];
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[h % colors.length];
  };

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {groups.length} group{groups.length !== 1 ? 's' : ''} joined
          </p>
        </div>
        <button
          onClick={loadGroups}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Read-only notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          <strong>Read-only view.</strong> Copy a Group ID and use it as the{' '}
          <code className="bg-blue-100 px-1 rounded text-xs">id</code> field in the{' '}
          <code className="bg-blue-100 px-1 rounded text-xs">POST /send-message</code> API to send messages.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by group name or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading && !groups.length && (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading groups…
          </div>
        )}

        {!loading && !groups.length && !error && (
          <div className="text-center py-14">
            <Users className="w-12 h-12 mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm font-medium">No groups found</p>
            <p className="text-gray-400 text-xs mt-1">Make sure WhatsApp is connected.</p>
          </div>
        )}

        {!loading && groups.length > 0 && filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No groups match <strong>"{search}"</strong>
          </div>
        )}

        {filtered.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {filtered.map((group) => (
              <li key={group.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(
                    group.id
                  )}`}
                >
                  {initials(group.name) || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{group.name}</p>
                  <p className="text-xs font-mono text-gray-400 truncate">{group.id}</p>
                </div>

                {/* Copy button */}
                <button
                  onClick={() => copyToClipboard(group.id)}
                  title="Copy Group ID"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all px-2 py-1 rounded-md hover:bg-gray-100"
                >
                  {copied === group.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-green-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
