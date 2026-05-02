import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, ShieldAlert } from 'lucide-react';
import { changePassword } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ForcePasswordChangeModal() {
  const { user, setUser } = useAuth();
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!user?.mustChangePassword) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPw.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await changePassword(user.id, newPw);
      const updatedUser = { ...user, mustChangePassword: false };
      setUser(updatedUser);
      localStorage.setItem('wa_user', JSON.stringify(updatedUser));
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 leading-tight">
              Action Required
            </h2>
            <p className="text-sm text-gray-500">
              Please change your default password
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-5">
          For security reasons, you must change your password before you can access the dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
                placeholder="Min. 6 characters"
                minLength={6}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || newPw.length < 6}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-wa-green hover:bg-wa-teal disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
