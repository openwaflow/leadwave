import React from 'react';

const fmt = (n, cur = '₹') => `${cur}${(parseFloat(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function StatsOverview({ stats, loading, isReseller }) {
  const currency = stats?.currency || '₹';

  const adminCards = [
    {
      title: 'Total Revenue',
      value: fmt(stats?.total_revenue, currency),
      sub: `${fmt(stats?.month_revenue, currency)} this month`,
      icon: '💰',
      glow: 'rgba(16,185,129,0.15)',
      border: 'rgba(16,185,129,0.3)',
      color: '#34d399'
    },
    {
      title: 'Active Licenses',
      value: stats?.active ?? 0,
      sub: `${stats?.total ?? 0} total issued`,
      icon: '✅',
      glow: 'rgba(6,182,212,0.1)',
      border: 'rgba(6,182,212,0.25)',
      color: '#22d3ee'
    },
    {
      title: 'Expired / Inactive',
      value: stats?.expired ?? 0,
      sub: `${stats?.suspended ?? 0} suspended`,
      icon: '⚠️',
      glow: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.25)',
      color: '#f87171'
    },
    {
      title: 'Active Resellers',
      value: stats?.total_resellers ?? 0,
      sub: `${fmt(stats?.pending_commission, currency)} commission pending`,
      icon: '🏪',
      glow: 'rgba(99,102,241,0.1)',
      border: 'rgba(99,102,241,0.25)',
      color: '#818cf8'
    }
  ];

  const resellerCards = [
    {
      title: 'My Total Sales',
      value: fmt(stats?.total_sales, currency),
      sub: `${fmt(stats?.month_sales, currency)} this month`,
      icon: '💰',
      glow: 'rgba(16,185,129,0.15)',
      border: 'rgba(16,185,129,0.3)',
      color: '#34d399'
    },
    {
      title: 'Total Commission',
      value: fmt(stats?.total_commission, currency),
      sub: `${fmt(stats?.pending_balance, currency)} pending payout`,
      icon: '🎯',
      glow: 'rgba(99,102,241,0.12)',
      border: 'rgba(99,102,241,0.3)',
      color: '#818cf8'
    },
    {
      title: 'Active Licenses',
      value: stats?.active ?? 0,
      sub: `${stats?.total ?? 0} total generated`,
      icon: '✅',
      glow: 'rgba(6,182,212,0.1)',
      border: 'rgba(6,182,212,0.25)',
      color: '#22d3ee'
    },
    {
      title: 'Expired / Inactive',
      value: stats?.expired ?? 0,
      sub: 'Need renewal',
      icon: '⏰',
      glow: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.25)',
      color: '#fbbf24'
    }
  ];

  const cards = isReseller ? resellerCards : adminCards;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          background: `radial-gradient(circle at top left, ${c.glow}, transparent 70%), rgba(15,23,42,0.7)`,
          border: `1px solid ${c.border}`,
          borderRadius: '16px',
          padding: '20px 24px',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{c.title}</p>
              <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#fff', margin: '8px 0 4px', fontFamily: 'monospace' }}>
                {loading ? <span style={{ display: 'inline-block', width: '80px', height: '28px', background: '#1e293b', borderRadius: '6px', animation: 'pulse 1s infinite' }}></span> : c.value}
              </h3>
              <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>{loading ? '' : c.sub}</p>
            </div>
            <span style={{ fontSize: '28px', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.1))' }}>{c.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
