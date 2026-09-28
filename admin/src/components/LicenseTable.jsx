import React, { useState, useEffect } from 'react';

export default function LicenseTable({
  licenses,
  loading,
  isReseller,
  onRefresh,
  onSearch,
  onEdit,
  onResetDevices,
  onDelete,
  compact
}) {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedKey, setCopiedKey]   = useState(null);

  useEffect(() => {
    if (onSearch) {
      const t = setTimeout(() => onSearch(search, statusFilter), 350);
      return () => clearTimeout(t);
    }
  }, [search, statusFilter]);

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getDaysLeft = (expiresAt) => {
    const exp = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="glass-panel overflow-hidden border border-slate-800">
      
      {/* Table Toolbar */}
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            className="glass-input pl-10"
            placeholder="Search by client name, mobile, email, key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>

        {/* Status Filters & Actions */}
        <div className="flex items-center gap-3 overflow-x-auto">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            {['all', 'active', 'expired', 'suspended'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === tab
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            className="btn-secondary text-xs p-2.5"
            title="Refresh Table"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>

      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-5">Customer / Contact</th>
              <th className="py-3.5 px-5">Plan</th>
              <th className="py-3.5 px-5">License Key</th>
              <th className="py-3.5 px-5">Expires On</th>
              <th className="py-3.5 px-5">Devices</th>
              <th className="py-3.5 px-5">Status</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-400">
                  <div className="inline-block animate-spin h-7 w-7 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
                  <p>Loading database from Google Sheets...</p>
                </td>
              </tr>
            ) : licenses.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-400">
                  <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <p className="font-semibold text-slate-300">No licenses found</p>
                  <p className="text-xs text-slate-500 mt-1">Generate a new license key above to get started.</p>
                </td>
              </tr>
            ) : (
              licenses.map((lic) => {
                const daysLeft = getDaysLeft(lic.expires_at);
                const isExpired = daysLeft <= 0;
                const status = lic.status === 'suspended' ? 'suspended' : isExpired ? 'expired' : 'active';

                return (
                  <tr key={lic.id} className="hover:bg-slate-900/30 transition-colors">
                    
                    {/* Customer */}
                    <td className="py-4 px-5">
                      <div className="font-semibold text-white">{lic.customer_name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        {lic.mobile && <span>📱 {lic.mobile}</span>}
                        {lic.email && <span>✉️ {lic.email}</span>}
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="py-4 px-5">
                      <span className="badge badge-plan">
                        {lic.plan_type}
                      </span>
                    </td>

                    {/* Key */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="mono-text font-medium text-emerald-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs">
                          {lic.license_key}
                        </span>
                        <button
                          onClick={() => handleCopy(lic.license_key)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Copy Key"
                        >
                          {copiedKey === lic.license_key ? (
                            <span className="text-xs font-bold text-emerald-400">✓</span>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Expiry */}
                    <td className="py-4 px-5">
                      <div className="text-xs text-slate-200">
                        {new Date(lic.expires_at).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] font-medium mt-0.5">
                        {isExpired ? (
                          <span className="text-rose-400 font-bold">Expired</span>
                        ) : (
                          <span className="text-emerald-400">{daysLeft} days left</span>
                        )}
                      </div>
                    </td>

                    {/* Devices */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-300">
                          {lic.active_devices || 0} / {lic.max_devices || 1}
                        </span>
                        {(lic.active_devices > 0) && (
                          <button
                            onClick={() => onResetDevices(lic.license_key)}
                            className="text-[10px] text-cyan-400 hover:underline bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40"
                            title="Unbind machine IDs so user can switch PC"
                          >
                            Reset PC
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      <span className={`badge badge-${status}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                        {status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(lic)}
                          className="btn-secondary text-xs py-1 px-2.5"
                          title="Edit License"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(lic)}
                          className="btn-danger p-1.5"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
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
  );
}
