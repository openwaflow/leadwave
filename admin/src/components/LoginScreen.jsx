import React, { useState } from 'react';
import { Shield, Store, Lock, Eye, EyeOff, Globe, ChevronDown, ChevronUp, AlertCircle, ArrowRight, Loader2, Check } from 'lucide-react';
import { api, auth } from '../services/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [mode, setMode]               = useState('admin'); // 'admin' | 'reseller'
  const [adminPin, setAdminPin]       = useState('');
  const [showPin, setShowPin]         = useState(false);
  const [resellerId, setResellerId]   = useState(auth.getResellerId() || '');
  const [resellerPin, setResellerPin] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [apiUrl, setApiUrl]           = useState(auth.getApiUrl() || '');
  const [urlSaved, setUrlSaved]       = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!auth.getApiUrl()) {
      setError('Service connection error. Please configure API URL in advanced settings.');
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
      setError('Service connection error. Please configure API URL in advanced settings.');
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

  const handleSaveApiUrl = () => {
    if (apiUrl.trim()) {
      auth.setApiUrl(apiUrl.trim());
      setUrlSaved(true);
      setTimeout(() => setUrlSaved(false), 2000);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#060b17]">
      {/* Background Glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-indigo-500/10 to-transparent border border-[#1e2d4a] shadow-xl mb-3.5">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-emerald-500/30">
              WG
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              WAGrow
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              v1.0.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Central License Administration Portal
          </p>
        </div>

        {/* Role Switcher Pill */}
        <div className="flex bg-[#0d1526] p-1.5 rounded-xl border border-[#1e2d4a] mb-5">
          <button
            type="button"
            onClick={() => { setMode('admin'); setError(''); }}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              mode === 'admin'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Super Admin</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('reseller'); setError(''); }}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              mode === 'reseller'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Reseller Partner</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="glass-panel p-6 sm:p-7">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs sm:text-sm font-medium flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {mode === 'admin' ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Master Admin PIN
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    maxLength={8}
                    autoFocus
                    className="glass-input text-center text-xl sm:text-2xl tracking-[0.35em] font-mono py-2.5 text-emerald-400 placeholder:text-slate-600"
                    placeholder="••••••"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    title={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 text-sm font-semibold shadow-lg shadow-emerald-500/20"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Admin PIN...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Unlock Admin Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResellerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                className="w-full justify-center py-3 text-sm font-semibold rounded-xl text-white transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer border-none"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating Reseller...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Access Reseller Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Advanced API Config Collapsible */}
          <div className="mt-5 pt-4 border-t border-[#1e2d4a]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>API Endpoint Configuration</span>
              </span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-2">
                <input
                  type="url"
                  className="glass-input text-xs font-mono text-slate-300 py-2"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
                <button
                  type="button"
                  onClick={handleSaveApiUrl}
                  className="btn-secondary w-full justify-center text-xs py-1.5"
                >
                  {urlSaved ? (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </span>
                  ) : (
                    <span>Update API Endpoint</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-5 font-mono">
          WAGrow Admin Portal • v1.0.0
        </p>

      </div>
    </div>
  );
}
