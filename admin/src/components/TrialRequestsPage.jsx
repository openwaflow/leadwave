import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function TrialRequestsPage() {
  const [trials, setTrials]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('');
  const [status, setStatus]   = useState('all');
  const [search, setSearch]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listTrials(period, status);
      if (res?.success) setTrials(res.trials || []);
    } catch(e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [period, status]);

  const handleBlock = async (t) => {
    if (!window.confirm(`Block trial for "${t.name}"? Their app will stop working.`)) return;
    await api.updateTrialStatus(t.id, 'blocked', 'Blocked by admin');
    load();
  };

  const handleConvert = (t) => {
    // Open WhatsApp to send paid license offer
    const ph = t.mobile.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Namaste ${t.name}! 👋\n\n` +
      `Aapka WAGrow CRM trial khatam ho raha hai.\n\n` +
      `🔑 Full license lene ke liye sampark karein:\n` +
      `Plan: Pro — Valid 1 Saal\n` +
      `Price: ₹2999 sirf\n\n` +
      `Abhi buy karein aur business badhayein! 🚀`
    );
    window.open(`https://api.whatsapp.com/send?phone=${ph}&text=${msg}`, '_blank');
  };

  const filtered = trials.filter(t =>
    !search ||
    (t.name||'').toLowerCase().includes(search.toLowerCase()) ||
    (t.mobile||'').includes(search) ||
    (t.license_key||'').toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    active:  trials.filter(t => t.status === 'active').length,
    expired: trials.filter(t => t.status === 'expired').length,
    blocked: trials.filter(t => t.status === 'blocked').length,
  };

  const periodBtns = [
    { v: 'today', l: 'Today' },
    { v: 'week',  l: '7 Days' },
    { v: 'month', l: 'This Month' },
    { v: '',      l: 'All Time' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0 }}>🆓 Trial Requests</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
            Jo users ne free trial liya hai unki details aur status
          </p>
        </div>
        <button onClick={load} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Total Trials', value: trials.length, color: '#22d3ee', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.25)' },
          { label: 'Active Trials', value: counts.active, color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
          { label: 'Expired', value: counts.expired, color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
          { label: 'Blocked', value: counts.blocked, color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
        ].map((c,i) => (
          <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '14px', padding: '16px 20px' }}>
            <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{c.label}</p>
            <h3 style={{ fontSize: '28px', fontWeight: '900', color: c.color, margin: '6px 0 0', fontFamily: 'monospace' }}>
              {loading ? '...' : c.value}
            </h3>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Period */}
        <div style={{ display: 'flex', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
          {periodBtns.map(b => (
            <button key={b.v} onClick={() => setPeriod(b.v)} style={{
              padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              background: period === b.v ? 'linear-gradient(135deg,#10b981,#059669)' : 'transparent',
              color: period === b.v ? '#fff' : '#64748b', transition: 'all 0.2s'
            }}>{b.l}</button>
          ))}
        </div>

        {/* Status Filter */}
        <select className="glass-input" style={{ maxWidth: '160px' }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="blocked">Blocked</option>
        </select>

        {/* Search */}
        <input className="glass-input" style={{ flex: 1, minWidth: '200px' }}
          placeholder="Search name, mobile, license key..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(15,23,42,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Request Date', 'Name / WhatsApp', 'Machine ID', 'License Key', 'Expires', 'Days Left', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>Loading trial requests...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px' }}>
                  <div style={{ fontSize: '32px' }}>🆓</div>
                  <p style={{ margin: '8px 0 0', color: '#64748b', fontWeight: '600' }}>Koi trial request nahi mili</p>
                  <p style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>Jab koi user app install karega aur trial lega, woh yahan dikhega</p>
                </td></tr>
              ) : filtered.map((t, i) => {
                const isExpiring = t.days_left === 1 && t.status === 'active';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isExpiring ? 'rgba(245,158,11,0.03)' : 'transparent' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = isExpiring ? 'rgba(245,158,11,0.03)' : 'transparent'}>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(t.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      <div style={{ fontSize: '10px', color: '#334155' }}>
                        {new Date(t.requested_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '14px' }}>{t.name}</div>
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>
                        <a href={`https://api.whatsapp.com/send?phone=${t.mobile.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer"
                          style={{ color: '#34d399', textDecoration: 'none' }}>
                          📱 {t.mobile}
                        </a>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="mono-text" style={{ fontSize: '10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '6px', color: '#64748b' }}>
                        {t.machine_id || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="mono-text" style={{ fontSize: '11px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '6px', color: '#22d3ee' }}>
                        {(t.license_key || '-').substring(0, 20)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(t.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        fontWeight: '800', fontSize: '18px', fontFamily: 'monospace',
                        color: t.days_left === 0 ? '#f87171' : t.days_left === 1 ? '#fbbf24' : '#34d399'
                      }}>
                        {t.status === 'active' ? t.days_left : '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                        background: t.status === 'active' ? 'rgba(16,185,129,0.1)' : t.status === 'expired' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        border: `1px solid ${t.status === 'active' ? 'rgba(16,185,129,0.3)' : t.status === 'expired' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                        color: t.status === 'active' ? '#34d399' : t.status === 'expired' ? '#f87171' : '#fbbf24',
                        textTransform: 'capitalize'
                      }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleConvert(t)}
                          style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#34d399', cursor: 'pointer', fontWeight: '600' }}>
                          💬 Convert
                        </button>
                        {t.status === 'active' && (
                          <button onClick={() => handleBlock(t)} className="btn-danger" style={{ fontSize: '11px', padding: '4px 8px' }}>
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: '#475569' }}>
            {filtered.length} trial{filtered.length > 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* 💡 Tip */}
      <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#6ee7b7' }}>
          <strong>💡 Tip:</strong> "Convert" button se aap seedha WhatsApp par message bhej sakte ho trial users ko paid license offer ke liye.
          Trial khatam hone se 1 din pehle "Days Left" column <strong style={{ color: '#fbbf24' }}>yellow</strong> ho jaata hai — woh sahi time hai follow-up ka!
        </p>
      </div>
    </div>
  );
}
