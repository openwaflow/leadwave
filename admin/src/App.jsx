import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  KeyRound,
  Gift,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  RefreshCw,
  Plus,
  ArrowRight,
  Menu,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
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

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard',        icon: LayoutDashboard, desc: 'KPIs & Overview' },
  { id: 'licenses',  label: 'Licenses',         icon: KeyRound,        desc: 'Keys & Activations' },
  { id: 'trials',    label: 'Trial Requests',   icon: Gift,            desc: '2-Day Free Trials' },
  { id: 'resellers', label: 'Reseller Partners',icon: Users,           desc: 'Network & Payouts' },
  { id: 'earnings',  label: 'Earnings & Profit',icon: TrendingUp,      desc: 'Sales Analytics' },
];

const RESELLER_NAV = [
  { id: 'dashboard', label: 'My Dashboard',     icon: LayoutDashboard, desc: 'Performance' },
  { id: 'licenses',  label: 'My Licenses',      icon: KeyRound,        desc: 'Client Keys' },
  { id: 'earnings',  label: 'My Commission',    icon: TrendingUp,      desc: 'Payouts & Balance' },
];

export default function App() {
  const [role, setRole]                   = useState(null); // 'admin' | 'reseller' | null
  const [activePage, setActivePage]       = useState('dashboard');
  const [stats, setStats]                 = useState(null);
  const [statsLoading, setStatsLoading]   = useState(true);
  const [licenses, setLicenses]           = useState([]);
  const [licLoading, setLicLoading]       = useState(true);
  const [showGenerate, setShowGenerate]   = useState(false);
  const [editLicense, setEditLicense]     = useState(null);
  const [showSettings, setShowSettings]   = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [resellerInfo, setResellerInfo]   = useState(null);
  const [isOnline, setIsOnline]           = useState(true);

  // Restore session on load
  useEffect(() => {
    const savedRole = auth.getRole();
    if (savedRole && auth.getApiUrl()) {
      setRole(savedRole);
      if (savedRole === 'reseller') {
        const saved = localStorage.getItem('wg_reseller_info');
        if (saved) { try { setResellerInfo(JSON.parse(saved)); } catch (e) {} }
      }
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = role === 'admin' ? await api.getStats() : await api.getResellerStats();
      if (res?.success) {
        setStats(res.stats);
        setIsOnline(true);
      }
    } catch (e) {
      setIsOnline(false);
    }
    setStatsLoading(false);
  }, [role]);

  const loadLicenses = useCallback(async (search = '', status = 'all') => {
    setLicLoading(true);
    try {
      const res = role === 'admin'
        ? await api.listLicenses(search, status)
        : await api.listMyLicenses(search, status);
      if (res?.success) {
        setLicenses(Array.isArray(res.licenses) ? res.licenses : []);
        setIsOnline(true);
      }
    } catch (e) {
      setIsOnline(false);
    }
    setLicLoading(false);
  }, [role]);

  useEffect(() => {
    if (role) {
      loadStats();
      if (activePage === 'licenses' || activePage === 'dashboard') {
        loadLicenses();
      }
    }
  }, [role, activePage, loadStats, loadLicenses]);

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
    if (res?.success) {
      loadLicenses();
      loadStats();
    }
    return res;
  };

  const handleUpdateLicense = async (d) => {
    const res = await api.updateLicense(d);
    if (res?.success) {
      loadLicenses();
      loadStats();
    }
    return res;
  };

  const handleDeleteLicense = async (lic) => {
    const label = lic.license_key + (lic.customer_name ? ` (${lic.customer_name})` : '');
    if (!window.confirm(`Permanently delete license ${label}? This cannot be undone.`)) return;
    const res = await api.deleteLicense(lic.id || lic.license_key);
    if (res?.success) {
      loadLicenses();
      loadStats();
    } else {
      alert('Delete failed: ' + (res?.error || 'Unknown error'));
    }
  };

  const handleResetDevices = async (key) => {
    if (!window.confirm(`Reset active hardware devices bound to ${key}? Client can re-activate on a new computer.`)) return;
    const res = await api.resetDevices(key);
    if (res?.success) {
      alert('Devices reset successfully! Client can now bind their new PC.');
      loadLicenses();
    } else {
      alert('Reset failed: ' + (res?.error || 'Unknown error'));
    }
  };

  const handleSuspendLicense = async (lic) => {
    const res = await api.suspendLicense(lic.id, lic.license_key);
    if (res?.success) {
      loadLicenses();
    } else {
      alert('Suspend failed: ' + (res?.error || 'Unknown error'));
    }
  };

  const handleActivateLicense = async (lic) => {
    const res = await api.activateLicense(lic.id, lic.license_key);
    if (res?.success) {
      loadLicenses();
    } else {
      alert('Activate failed: ' + (res?.error || 'Unknown error'));
    }
  };

  const handleRegenerateKey = async (lic) => {
    const res = await api.regenerateKey(lic.id, lic.license_key);
    if (res?.success) {
      alert(`New key generated successfully!\n\n${res.new_key}\n\nCopy and share this with the client.`);
      loadLicenses();
    } else {
      alert('Regenerate failed: ' + (res?.error || 'Unknown error'));
    }
  };

  if (!role) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const isReseller = role === 'reseller';
  const navItems   = isReseller ? RESELLER_NAV : ADMIN_NAV;
  const currentNav = navItems.find(n => n.id === activePage) || navItems[0];
  const CurrentIcon = currentNav?.icon || LayoutDashboard;

  // ─── SIDEBAR COMPONENT ──────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#060b17] border-r border-slate-800/80 p-4">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 py-4 mb-2">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-emerald-500/25 flex-shrink-0">
          WG
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-white text-base tracking-tight leading-none">
              WAGrow
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              v1.0.0
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
              {isReseller ? 'Reseller Portal' : 'Admin Center'}
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-800/80 mx-2 mb-4"></div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1">
        {navItems.map((n) => {
          const isActive = activePage === n.id;
          const Icon = n.icon;
          return (
            <button
              key={n.id}
              onClick={() => { setActivePage(n.id); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-xs sm:text-sm transition-all text-left ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <div>
                  <div className="leading-tight">{n.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{n.desc}</div>
                </div>
              </div>
              {isActive && (
                <span className="w-1.5 h-5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Reseller Info */}
      {isReseller && (
        <div className="mb-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
            Reseller Info
          </div>
          <div className="text-xs font-mono text-white font-semibold">
            ID: {auth.getResellerId()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Commission: <strong className="text-indigo-400">{stats?.commission_percent || 30}%</strong>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2">
        {!isReseller && (
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>API Settings</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Logout Portal</span>
        </button>
        <div className="pt-2 text-center text-[10px] text-slate-500 font-mono tracking-wider">
          WAGrow Admin v1.0.0
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#040814]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 h-full z-10 shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 px-4 sm:px-8 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl flex items-center justify-between z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <CurrentIcon className="w-5 h-5 text-emerald-400" />
                <span>{currentNav?.label}</span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {isReseller ? `Reseller Partner: ${auth.getResellerId()}` : 'WAGrow Central License Administration'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Realtime API status */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <span>{isOnline ? 'System Online' : 'Offline'}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => { loadStats(); loadLicenses(); }}
              className="btn-secondary text-xs p-2.5"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${statsLoading || licLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Generate Key Button */}
            <button
              onClick={() => setShowGenerate(true)}
              className="btn-primary text-xs sm:text-sm py-2 px-3.5 sm:px-4 shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>{isReseller ? 'Generate Key' : 'Issue License'}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* DASHBOARD TAB */}
          {activePage === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-8">
              <StatsOverview stats={stats} loading={statsLoading} isReseller={isReseller} />

              {/* Quick Jump / Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => setActivePage('trials')}
                  className="glass-card p-5 cursor-pointer hover:border-amber-500/40 group transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Gift className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Review Trials <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">2-Day Trial Activations</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage client trials and send instant WhatsApp upgrade offers.
                  </p>
                </div>

                <div
                  onClick={() => setActivePage('licenses')}
                  className="glass-card p-5 cursor-pointer hover:border-emerald-500/40 group transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      All Licenses <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Active Client Licenses</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Monitor machine bindings, reset devices, and extend expiry dates.
                  </p>
                </div>

                <div
                  onClick={() => setActivePage('earnings')}
                  className="glass-card p-5 cursor-pointer hover:border-indigo-500/40 group transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Sales &amp; Profit <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Earnings Breakdown</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Track gross revenue, reseller commissions, and profit ledger.
                  </p>
                </div>
              </div>

              {/* Recent Licenses Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      {isReseller ? 'My Recent Issued Licenses' : 'Recently Issued Licenses'}
                    </h2>
                    <p className="text-xs text-slate-400">Latest active clients across computers</p>
                  </div>
                  <button
                    onClick={() => setActivePage('licenses')}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <span>View All Licenses ({licenses.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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

          {/* LICENSES TAB */}
          {activePage === 'licenses' && (
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">Client Licenses</h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Search, filter, edit entitlements, and manage computer hardware bindings.
                  </p>
                </div>
                <button
                  onClick={() => setShowGenerate(true)}
                  className="btn-primary self-start sm:self-auto text-xs sm:text-sm py-2 px-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>Issue New License</span>
                </button>
              </div>
              <LicenseTable
                licenses={licenses}
                loading={licLoading}
                isReseller={isReseller}
                onEdit={setEditLicense}
                onDelete={handleDeleteLicense}
                onResetDevices={handleResetDevices}
                onSuspend={handleSuspendLicense}
                onActivate={handleActivateLicense}
                onRegenerateKey={handleRegenerateKey}
                onRefresh={loadLicenses}
                onSearch={loadLicenses}
              />
            </div>
          )}

          {/* TRIALS TAB */}
          {activePage === 'trials' && !isReseller && (
            <div className="max-w-7xl mx-auto">
              <TrialRequestsPage />
            </div>
          )}

          {/* RESELLERS TAB */}
          {activePage === 'resellers' && !isReseller && (
            <div className="max-w-7xl mx-auto">
              <ResellersPage />
            </div>
          )}

          {/* EARNINGS TAB */}
          {activePage === 'earnings' && (
            <div className="max-w-7xl mx-auto">
              <EarningsPage isReseller={isReseller} />
            </div>
          )}

        </main>
      </div>

      {/* MODALS */}
      <GenerateLicenseModal
        isOpen={showGenerate}
        onClose={() => setShowGenerate(false)}
        onCreated={handleCreateLicense}
      />

      {editLicense && (
        <EditLicenseModal
          license={editLicense}
          onClose={() => setEditLicense(null)}
          onUpdated={handleUpdateLicense}
        />
      )}

      {showSettings && !isReseller && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
