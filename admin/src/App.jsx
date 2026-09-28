import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import StatsOverview from './components/StatsOverview';
import LicenseTable from './components/LicenseTable';
import GenerateLicenseModal from './components/GenerateLicenseModal';
import EditLicenseModal from './components/EditLicenseModal';
import ResellersPage from './components/ResellersPage';
import EarningsPage from './components/EarningsPage';
import TrialRequestsPage from './components/TrialRequestsPage';
import SettingsModal from './components/SettingsModal';
import { api, auth } from './services/api';

// ── Navigation items
const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard',       icon: '📊' },
  { id: 'licenses',  label: 'Licenses',         icon: '🔑' },
  { id: 'trials',    label: 'Trial Requests',   icon: '🆓' },
  { id: 'resellers', label: 'Resellers',        icon: '🏪' },
  { id: 'earnings',  label: 'Earnings',         icon: '💰' },
];
const RESELLER_NAV = [
  { id: 'dashboard', label: 'My Dashboard', icon: '📊' },
  { id: 'licenses',  label: 'My Licenses',  icon: '🔑' },
  { id: 'earnings',  label: 'My Earnings',  icon: '💰' },
];

export default function App() {
  const [role, setRole]               = useState(null); // null | 'admin' | 'reseller'
  const [activePage, setActivePage]   = useState('dashboard');
  const [stats, setStats]             = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [licenses, setLicenses]       = useState([]);
  const [licLoading, setLicLoading]   = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editLicense, setEditLicense] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resellerInfo, setResellerInfo] = useState(null);

  // ── Restore session
  useEffect(() => {
    const r = auth.getRole();
    if (r && auth.getApiUrl()) {
      setRole(r);
      if (r === 'reseller') {
        const saved = localStorage.getItem('wg_reseller_info');
        if (saved) { try { setResellerInfo(JSON.parse(saved)); } catch(e) {} }
      }
    }
  }, []);

  // ── Load stats when role is set
  useEffect(() => { if (role) loadStats(); }, [role]);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = role === 'admin' ? await api.getStats() : await api.getResellerStats();
      if (res?.success) setStats(res.stats);
    } catch(e) {}
    setStatsLoading(false);
  };

  const loadLicenses = useCallback(async (search = '', status = 'all') => {
    setLicLoading(true);
    try {
      const res = role === 'admin'
        ? await api.listLicenses(search, status)
        : await api.listMyLicenses(search, status);
      if (res?.success) setLicenses(res.licenses || []);
    } catch(e) {}
    setLicLoading(false);
  }, [role]);

  useEffect(() => {
    if (role && activePage === 'licenses') loadLicenses();
    if (role && activePage === 'dashboard') { loadStats(); if (role === 'admin') loadLicenses(); }
  }, [role, activePage]);

  const handleLoginSuccess = (r) => {
    setRole(r);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    auth.clearAuth();
    setRole(null);
    setStats(null);
    setLicenses([]);
    setResellerInfo(null);
    setActivePage('dashboard');
  };

  const handleCreateLicense = async (formData) => {
    const res = await api.createLicense(formData);
    if (res?.success) { loadLicenses(); loadStats(); }
    return res;
  };

  const handleUpdateLicense = async (d) => {
    const res = await api.updateLicense(d);
    if (res?.success) { loadLicenses(); }
    return res;
  };

  const handleDeleteLicense = async (id) => {
    const res = await api.deleteLicense(id);
    if (res?.success) { loadLicenses(); loadStats(); }
    return res;
  };

  const handleResetDevices = async (key) => {
    await api.resetDevices(key);
    loadLicenses();
  };

  if (!role) return <LoginScreen onLoginSuccess={handleLoginSuccess} />;

  const isReseller = role === 'reseller';
  const navItems   = isReseller ? RESELLER_NAV : ADMIN_NAV;

  // ─── SIDEBAR ──────────────────────────────────────────────────────────────
  const Sidebar = ({ mobile }) => (
    <div style={{
      width: mobile ? '100%' : '220px',
      background: 'rgba(3,7,18,0.95)',
      borderRight: mobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      padding: mobile ? '12px' : '0',
      height: mobile ? 'auto' : '100%'
    }}>
      {/* Logo */}
      <div style={{ padding: mobile ? '4px 8px' : '24px 20px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ height: '36px', width: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#10b981,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '14px', flexShrink: 0 }}>WG</div>
        <div>
          <div style={{ fontWeight: '800', color: '#fff', fontSize: '14px' }}>WAGrow</div>
          <div style={{ fontSize: '10px', color: '#10b981', fontWeight: '600' }}>{isReseller ? 'RESELLER' : 'SUPER ADMIN'}</div>
        </div>
      </div>

      {!mobile && <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 12px' }}></div>}

      {/* Nav */}
      <nav style={{ flex: 1, padding: mobile ? '0' : '0 12px', display: 'flex', flexDirection: mobile ? 'row' : 'column', gap: '2px', flexWrap: 'wrap' }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => { setActivePage(n.id); setSidebarOpen(false); }} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: mobile ? '8px 12px' : '10px 12px',
            borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontWeight: '600', fontSize: '13px', textAlign: 'left',
            background: activePage === n.id ? 'rgba(16,185,129,0.15)' : 'transparent',
            color: activePage === n.id ? '#34d399' : '#475569',
            borderLeft: !mobile && activePage === n.id ? '3px solid #10b981' : '3px solid transparent',
            transition: 'all 0.15s', width: mobile ? 'auto' : '100%'
          }}>
            <span style={{ fontSize: '16px' }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      {!mobile && (
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Reseller info card */}
          {isReseller && (
            <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Commission Rate</div>
              <div style={{ fontWeight: '800', color: '#818cf8', fontSize: '16px' }}>
                {stats?.commission_percent || '--'}%
              </div>
            </div>
          )}
          <button onClick={() => !isReseller && setShowSettings(true)} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: 'none',
            background: 'transparent', color: '#475569', cursor: isReseller ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600',
            opacity: isReseller ? 0.5 : 1
          }}>
            ⚙️ Settings
          </button>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: 'none',
            background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
          }}>
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#060C18' }}>
      {/* Desktop Sidebar */}
      <div style={{ display: 'flex', flexShrink: 0 }} className="hide-mobile">
        <Sidebar />
      </div>

      {/* Mobile Overlay Sidebar */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: 'relative', width: '260px', height: '100%', background: '#030712', borderRight: '1px solid rgba(255,255,255,0.08)', overflow: 'auto' }}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(3,7,18,0.7)', backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Hamburger for mobile */}
            <button onClick={() => setSidebarOpen(true)} className="show-mobile" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', padding: '4px' }}>☰</button>
            <div>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                {navItems.find(n => n.id === activePage)?.icon} {navItems.find(n => n.id === activePage)?.label}
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>
                {isReseller ? `ID: ${auth.getResellerId()} • Reseller Portal` : 'WAGrow Admin Panel'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!isReseller && activePage === 'licenses' && (
              <button onClick={() => setShowGenerate(true)} className="btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
                + New License
              </button>
            )}
            {isReseller && activePage === 'licenses' && (
              <button onClick={() => setShowGenerate(true)} className="btn-primary" style={{ fontSize: '13px', padding: '8px 16px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                + Generate Key
              </button>
            )}
            <button onClick={loadStats} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#64748b', cursor: 'pointer', padding: '7px 10px', fontSize: '14px' }}>
              🔄
            </button>
            <button onClick={handleLogout} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', cursor: 'pointer', padding: '7px 12px', fontSize: '12px', fontWeight: '600' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activePage === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
              <StatsOverview stats={stats} loading={statsLoading} isReseller={isReseller} />

              {/* Recent licenses */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                    {isReseller ? 'My Recent Licenses' : 'Recent Licenses'}
                  </h2>
                  <button onClick={() => setActivePage('licenses')} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                    View All →
                  </button>
                </div>
                <LicenseTable
                  licenses={licenses.slice(0, 6)}
                  loading={licLoading}
                  isReseller={isReseller}
                  onEdit={setEditLicense}
                  onDelete={handleDeleteLicense}
                  onResetDevices={handleResetDevices}
                  onRefresh={loadLicenses}
                  compact={true}
                />
              </div>
            </div>
          )}

          {activePage === 'licenses' && (
            <div style={{ maxWidth: '1400px' }}>
              <LicenseTable
                licenses={licenses}
                loading={licLoading}
                isReseller={isReseller}
                onEdit={setEditLicense}
                onDelete={handleDeleteLicense}
                onResetDevices={handleResetDevices}
                onRefresh={loadLicenses}
                onSearch={loadLicenses}
              />
            </div>
          )}

          {activePage === 'trials' && !isReseller && (
            <div style={{ maxWidth: '1200px' }}>
              <TrialRequestsPage />
            </div>
          )}

          {activePage === 'resellers' && !isReseller && (
            <div style={{ maxWidth: '1200px' }}>
              <ResellersPage />
            </div>
          )}

          {activePage === 'earnings' && (
            <div style={{ maxWidth: '1200px' }}>
              <EarningsPage isReseller={isReseller} />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <GenerateLicenseModal isOpen={showGenerate} onClose={() => setShowGenerate(false)} onCreated={handleCreateLicense} />
      {editLicense && <EditLicenseModal license={editLicense} onClose={() => setEditLicense(null)} onUpdated={handleUpdateLicense} />}
      {showSettings && !isReseller && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
