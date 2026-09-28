import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const fmt = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function ResellersPage() {
  const [resellers, setResellers]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [form, setForm]                 = useState({ name: '', mobile: '', email: '', pin: '1234', commission_percent: '30', notes: '' });
  const [saving, setSaving]             = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);
  const [settleAmt, setSettleAmt]       = useState('');

  const loadResellers = async () => {
    setLoading(true);
    try {
      const res = await api.listResellers();
      if (res?.success) setResellers(res.resellers || []);
    } catch (e) {
      console.error('Error loading resellers:', e);
    }
    setLoading(false);
  };

  useEffect(() => { loadResellers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createReseller(form);
      if (res?.success) {
        loadResellers();
        setShowCreate(false);
        setForm({ name: '', mobile: '', email: '', pin: '1234', commission_percent: '30', notes: '' });
      } else {
        alert('Error: ' + (res?.error || 'Failed to create'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSaving(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateReseller({ ...editTarget });
      if (res?.success) {
        loadResellers();
        setEditTarget(null);
      } else {
        alert('Error: ' + (res?.error || 'Failed to update'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSaving(false);
  };

  const handleToggleStatus = async (r) => {
    const newStatus = r.status === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`${r.status === 'active' ? 'Suspend' : 'Activate'} reseller "${r.name}"?`)) return;
    await api.updateReseller({ id: r.id, status: newStatus });
    loadResellers();
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Permanently delete reseller "${r.name}" (${r.id})?`)) return;
    await api.deleteReseller(r.id);
    loadResellers();
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    if (!settleAmt || parseFloat(settleAmt) <= 0) {
      alert('Please enter a valid payout amount.');
      return;
    }
    const res = await api.settleCommission(settleTarget.id, settleAmt, 'Payout settlement');
    if (res?.success) {
      alert('Commission payout recorded successfully! ✅');
      loadResellers();
      setSettleTarget(null);
      setSettleAmt('');
    } else {
      alert('Error: ' + (res?.error || 'Settlement failed'));
    }
  };

  const handleShareCredentials = (r) => {
    const ph = (r.mobile || '').replace(/[^0-9]/g, '');
    const currentUrl = window.location.origin;
    const msg = encodeURIComponent(
      `Namaste ${r.name}! 👋\n\n` +
      `Aapka *WAGrow WhatsApp CRM* Reseller Portal ready hai! 🚀\n\n` +
      `🌐 *Portal Link:* ${currentUrl}\n` +
      `👤 *Reseller ID:* ${r.id}\n` +
      `🔐 *PIN:* ${r.pin || '1234'}\n` +
      `💼 *Aapka Commission:* ${r.commission_percent || 30}%\n\n` +
      `Abhi login karein aur apne clients ke liye license key generate karein!`
    );
    window.open(`https://api.whatsapp.com/send?phone=${ph}&text=${msg}`, '_blank');
  };

  const totalPending = resellers.reduce((acc, r) => acc + (parseFloat(r.balance) || 0), 0);
  const totalVolume  = resellers.reduce((acc, r) => acc + (parseFloat(r.total_sales) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>🏪</span>
            <span>Reseller Partner Network</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Empower your distribution partners to issue software licenses and earn commissions.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary self-start sm:self-auto text-xs sm:text-sm py-2 px-4"
        >
          <span>+ Add New Reseller</span>
        </button>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Partners</span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-400 mt-1">
            {resellers.filter(r => r.status === 'active').length} / {resellers.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered in distribution network</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Partner Sales Volume</span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1">
            {fmt(totalVolume)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Total client licenses generated by partners</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Payout Balance</span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 mt-1">
            {fmt(totalPending)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Unsettled reseller commission</span>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-5">Partner ID / Name</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Commission</th>
                <th className="py-3.5 px-4">Sales Volume</th>
                <th className="py-3.5 px-4">Pending Balance</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Loading reseller partners from Google Sheets...</span>
                    </div>
                  </td>
                </tr>
              ) : resellers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="max-w-xs mx-auto text-slate-400">
                      <span className="text-3xl block mb-2">🏪</span>
                      <p className="font-bold text-white text-sm">No reseller partners yet</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Click "+ Add New Reseller" to create your first partner account.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                resellers.map((r) => {
                  const cleanPhone = (r.mobile || '').replace(/[^0-9]/g, '');
                  const balance = parseFloat(r.balance) || 0;

                  return (
                    <tr key={r.id} className="table-row-hover">
                      
                      {/* Partner ID & Name */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{r.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[11px] font-mono font-bold text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {r.id}
                          </code>
                          <span className="text-[10px] text-slate-500 font-mono">PIN: {r.pin || '••••'}</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        {cleanPhone ? (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline flex items-center gap-1 font-mono text-xs"
                          >
                            <span>💬</span>
                            <span>{r.mobile}</span>
                          </a>
                        ) : (
                          <span className="text-slate-500 text-xs">No phone</span>
                        )}
                        {r.email && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[140px]" title={r.email}>
                            {r.email}
                          </div>
                        )}
                      </td>

                      {/* Commission % */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                          {r.commission_percent || 30}%
                        </span>
                      </td>

                      {/* Sales Volume */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white text-xs">
                          {fmt(r.total_sales)}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Earned: {fmt(r.total_earned)}
                        </span>
                      </td>

                      {/* Balance */}
                      <td className="py-3.5 px-4">
                        <div className={`font-mono font-bold text-xs ${balance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                          {fmt(balance)}
                        </div>
                        {balance > 0 && (
                          <button
                            onClick={() => { setSettleTarget(r); setSettleAmt(balance.toString()); }}
                            className="text-[10px] text-cyan-400 hover:underline font-semibold block mt-0.5"
                          >
                            Settle Payout →
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {r.status === 'active' ? (
                          <span className="badge badge-active">Active</span>
                        ) : (
                          <span className="badge badge-suspended">Suspended</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleShareCredentials(r)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors text-xs font-bold"
                            title="Send login credentials on WhatsApp"
                          >
                            💬 WhatsApp Invite
                          </button>

                          <button
                            onClick={() => setEditTarget(r)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
                            title="Edit Reseller"
                          >
                            ⚙️
                          </button>

                          <button
                            onClick={() => handleToggleStatus(r)}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors text-xs"
                            title={r.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                          >
                            {r.status === 'active' ? '⏸️' : '▶️'}
                          </button>

                          <button
                            onClick={() => handleDelete(r)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors text-xs"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RESELLER MODAL */}
      {showCreate && (
        <div className="modal-backdrop">
          <div className="modal-content p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Add Reseller Partner</h3>
                <p className="text-xs text-slate-400">Assign a partner ID, commission rate, and secret PIN</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Partner Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Tech Solutions"
                  className="glass-input text-xs"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">WhatsApp Mobile *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    className="glass-input text-xs"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Secret PIN *</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="1234"
                    className="glass-input text-xs font-mono"
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="partner@example.com"
                    className="glass-input text-xs"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Commission % *</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    required
                    className="glass-input text-xs font-mono"
                    value={form.commission_percent}
                    onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary text-xs">
                  {saving ? 'Creating Partner...' : 'Create Reseller Partner →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RESELLER MODAL */}
      {editTarget && (
        <div className="modal-backdrop">
          <div className="modal-content p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Reseller ({editTarget.id})</h3>
                <p className="text-xs text-slate-400">Update contact or commission terms</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Partner Name</label>
                <input
                  type="text"
                  required
                  className="glass-input text-xs"
                  value={editTarget.name || ''}
                  onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">WhatsApp Mobile</label>
                  <input
                    type="tel"
                    className="glass-input text-xs"
                    value={editTarget.mobile || ''}
                    onChange={(e) => setEditTarget({ ...editTarget, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Secret PIN</label>
                  <input
                    type="text"
                    maxLength={8}
                    className="glass-input text-xs font-mono"
                    value={editTarget.pin || ''}
                    onChange={(e) => setEditTarget({ ...editTarget, pin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Commission %</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  required
                  className="glass-input text-xs font-mono"
                  value={editTarget.commission_percent || ''}
                  onChange={(e) => setEditTarget({ ...editTarget, commission_percent: e.target.value })}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary text-xs">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE PAYOUT MODAL */}
      {settleTarget && (
        <div className="modal-backdrop">
          <div className="modal-content p-6 max-w-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Settle Reseller Payout</h3>
              <button onClick={() => setSettleTarget(null)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSettle} className="space-y-4">
              <p className="text-xs text-slate-300">
                Paying commission to <strong className="text-white">{settleTarget.name}</strong> ({settleTarget.id}).
                This will deduct the amount from their pending balance.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Payout Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  className="glass-input text-sm font-mono text-emerald-400 font-bold"
                  value={settleAmt}
                  onChange={(e) => setSettleAmt(e.target.value)}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button type="button" onClick={() => setSettleTarget(null)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Mark Paid &amp; Clear Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
