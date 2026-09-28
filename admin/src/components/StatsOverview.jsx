import React from 'react';

const fmt = (n, cur = '₹') => `${cur}${(parseFloat(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function StatsOverview({ stats, loading, isReseller }) {
  const currency = stats?.currency || '₹';

  const adminCards = [
    {
      title: 'Total Gross Revenue',
      value: fmt(stats?.total_revenue, currency),
      sub: `${fmt(stats?.month_revenue, currency)} earned this month`,
      badge: 'All Time',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: '💰',
      glow: 'from-emerald-500/20 via-teal-500/5 to-transparent',
      borderColor: 'border-emerald-500/25',
      valueColor: 'text-emerald-400'
    },
    {
      title: 'Active Paid Licenses',
      value: stats?.active ?? 0,
      sub: `${stats?.total ?? 0} total lifetime issued`,
      badge: `${stats?.total ? Math.round(((stats.active || 0) / stats.total) * 100) : 0}% Active`,
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      icon: '🔑',
      glow: 'from-cyan-500/20 via-blue-500/5 to-transparent',
      borderColor: 'border-cyan-500/25',
      valueColor: 'text-cyan-400'
    },
    {
      title: '2-Day Free Trials',
      value: stats?.trials ?? (stats?.total_trials ?? 0),
      sub: `${stats?.active_trials ?? 0} active now • auto-activated`,
      badge: 'Zero Friction',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: '🆓',
      glow: 'from-amber-500/20 via-orange-500/5 to-transparent',
      borderColor: 'border-amber-500/25',
      valueColor: 'text-amber-400'
    },
    {
      title: 'Reseller Network',
      value: stats?.total_resellers ?? 0,
      sub: `${fmt(stats?.pending_commission, currency)} pending payout`,
      badge: 'Partners',
      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      icon: '🏪',
      glow: 'from-indigo-500/20 via-purple-500/5 to-transparent',
      borderColor: 'border-indigo-500/25',
      valueColor: 'text-indigo-400'
    }
  ];

  const resellerCards = [
    {
      title: 'My Total Client Sales',
      value: fmt(stats?.total_sales, currency),
      sub: `${fmt(stats?.month_sales, currency)} this month`,
      badge: 'Gross Sales',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: '💰',
      glow: 'from-emerald-500/20 to-transparent',
      borderColor: 'border-emerald-500/25',
      valueColor: 'text-emerald-400'
    },
    {
      title: 'Earned Commission',
      value: fmt(stats?.total_commission, currency),
      sub: `${fmt(stats?.pending_balance, currency)} ready for payout`,
      badge: 'My Earnings',
      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      icon: '🎯',
      glow: 'from-indigo-500/20 to-transparent',
      borderColor: 'border-indigo-500/25',
      valueColor: 'text-indigo-400'
    },
    {
      title: 'Active Clients',
      value: stats?.active ?? 0,
      sub: `${stats?.total ?? 0} total licenses sold`,
      badge: 'Active Now',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      icon: '🔑',
      glow: 'from-cyan-500/20 to-transparent',
      borderColor: 'border-cyan-500/25',
      valueColor: 'text-cyan-400'
    },
    {
      title: 'Need Renewal',
      value: stats?.expired ?? 0,
      sub: 'Clients due for subscription renewal',
      badge: 'Renewals',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: '⏰',
      glow: 'from-amber-500/20 to-transparent',
      borderColor: 'border-amber-500/25',
      valueColor: 'text-amber-400'
    }
  ];

  const cards = isReseller ? resellerCards : adminCards;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`glass-panel p-5 sm:p-6 border relative overflow-hidden group ${c.borderColor}`}
        >
          {/* Ambient Corner Glow */}
          <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${c.glow} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`}></div>

          <div className="flex items-start justify-between mb-3 relative z-10">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              {c.title}
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${c.badgeColor}`}>
              {c.badge}
            </span>
          </div>

          <div className="flex items-baseline justify-between relative z-10">
            <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${c.valueColor}`}>
              {loading ? (
                <span className="inline-block w-20 h-7 bg-slate-800 animate-pulse rounded"></span>
              ) : (
                c.value
              )}
            </div>
            <span className="text-2xl p-2 rounded-xl bg-slate-900/60 border border-white/5">
              {c.icon}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-400 flex items-center justify-between relative z-10">
            <span>{c.sub}</span>
            <span className="text-slate-600 group-hover:text-slate-400 transition-colors">↗</span>
          </div>
        </div>
      ))}
    </div>
  );
}
