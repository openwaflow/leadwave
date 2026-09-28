import React, { useState } from 'react';
import { api, auth } from '../services/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [mode, setMode] = useState('admin'); // 'admin' | 'reseller'
  const [adminPin, setAdminPin] = useState('');
  const [resellerId, setResellerId] = useState(auth.getResellerId() || '');
  const [resellerPin, setResellerPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiUrl, setApiUrl] = useState(auth.getApiUrl());
  const [showUrlInput, setShowUrlInput] = useState(!auth.getApiUrl());

  const handleSaveUrl = (e) => {
    e.preventDefault();
    auth.setApiUrl(apiUrl);
    setShowUrlInput(false);
    setError('');
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!auth.getApiUrl()) { setShowUrlInput(true); setError('Pehle Google Apps Script URL configure karein.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.loginAdmin(adminPin);
      if (res?.success) onLoginSuccess('admin');
      else setError(res?.error || 'Invalid Admin PIN. Default: 123456');
    } catch (err) { setError('Connection error: ' + err.message); }
    setLoading(false);
  };

  const handleResellerLogin = async (e) => {
    e.preventDefault();
    if (!auth.getApiUrl()) { setShowUrlInput(true); setError('Pehle Google Apps Script URL configure karein.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.loginReseller(resellerId, resellerPin);
      if (res?.success) onLoginSuccess('reseller');
      else setError(res?.error || 'Invalid Reseller ID or PIN');
    } catch (err) { setError('Connection error: ' + err.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            height: '64px', width: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '24px', fontWeight: '900', color: '#fff',
            boxShadow: '0 10px 30px rgba(16,185,129,0.3)'
          }}>WG</div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: 0 }}>WAGrow CRM</h1>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Admin & Reseller Portal</p>
        </div>

        {/* Role Switcher */}
        <div style={{ display: 'flex', background: '#0f172a', borderRadius: '12px', padding: '4px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {['admin', 'reseller'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: '700', fontSize: '13px', transition: 'all 0.2s', textTransform: 'capitalize',
                background: mode === m ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                color: mode === m ? '#fff' : '#64748b',
                boxShadow: mode === m ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
              }}
            >
              {m === 'admin' ? '🔐 Super Admin' : '🏪 Reseller Login'}
            </button>
          ))}
        </div>

        {/* Login Card */}
        <div className="glass-panel" style={{ padding: '28px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {mode === 'admin' ? (
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Master Admin PIN
                </label>
                <input
                  type="password" required maxLength={8} autoFocus
                  className="glass-input"
                  style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '0.4em', fontFamily: 'monospace' }}
                  placeholder="••••••"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                />
                <p style={{ fontSize: '11px', color: '#475569', textAlign: 'center', marginTop: '6px' }}>
                  Default PIN: <strong style={{ color: '#10b981' }}>123456</strong>
                </p>
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
                {loading ? 'Verifying...' : 'Unlock Admin Dashboard →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResellerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Reseller ID <span style={{ color: '#10b981' }}>*</span>
                </label>
                <input
                  type="text" required
                  className="glass-input mono-text"
                  placeholder="Admin ne jo ID diya ho (e.g. A1B2C3D4)"
                  value={resellerId}
                  onChange={(e) => setResellerId(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  PIN / Password
                </label>
                <input
                  type="password" required maxLength={8}
                  className="glass-input"
                  style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '0.3em', fontFamily: 'monospace' }}
                  placeholder="••••"
                  value={resellerPin}
                  onChange={(e) => setResellerPin(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', padding: '12px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                {loading ? 'Logging in...' : 'Open Reseller Dashboard →'}
              </button>
            </form>
          )}

          {/* URL Config */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <button onClick={() => setShowUrlInput(!showUrlInput)} style={{ fontSize: '11px', color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>
              ⚙️ {auth.getApiUrl() ? 'Change Google Script URL' : 'Configure Google Script URL'}
            </button>
            {showUrlInput && (
              <form onSubmit={handleSaveUrl} style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text" required
                  className="glass-input mono-text"
                  style={{ fontSize: '11px' }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
                <button type="submit" className="btn-secondary" style={{ fontSize: '12px', padding: '8px', justifyContent: 'center' }}>
                  Save URL
                </button>
              </form>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#334155', marginTop: '16px' }}>
          Powered by Google Sheets • 100% Free Serverless
        </p>
      </div>
    </div>
  );
}
