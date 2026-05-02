import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [form, setForm] = useState({ username: '', password: '', totpCode: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(form.username, form.password, step === '2fa' ? form.totpCode : undefined);
      if (res?.requires2FA) {
        setStep('2fa');
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/philliplogo.jpg" alt="Phillip Securities" className="w-16 h-16 object-contain mx-auto mb-3 rounded-sm" />
          <h1 className="text-2xl font-bold text-gray-900">Phillip WA Gateway</h1>
          <p className="text-sm text-gray-500 mt-1">Phillip Securities Hong Kong</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {step === 'credentials' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    autoComplete="username"
                    autoFocus
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
                    placeholder="admin"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
                      placeholder="••••••••"
                      required
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
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-wa-green hover:bg-wa-teal disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-wa-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-6 h-6 text-wa-teal" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
                  <p className="text-sm text-gray-500 mt-1">Enter the 6-digit code from your authenticator app.</p>
                </div>

                <div>
                  <input
                    type="text"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    pattern="\d*"
                    value={form.totpCode}
                    onChange={(e) => setForm({ ...form, totpCode: e.target.value })}
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-[0.25em] font-mono focus:outline-none focus:ring-2 focus:ring-wa-green/40 focus:border-wa-green transition"
                    placeholder="000000"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => { setStep('credentials'); setForm({ ...form, totpCode: '' }); setError(null); }}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || form.totpCode.length !== 6}
                    className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-wa-green hover:bg-wa-teal disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors shadow-sm"
                  >
                    {loading ? 'Verifying…' : 'Verify'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

      </div>
    </div>
  );
}
