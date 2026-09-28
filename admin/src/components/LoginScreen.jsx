import React, { useState } from 'react';
import { api, auth } from '../services/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [mode, setMode]               = useState('admin'); // 'admin' | 'reseller'
  const [adminPin, setAdminPin]       = useState('');
  const [showPin, setShowPin]         = useState(false);
  const [resellerId, setResellerId]   = useState(auth.getResellerId() || '');
  const [resellerPin, setResellerPin] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!auth.getApiUrl()) {
      setError('Service connection error. Please contact administrator.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.loginAdmin(adminPin);
      if (res?.success) {
        onLoginSuccess('admin');
      } else {
        setError(res?.error || 'Invalid Admin PIN.');
      }
    } catch (err) {
      setError('Connection error: ' + (err.message || 'Server unreachable'));
    }
    setLoading(false);
  };

  const handleResellerLogin = async (e) => {
    e.preventDefault();
    if (!auth.getApiUrl()) {
      setError('Service connection error. Please contact administrator.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.loginReseller(resellerId, resellerPin);
      if (res?.success) {
        if (res.reseller) {
          localStorage.setItem('wg_reseller_info', JSON.stringify(res.reseller));
        }
        onLoginSuccess('reseller');
      } else {
        setError(res?.error || 'Invalid Reseller ID or PIN');
      }
    } catch (err) {
      setError('Connection error: ' + (err.message || 'Server unreachable'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background Ambient Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-cyan-500/10 to-transparent border border-emerald-500/30 shadow-xl shadow-emerald-500/10 mb-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-emerald-500/30 tracking-tight">
              WG
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              WAGrow
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              v1.0.0
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Enterprise License &amp; Reseller Control Center
          </p>
        </div>

        {/* Role Switcher Pill */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 mb-5 shadow-inner">
          <button
            type="button"
            onClick={() => { setMode('admin'); setError(''); }}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              mode === 'admin'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🔐</span>
            <span>Super Admin</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('reseller'); setError(''); }}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              mode === 'reseller'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🏪</span>
            <span>Reseller Partner</span>
          </button>
        </div>

        {/* Glass Card */}
        <div className="glass-panel p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs sm:text-sm font-medium flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {mode === 'admin' ? (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Master Admin PIN
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    maxLength={8}
                    autoFocus
                    className="glass-input text-center text-xl sm:text-2xl tracking-[0.35em] font-mono py-3 text-emerald-400 placeholder:text-slate-600"
                    placeholder="••••••"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-1"
                    title={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3.5 text-sm font-bold shadow-lg shadow-emerald-500/25"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Verifying Admin PIN...</span>
                  </span>
                ) : (
                  <span>Unlock Admin Portal →</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResellerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Reseller ID / Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RES-1001"
                  className="glass-input text-sm font-mono"
                  value={resellerId}
                  onChange={(e) => setResellerId(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Reseller Secret PIN
                </label>
                <input
                  type="password"
                  required
                  maxLength={8}
                  placeholder="••••"
                  className="glass-input text-sm font-mono tracking-widest"
                  value={resellerPin}
                  onChange={(e) => setResellerPin(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full justify-center py-3.5 text-sm font-bold rounded-xl text-white transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Authenticating Reseller...</span>
                  </span>
                ) : (
                  <span>Access Reseller Dashboard →</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6 font-medium">
          WAGrow CRM • Enterprise Portal
        </p>

      </div>
    </div>
  );
}
