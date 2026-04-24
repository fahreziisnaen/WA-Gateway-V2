import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Copy, Check, RefreshCw, Info, Smartphone, Hash, X, Plus } from 'lucide-react';
import { fetchInstances, fetchGroups, setGroupAlias } from '../services/api.js';

export default function Groups() {
  const [instances, setInstances] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(null);
  const [aliasModal, setAliasModal] = useState(null); // { id, name }

  // Load connected instances
  useEffect(() => {
    fetchInstances()
      .then((res) => {
        const connected = res.data.filter((i) => i.status === 'connected');
        setInstances(connected);
        if (connected.length > 0) setSelectedId(connected[0].id);
      })
      .catch(() => setError('Failed to load instances'));
  }, []);

  // Load groups when instance changes
  useEffect(() => {
    if (!selectedId) return;
    loadGroups(selectedId);
  }, [selectedId]);

  async function loadGroups(id) {
    setLoading(true);
    setError(null);
    setGroups([]);
    try {
      const res = await fetchGroups(id);
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
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  }

  const initials = (name) =>
    name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

  const avatarColor = (id) => {
    const colors = [
      'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700', 'bg-orange-100 text-orange-700',
      'bg-teal-100 text-teal-700', 'bg-indigo-100 text-indigo-700',
    ];
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[h % colors.length];
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {groups.length} group{groups.length !== 1 ? 's' : ''}
            {selectedId && ` on ${instances.find(i => i.id === selectedId)?.name ?? selectedId}`}
          </p>
        </div>
        <button
          onClick={() => selectedId && loadGroups(selectedId)}
          disabled={loading || !selectedId}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Instance selector */}
      {instances.length > 1 && (
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {instances.map((inst) => (
              <button
                key={inst.id}
                onClick={() => setSelectedId(inst.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedId === inst.id
                    ? 'bg-wa-green text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {inst.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {instances.length === 0 && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
          No connected WhatsApp instances. Go to <strong>Instances</strong> page to connect.
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Copy the Group ID or click <strong>Set Alias</strong> to create a short name. Check the <a href="/docs" className="font-semibold underline">Docs</a> for API usage examples.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />Loading…
          </div>
        )}
        {!loading && !groups.length && !error && selectedId && (
          <div className="text-center py-14">
            <Users className="w-12 h-12 mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm font-medium">No groups found</p>
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
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(group.id)}`}>
                  {initials(group.name) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{group.name}</p>
                  <p className="text-xs font-mono text-gray-400 truncate">{group.id}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
                  <button
                    onClick={() => setAliasModal({ id: group.id, name: group.name })}
                    className="flex items-center gap-1 text-xs text-wa-teal hover:text-wa-green hover:bg-wa-green/10 px-2 py-1.5 rounded-md transition-colors"
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span>Set Alias</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(group.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-all"
                  >
                    {copied === group.id
                      ? <><Check className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600">Copied</span></>
                      : <><Copy className="w-3.5 h-3.5" /><span>Copy ID</span></>}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Alias modal */}
      {aliasModal && (
        <AliasModal
          group={aliasModal}
          onClose={() => setAliasModal(null)}
        />
      )}
    </div>
  );
}

function AliasModal({ group, onClose }) {
  const [alias, setAlias] = useState('');
  const [label, setLabel] = useState(group.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    if (!alias.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await setGroupAlias(alias.trim(), group.id, label.trim());
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to save alias');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-wa-teal" />
            <h2 className="text-base font-semibold text-gray-900">Set Group Alias</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-gray-500 mb-0.5">Group</p>
          <p className="text-sm font-medium text-gray-800 truncate">{group.name}</p>
          <p className="text-xs font-mono text-gray-400 truncate">{group.id}</p>
        </div>

        {success ? (
          <div className="flex items-center gap-2 text-green-600 py-2">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Alias saved successfully!</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Alias Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. alert-it"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                pattern="[a-zA-Z0-9_\-]+"
                title="Only letters, numbers, underscores, and hyphens"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
                autoFocus
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                This alias will be used as the <code className="bg-gray-100 px-1 rounded">id</code> field when POSTing.
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Label (optional)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !alias.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
