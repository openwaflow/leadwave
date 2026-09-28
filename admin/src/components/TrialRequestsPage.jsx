import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function TrialRequestsPage() {
  const [trials, setTrials]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [period, setPeriod]       = useState('');
  const [status, setStatus]       = useState('all');
  const [search, setSearch]       = useState('');
  const [copiedId, setCopiedId]   = useState(null);

  const loadTrials = async () => {
    setLoading(true);
    try {
      const res = await api.listTrials(period, status);
      if (res?.success) {
        setTrials(res.trials || []);
      }
    } catch (e) {
      console.error('Error loading trials:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTrials();
  }, [period, status]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBlock = async (t) => {
    if (!window.confirm(`Block trial for "${t.name}"? Their app will stop working.`)) return;
    await api.updateTrialStatus(t.id, 'blocked', 'Blocked by admin');
    loadTrials();
  };

  const handleUnblock = async (t) => {
    await api.updateTrialStatus(t.id, 'active', 'Unblocked by admin');
    loadTrials();
  };

  const handleConvert = (t) => {
    const ph = String(t.mobile || '').replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Namaste ${t.name}! 👋\n\n` +
      `Aapka *WAGrow WhatsApp CRM* ka 2-din ka free trial kaisa chal raha hai?\n\n` +
      `🔥 *Limited Time Special Pro Offer:*\n` +
      `✅ Unlimited WhatsApp Bulk Sender\n` +
      `✅ Number Warmer & Anti-Ban Protection\n` +
      `✅ AI Smart Auto-Chatbot\n` +
      `✅ Group Extractor & Lead Finder\n\n` +
      `Sirf *₹2,999 / Saal* me full access paayein! 🚀\n\n` +
      `Full license activate karne ke liye reply karein.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${ph}&text=${msg}`, '_blank');
  };

  const filtered = trials.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      String(t.name || '').toLowerCase().includes(s) ||
      String(t.mobile || '').includes(s) ||
      String(t.license_key || '').toLowerCase().includes(s) ||
      String(t.machine_id || '').toLowerCase().includes(s)
    );
  });

  const counts = {
    total:   trials.length,
    active:  trials.filter(t => t.status === 'active').length,
    expired: trials.filter(t => t.status === 'expired').length,
    blocked: trials.filter(t => t.status === 'blocked').length,
  };

  const periodBtns = [
    { v: '',      l: 'All Time' },
    { v: 'today', l: 'Today' },
    { v: 'week',  l: 'Last 7 Days' },
    { v: 'month', l: 'This Month' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              🆓 2-Day Trial Activations &amp; Leads
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Hardware Locked
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Users who auto-activated free trials directly on their desktop computers.
          </p>
        </div>

        <button
          onClick={loadTrials}
          className="btn-secondary text-xs self-start sm:self-auto py-2 px-3.5"
        >
          <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
          <span>Refresh Leads</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Trials', value: counts.total, color: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-500/5', icon: '👥' },
          { label: 'Active Now', value: counts.active, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', icon: '⚡' },
          { label: 'Expired (Leads)', value: counts.expired, color: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/5', icon: '🎯' },
          { label: 'Blocked Abuse', value: counts.blocked, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5', icon: '🚫' },
        ].map((c, i) => (
          <div key={i} className={`glass-panel p-4 rounded-xl border ${c.border} ${c.bg}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</span>
              <span className="text-base">{c.icon}</span>
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono mt-2 ${c.color}`}>
              {loading ? '...' : c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            className="glass-input pl-9 text-xs sm:text-sm"
            placeholder="Search by name, WhatsApp number, or Machine ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Date Period buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {periodBtns.map((b) => (
              <button
                key={b.v}
                onClick={() => setPeriod(b.v)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  period === b.v
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {b.l}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="glass-input text-xs py-1.5 px-3 rounded-xl w-auto"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
            <option value="blocked">Blocked Only</option>
          </select>
        </div>
      </div>

      {/* Trials Table */}
      <div className="glass-panel overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-5">User / Contact</th>
                <th className="py-3.5 px-4">Hardware Machine ID</th>
                <th className="py-3.5 px-4">Auto-Generated Key</th>
                <th className="py-3.5 px-4">Requested Date</th>
                <th className="py-3.5 px-4">Expiry / Status</th>
                <th className="py-3.5 px-5 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <span className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Loading trial registrations...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="max-w-xs mx-auto text-slate-400">
                      <span className="text-3xl block mb-2">🎁</span>
                      <p className="font-bold text-white text-sm">No trial requests yet</p>
                      <p className="text-xs text-slate-500 mt-1">
                        When users launch WAGrow for the first time and enter their name and WhatsApp number, their trials will instantly appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const cleanPhone = String(t.mobile || '').replace(/[^0-9]/g, '');
                  const isCopiedKey = copiedId === `key-${t.id}`;
                  const isCopiedMachine = copiedId === `mid-${t.id}`;

                  return (
                    <tr key={t.id || t.machine_id} className="table-row-hover">
                      
                      {/* Name & Mobile */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="font-bold text-white text-sm">
                          {t.name || 'Anonymous User'}
                        </div>
                        <div className="mt-0.5">
                          {cleanPhone ? (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-1 font-mono text-xs"
                            >
                              <span>💬</span>
                              <span>{t.mobile}</span>
                            </a>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs">No phone</span>
                          )}
                        </div>
                      </td>

                      {/* Machine ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <code
                            className="font-mono text-[11px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 max-w-[130px] truncate"
                            title={t.machine_id}
                          >
                            {t.machine_id}
                          </code>
                          <button
                            onClick={() => handleCopy(t.machine_id, `mid-${t.id}`)}
                            className="text-slate-400 hover:text-white p-1 text-xs"
                            title="Copy Machine ID"
                          >
                            {isCopiedMachine ? '✅' : '📋'}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Single Device Lock</span>
                      </td>

                      {/* License Key */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-xs text-amber-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 font-semibold select-all">
                            {t.license_key}
                          </code>
                          <button
                            onClick={() => handleCopy(t.license_key, `key-${t.id}`)}
                            className="text-slate-400 hover:text-white p-1 text-xs"
                            title="Copy Key"
                          >
                            {isCopiedKey ? '✅' : '📋'}
                          </button>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        <div>
                          {t.requested_at ? new Date(t.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {t.requested_at ? new Date(t.requested_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {t.status === 'blocked' ? (
                          <span className="badge badge-expired">🚫 Blocked</span>
                        ) : t.status === 'expired' ? (
                          <span className="badge badge-expired">Expired</span>
                        ) : (
                          <div>
                            <span className="badge badge-active">Active Trial</span>
                            <span className="text-[10px] text-emerald-400 block font-bold mt-0.5">
                              {t.days_left !== undefined ? `${t.days_left}d left` : '2 days'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Send WhatsApp Offer */}
                          <button
                            onClick={() => handleConvert(t)}
                            className="py-1.5 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            title="Pitch Pro License on WhatsApp"
                          >
                            <span>💬</span>
                            <span>Send Offer</span>
                          </button>

                          {/* Block / Unblock */}
                          {t.status === 'blocked' ? (
                            <button
                              onClick={() => handleUnblock(t)}
                              className="py-1.5 px-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                              title="Unblock this user"
                            >
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlock(t)}
                              className="py-1.5 px-2.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold"
                              title="Block trial"
                            >
                              Block
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between px-5">
          <span>Showing {filtered.length} of {trials.length} total trial registrations</span>
          <span>Duplicate PC and duplicate phone numbers automatically blocked</span>
        </div>
      </div>

    </div>
  );
}
