import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const fmt = (n, cur = '₹') => `${cur}${(parseFloat(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function EarningsPage({ isReseller }) {
  const [data, setData]         = useState({ earnings: [], summary: { total: 0, commission: 0, net: 0, count: 0 } });
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState('month');
  const [resellers, setResellers] = useState([]);
  const [filterRes, setFilterRes] = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 20;

  const load = async () => {
    setLoading(true);
    try {
      const res = isReseller
        ? await api.listTransactions('', period)
        : await api.getEarnings(period, filterRes);
      if (res?.success) setData(res);
    } catch(e) {}
    setLoading(false);
  };

  const loadResellers = async () => {
    if (isReseller) return;
    const res = await api.listResellers();
    if (res?.success) setResellers(res.resellers || []);
  };

  useEffect(() => { loadResellers(); }, []);
  useEffect(() => { load(); setPage(1); }, [period, filterRes]);

  const currency   = data?.summary?.currency || '₹';
  const filtered   = (data?.earnings || []).filter(e => !search || (e.customer_name||'').toLowerCase().includes(search.toLowerCase()) || (e.reseller_name||'').toLowerCase().includes(search.toLowerCase()) || (e.license_key||'').toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const periodBtns = [
    { v: 'today', l: 'Today' },
    { v: 'week',  l: '7 Days' },
    { v: 'month', l: 'This Month' },
    { v: 'year',  l: 'This Year' },
    { v: '',      l: 'All Time' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0 }}>
          {isReseller ? '💰 My Earnings & Sales' : '📈 Earnings & Revenue'}
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
          {isReseller ? 'Your commission and sales history' : 'Full revenue tracking with reseller-wise breakdown'}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '14px' }}>
        {[
          { label: isReseller ? 'My Sales' : 'Total Revenue', value: fmt(data?.summary?.total, currency), color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
          { label: 'Commission Paid', value: fmt(data?.summary?.commission, currency), color: '#818cf8', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' },
          { label: isReseller ? 'My Net (after comm)' : 'Net Profit', value: fmt(data?.summary?.net, currency), color: '#22d3ee', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.25)' },
          { label: 'Transactions', value: data?.summary?.count ?? 0, color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
        ].map((c,i) => (
          <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '14px', padding: '18px' }}>
            <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{c.label}</p>
            <h3 style={{ fontSize: '24px', fontWeight: '900', color: c.color, margin: '6px 0 0', fontFamily: 'monospace' }}>
              {loading ? '...' : c.value}
            </h3>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Period */}
        <div style={{ display: 'flex', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
          {periodBtns.map(b => (
            <button key={b.v} onClick={() => setPeriod(b.v)} style={{
              padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              background: period === b.v ? 'linear-gradient(135deg,#10b981,#059669)' : 'transparent',
              color: period === b.v ? '#fff' : '#64748b', transition: 'all 0.2s'
            }}>{b.l}</button>
          ))}
        </div>

        {/* Reseller Filter (admin only) */}
        {!isReseller && resellers.length > 0 && (
          <select className="glass-input" style={{ minWidth: '180px' }} value={filterRes} onChange={e => setFilterRes(e.target.value)}>
            <option value="">All Resellers</option>
            {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}

        {/* Search */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input className="glass-input" placeholder="Search customer, key, reseller..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button onClick={() => load()} className="btn-secondary" style={{ padding: '8px 16px' }}>🔄 Refresh</button>
      </div>

      {/* Earnings Table */}
      <div className="glass-panel" style={{ overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(15,23,42,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Date', 'Customer', 'License Key', 'Plan', isReseller ? '' : 'Reseller', 'Sale Price', 'Commission', 'Net'].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>Loading earnings...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>
                  <div style={{ fontSize: '32px' }}>📊</div>
                  <p style={{ margin: '8px 0 0', color: '#64748b' }}>No transactions found for this period</p>
                </td></tr>
              ) : paginated.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    <div style={{ fontSize: '10px', color: '#334155' }}>{new Date(e.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#f1f5f9', fontWeight: '600', fontSize: '13px' }}>{e.customer_name || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="mono-text" style={{ fontSize: '11px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px', color: '#22d3ee' }}>
                      {(e.license_key || '-').substring(0, 18)}{e.license_key?.length > 18 ? '...' : ''}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#22d3ee', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                      {e.plan_type || 'Pro'}
                    </span>
                  </td>
                  {!isReseller && <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>{e.reseller_name || 'Admin Direct'}</td>}
                  <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: '700', fontFamily: 'monospace' }}>{fmt(e.sale_price, currency)}</td>
                  <td style={{ padding: '12px 16px', color: '#818cf8', fontFamily: 'monospace' }}>
                    {fmt(e.commission_amount, currency)}
                    {e.commission_percent > 0 && <div style={{ fontSize: '10px', color: '#475569' }}>{e.commission_percent}%</div>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#22d3ee', fontWeight: '700', fontFamily: 'monospace' }}>{fmt(e.net, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
