import React, { useState, useEffect } from 'react';

export default function LicenseTable({
  licenses = [],
  loading = false,
  isReseller = false,
  onRefresh,
  onSearch,
  onEdit,
  onResetDevices,
  onDelete,
  compact = false
}) {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedKey, setCopiedKey]       = useState(null);

  useEffect(() => {
    if (onSearch) {
      const t = setTimeout(() => onSearch(search, statusFilter), 300);
      return () => clearTimeout(t);
    }
  }, [search, statusFilter, onSearch]);

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getDaysLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const exp = new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  };

  const filtered = licenses.filter((lic) => {
    if (statusFilter !== 'all') {
      const days = getDaysLeft(lic.expires_at);
      const isExp = (lic.status === 'expired') || (days !== null && days <= 0);
      if (statusFilter === 'active' && isExp) return false;
      if (statusFilter === 'expired' && !isExp) return false;
      if (statusFilter === 'suspended' && lic.status !== 'suspended') return false;
    }
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      String(lic.customer_name || '').toLowerCase().includes(s) ||
      String(lic.mobile || '').includes(s) ||
      String(lic.email || '').toLowerCase().includes(s) ||
      String(lic.license_key || '').toLowerCase().includes(s) ||
      String(lic.user_code || '').toLowerCase().includes(s) ||
      String(lic.notes || '').toLowerCase().includes(s) ||
      String(lic.plan_type || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="glass-panel overflow-hidden border border-slate-800">
      
      {/* Toolbar */}
      {!compact && (
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/40">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              className="glass-input pl-10 text-xs sm:text-sm"
              placeholder="Search by client, device code, mobile, key, or plan..."
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

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { id: 'all',       label: 'All' },
                { id: 'active',    label: 'Active' },
                { id: 'expired',   label: 'Expired' },
                { id: 'suspended', label: 'Suspended' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all ${
                    statusFilter === tab.id
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={onRefresh}
              className="btn-secondary text-xs p-2.5 flex-shrink-0"
              title="Refresh Licenses"
            >
              <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4 sm:px-5">Client / Contact</th>
              <th className="py-3.5 px-4">User Code</th>
              <th className="py-3.5 px-4">Plan / Validity</th>
              <th className="py-3.5 px-4">License Key</th>
              <th className="py-3.5 px-4">Expiry Date</th>
              <th className="py-3.5 px-4">Devices Bound</th>
              <th className="py-3.5 px-4">Status</th>
              {!compact && <th className="py-3.5 px-5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading ? (
              <tr>
                <td colSpan={compact ? 7 : 8} className="py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                    <span>Loading licenses from Google Sheets...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={compact ? 7 : 8} className="py-12 text-center">
                  <div className="max-w-xs mx-auto text-slate-400">
                    <span className="text-3xl block mb-2">🔑</span>
                    <p className="font-bold text-white text-sm">No licenses found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search ? 'Try clearing search filters' : 'Click "+ Issue License" to create the first license key.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((lic) => {
                const days = getDaysLeft(lic.expires_at);
                const isExp = (lic.status === 'expired') || (days !== null && days <= 0);
                const isCopied = copiedKey === lic.license_key;
                const cleanPhone = String(lic.mobile || '').replace(/[^0-9]/g, '');

                return (
                  <tr key={lic.id || lic.license_key} className="table-row-hover">
                    
                    {/* Customer Info */}
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="font-bold text-white text-sm">
                        {lic.customer_name || 'Unnamed Client'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        {cleanPhone ? (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                            title="Chat on WhatsApp"
                          >
                            <span>💬</span>
                            <span>{lic.mobile}</span>
                          </a>
                        ) : (
                          <span className="text-slate-500">No Mobile</span>
                        )}
                        {lic.email && (
                          <span className="text-slate-500 truncate max-w-[130px]" title={lic.email}>
                            • {lic.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* User Code / Device ID */}
                    <td className="py-3.5 px-4">
                      {(() => {
                        const code = lic.user_code || (lic.notes ? (String(lic.notes).split('|')[0].trim().startsWith('USER-') ? String(lic.notes).split('|')[0].trim() : (String(lic.notes).trim().length === 16 ? 'USER-' + String(lic.notes).trim().slice(0,8) + '-' + String(lic.notes).trim().slice(8,16) : '')) : '') || '';
                        return code ? (
                          <div className="flex items-center gap-1.5">
                            <code className="mono-text text-xs text-indigo-300 font-semibold bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/25 select-all">
                              {code}
                            </code>
                            <button
                              onClick={() => handleCopy(code)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs"
                              title="Copy Device ID"
                            >
                              {copiedKey === code ? '✅' : '📋'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        );
                      })()}
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 border border-indigo-500/25 text-indigo-300">
                        <span>🏷️</span>
                        <span>{lic.plan_type || 'Standard'}</span>
                      </span>
                      {lic.price && (
                        <div className="text-[11px] text-slate-400 font-mono mt-1">
                          ₹{lic.price}
                        </div>
                      )}
                    </td>

                    {/* License Key */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs text-emerald-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 font-semibold select-all">
                          {lic.license_key}
                        </code>
                        <button
                          onClick={() => handleCopy(lic.license_key)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs"
                          title="Copy Key"
                        >
                          {isCopied ? '✅' : '📋'}
                        </button>
                      </div>
                      {isCopied && (
                        <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                          Copied to clipboard!
                        </span>
                      )}
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3.5 px-4">
                      <div className="text-white font-medium">
                        {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never (Lifetime)'}
                      </div>
                      <div className="text-[11px] mt-0.5 font-bold">
                        {days === null ? (
                          <span className="text-purple-400">∞ Lifetime</span>
                        ) : days <= 0 ? (
                          <span className="text-rose-400">Expired ({Math.abs(days)}d ago)</span>
                        ) : days <= 7 ? (
                          <span className="text-amber-400">⚠️ {days} days left!</span>
                        ) : (
                          <span className="text-slate-400">{days} days remaining</span>
                        )}
                      </div>
                    </td>

                    {/* Device meter */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-bold text-white text-xs">
                          {lic.active_devices ?? 0} / {lic.max_devices || 1}
                        </div>
                        <span className="text-[10px] text-slate-400">PCs</span>
                      </div>
                      {lic.active_devices > 0 && onResetDevices && !compact && (
                        <button
                          onClick={() => onResetDevices(lic.license_key)}
                          className="text-[10px] text-cyan-400 hover:underline mt-0.5 block font-medium"
                          title="Allow user to activate on another PC"
                        >
                          Reset Hardware
                        </button>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {isExp ? (
                        <span className="badge badge-expired">Expired</span>
                      ) : lic.status === 'suspended' ? (
                        <span className="badge badge-suspended">Suspended</span>
                      ) : (
                        <span className="badge badge-active">Active</span>
                      )}
                    </td>

                    {/* Actions */}
                    {!compact && (
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(lic)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="Edit License Plan & Dates"
                            >
                              ⚙️
                            </button>
                          )}
                          {onDelete && !isReseller && (
                            <button
                              onClick={() => onDelete(lic)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                              title="Delete License"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    )}

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between px-5">
        <span>Showing {filtered.length} of {licenses.length} licenses</span>
        <span>Hardware bound with RSA-2048 &amp; Machine ID</span>
      </div>

    </div>
  );
}
