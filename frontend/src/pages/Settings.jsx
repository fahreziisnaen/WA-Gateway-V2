import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Users,
  Key,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Shield,
  AlertTriangle,
  CheckCircle2,
  X,
  Hash,
} from 'lucide-react';
import {
  fetchUsers,
  createUser,
  changePassword,
  deleteUser,
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  fetchGroupAliases,
  setGroupAlias,
  deleteGroupAlias,
  fetchAllowedIps,
  addAllowedIp,
  removeAllowedIp,
} from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const TABS = [
  { id: 'apikeys', label: 'API Keys', Icon: Key },
  { id: 'users', label: 'Users', Icon: Users },
  { id: 'aliases', label: 'Group Aliases', Icon: Hash },
  { id: 'ips', label: 'Allowed IPs', Icon: Shield },
];

export default function Settings() {
  const [tab, setTab] = useState('apikeys');

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-500" />
          Settings
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage API keys, users, and access control</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'apikeys' && <ApiKeysTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'aliases' && <GroupAliasesTab />}
      {tab === 'ips' && <AllowedIpsTab />}
    </div>
  );
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null); // shown once after creation
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchApiKeys();
      setKeys(res.data);
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4000);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await createApiKey(newName.trim());
      setNewKey(res.data); // full key shown once
      setNewName('');
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id, name) {
    if (!window.confirm(`Revoke key "${name}"? This cannot be undone.`)) return;
    try {
      await revokeApiKey(id);
      showFlash('success', `Key "${name}" revoked`);
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to revoke key');
    }
  }

  async function copyKey(key) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {flash && <Flash flash={flash} />}

      {/* New key created — show once */}
      {newKey && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Key "{newKey.name}" created — copy it now!
              </p>
              <p className="text-xs text-green-700 mt-0.5 mb-2">
                This is the only time the full key will be shown.
              </p>
              <code className="block bg-white border border-green-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 break-all">
                {newKey.key}
              </code>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="text-green-600 hover:text-green-800 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => copyKey(newKey.key)}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900 bg-white border border-green-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy key'}
          </button>
        </div>
      )}

      {/* Create form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Generate New API Key</h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            placeholder="Key name (e.g. SolarWinds Prod)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Generating…' : 'Generate'}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          Use the key as <code className="bg-gray-100 px-1 rounded">Authorization: Bearer &lt;key&gt;</code> in Client Side.
        </p>
      </div>

      {/* Key list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Active Keys</h2>
          <button onClick={load} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!loading && keys.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No API keys yet. Generate one above.
          </div>
        )}

        <ul className="divide-y divide-gray-50">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{k.name}</p>
                <p className="text-xs font-mono text-gray-400 mt-0.5">{k.keyMasked}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsed && (
                    <span className="ml-2">· Last used {new Date(k.lastUsed).toLocaleDateString()}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(k.id, k.name)}
                title="Revoke key"
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Revoke
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);

  // New user form
  const [newForm, setNewForm] = useState({ username: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Change password modal
  const [pwModal, setPwModal] = useState(null); // { id, username }
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchUsers();
      setUsers(res.data);
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4000);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await createUser(newForm.username, newForm.password);
      setNewForm({ username: '', password: '' });
      showFlash('success', `User "${newForm.username}" created`);
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id, username) {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try {
      await deleteUser(id);
      showFlash('success', `User "${username}" deleted`);
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to delete user');
    }
  }

  async function handleChangePw(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await changePassword(pwModal.id, newPw);
      showFlash('success', `Password updated for "${pwModal.username}"`);
      setPwModal(null);
      setNewPw('');
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {flash && <Flash flash={flash} />}

      {/* Add user */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Add User</h2>
        <form onSubmit={handleCreate} className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Username"
            value={newForm.username}
            onChange={(e) => setNewForm({ ...newForm, username: e.target.value })}
            className="flex-1 min-w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
            required
          />
          <div className="relative flex-1 min-w-40">
            <input
              type={showNewPw ? 'text' : 'password'}
              placeholder="Password (min 6 chars)"
              value={newForm.password}
              onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
              className="w-full px-3 py-2 pr-9 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Adding…' : 'Add User'}
          </button>
        </form>
      </div>

      {/* User list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Dashboard Users</h2>
          <button onClick={load} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <ul className="divide-y divide-gray-50">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {u.username}
                  {u.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-wa-teal font-normal">(you)</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {u.role} · Joined {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPwModal(u); setNewPw(''); setShowPw(false); }}
                  className="text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors"
                >
                  Change PW
                </button>
                {u.id !== currentUser?.id && (
                  <button
                    onClick={() => handleDelete(u.id, u.username)}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Change password modal */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Change Password
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              User: <strong>{pwModal.username}</strong>
            </p>
            <form onSubmit={handleChangePw} className="space-y-3">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="New password (min 6 chars)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
                  minLength={6}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPwModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Group Aliases Tab ─────────────────────────────────────────────────────────

function GroupAliasesTab() {
  const [aliases, setAliases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);
  const [form, setForm] = useState({ alias: '', jid: '', label: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchGroupAliases();
      setAliases(res.data);
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to load group aliases');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4000);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.alias.trim() || !form.jid.trim()) return;
    setSaving(true);
    try {
      await setGroupAlias(form.alias.trim(), form.jid.trim(), form.label.trim());
      showFlash('success', `Alias "${form.alias.trim()}" saved successfully`);
      setForm({ alias: '', jid: '', label: '' });
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to save alias');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(alias) {
    if (!window.confirm(`Delete alias "${alias}"?`)) return;
    try {
      await deleteGroupAlias(alias);
      showFlash('success', `Alias "${alias}" deleted`);
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to delete alias');
    }
  }

  async function copyAlias(text) {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      {flash && <Flash flash={flash} />}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-blue-700">
        <p className="text-sm">
          Aliases provide short names for group IDs. Check the <a href="/docs" className="font-semibold underline">Docs</a> for usage examples.
        </p>
      </div>

      {/* Add/update alias form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Add / Update Alias</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-36">
              <label className="block text-xs text-gray-500 mb-1">Alias Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="e.g. alert-it"
                value={form.alias}
                onChange={(e) => setForm({ ...form, alias: e.target.value })}
                pattern="[a-zA-Z0-9_\-]+"
                title="Only letters, numbers, underscores, and hyphens"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition font-mono"
                required
              />
            </div>
            <div className="flex-[2] min-w-48">
              <label className="block text-xs text-gray-500 mb-1">Group JID <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="120363xxxxxxxxxx@g.us"
                value={form.jid}
                onChange={(e) => setForm({ ...form, jid: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition font-mono"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Label (optional)</label>
              <input
                type="text"
                placeholder="Group description"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !form.alias.trim() || !form.jid.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Alias'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            If the alias already exists, it will be updated. Copy Group JID from the{' '}
            <a href="/groups" className="text-wa-teal underline">Groups</a> page.
          </p>
        </form>
      </div>

      {/* Alias list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            Alias List
            {aliases.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">({aliases.length})</span>
            )}
          </h2>
          <button onClick={load} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!loading && aliases.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No aliases yet. Add one above.
          </div>
        )}

        {aliases.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {aliases.map((a) => (
              <li key={a.alias} className="flex items-center gap-4 px-5 py-3.5 group">
                <div className="w-8 h-8 bg-wa-green/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Hash className="w-4 h-4 text-wa-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-semibold text-gray-800">{a.alias}</code>
                    {a.label && (
                      <span className="text-xs text-gray-400 truncate">— {a.label}</span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-400 truncate mt-0.5">{a.jid}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyAlias(a.alias)}
                    title="Copy alias"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {copied === a.alias
                      ? <Check className="w-3.5 h-3.5 text-green-500" />
                      : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setForm({ alias: a.alias, jid: a.jid, label: a.label || '' })}
                    title="Edit alias"
                    className="text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(a.alias)}
                    title="Delete alias"
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Allowed IPs Tab ───────────────────────────────────────────────────────────

function AllowedIpsTab() {
  const [ips, setIps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);
  const [form, setForm] = useState({ ip: '', label: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAllowedIps();
      setIps(res.data);
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to load IP list');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showFlash(type, text) {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4000);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.ip.trim()) return;
    setSaving(true);
    try {
      await addAllowedIp(form.ip.trim(), form.label.trim());
      showFlash('success', `IP "${form.ip.trim()}" added successfully`);
      setForm({ ip: '', label: '' });
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to add IP');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(ip) {
    if (!window.confirm(`Remove IP "${ip}" from whitelist?`)) return;
    try {
      await removeAllowedIp(ip);
      showFlash('success', `IP "${ip}" removed`);
      await load();
    } catch (err) {
      showFlash('error', err.response?.data?.error ?? 'Failed to remove IP');
    }
  }

  return (
    <div className="space-y-4">
      {flash && <Flash flash={flash} />}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-blue-700">
        <p className="text-sm">
          Requests from whitelisted IPs bypass API key authentication. Check the <a href="/docs" className="font-semibold underline">Docs</a> for integration details.
        </p>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Add IP to Whitelist</h2>
        <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-44">
            <input
              type="text"
              placeholder="IP address, CIDR, or wildcard"
              value={form.ip}
              onChange={(e) => setForm({ ...form, ip: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
              required
            />
          </div>
          <div className="flex-1 min-w-36">
            <input
              type="text"
              placeholder="Label (e.g. PRTG Server)"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !form.ip.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-wa-green hover:bg-wa-teal disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>

      {/* IP list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            Allowed IPs
            {ips.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">({ips.length})</span>
            )}
          </h2>
          <button onClick={load} disabled={loading} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!loading && ips.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No IPs whitelisted yet. All requests require an API key.
          </div>
        )}

        {ips.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {ips.map((entry) => (
              <li key={entry.ip} className="flex items-center gap-4 px-5 py-3.5 group">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <code className="text-sm font-mono font-semibold text-gray-800">{entry.ip}</code>
                  {entry.label && (
                    <span className="ml-2 text-xs text-gray-400">— {entry.label}</span>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Added {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(entry.ip)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Caution:</strong> Whitelisted IPs can send messages without authentication.
          Only add trusted internal server IPs (such as PRTG, SolarWinds, Zabbix).
        </p>
      </div>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Flash({ flash }) {
  const isSuccess = flash.type === 'success';
  return (
    <div
      className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${isSuccess
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-700'
        }`}
    >
      {isSuccess
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      {flash.text}
    </div>
  );
}
