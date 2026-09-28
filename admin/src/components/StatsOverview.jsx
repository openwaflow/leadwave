import React from 'react';
import { KeyRound, ShieldCheck, Users, IndianRupee, CreditCard, Target, Clock, CheckCircle2 } from 'lucide-react';

const fmt = (n, cur = '₹') => `${cur}${(parseFloat(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function StatsOverview({ stats, loading, isReseller }) {
  const currency = stats?.currency || '₹';

  const adminCards = [
    {
      title: 'Total Gross Revenue',
      value: fmt(stats?.total_revenue, currency),
      sub: `${fmt(stats?.month_revenue, currency)} this month`,
      badge: 'All Time',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: CreditCard,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      borderColor: 'hover:border-emerald-500/35',
      valueColor: 'text-emerald-400'
    },
    {
      title: 'Active Paid Licenses',
      value: stats?.active ?? 0,
      sub: `${stats?.total ?? 0} total lifetime issued`,
      badge: `${stats?.total ? Math.round(((stats.active || 0) / stats.total) * 100) : 0}% Active`,
      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      icon: KeyRound,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
      borderColor: 'hover:border-indigo-500/35',
      valueColor: 'text-indigo-400'
    },
    {
      title: '2-Day Free Trials',
      value: stats?.trials ?? (stats?.total_trials ?? 0),
      sub: `${stats?.active_trials ?? 0} currently active`,
      badge: 'Trial Leads',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: ShieldCheck,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      borderColor: 'hover:border-amber-500/35',
      valueColor: 'text-amber-400'
    },
    {
      title: 'Reseller Partners',
      value: stats?.total_resellers ?? 0,
      sub: `${fmt(stats?.pending_commission, currency)} pending payout`,
      badge: 'Network',
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      icon: Users,
      iconColor: 'text-sky-400',
      iconBg: 'bg-sky-500/10 border-sky-500/20',
      borderColor: 'hover:border-sky-500/35',
      valueColor: 'text-sky-400'
    }
  ];

  const resellerCards = [
    {
      title: 'Total Client Sales',
      value: fmt(stats?.total_sales, currency),
      sub: `${fmt(stats?.month_sales, currency)} this month`,
      badge: 'Gross Sales',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: CreditCard,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      borderColor: 'hover:border-emerald-500/35',
      valueColor: 'text-emerald-400'
    },
    {
      title: 'Earned Commission',
      value: fmt(stats?.total_commission, currency),
      sub: `${fmt(stats?.pending_balance, currency)} ready for payout`,
      badge: 'My Earnings',
      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      icon: Target,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
      borderColor: 'hover:border-indigo-500/35',
      valueColor: 'text-indigo-400'
    },
    {
      title: 'Active Clients',
      value: stats?.active ?? 0,
      sub: `${stats?.total ?? 0} total licenses sold`,
      badge: 'Active Now',
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      icon: KeyRound,
      iconColor: 'text-sky-400',
      iconBg: 'bg-sky-500/10 border-sky-500/20',
      borderColor: 'hover:border-sky-500/35',
      valueColor: 'text-sky-400'
    },
    {
      title: 'Due for Renewal',
      value: stats?.expired ?? 0,
      sub: 'Clients due for subscription renewal',
      badge: 'Renewals',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: Clock,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      borderColor: 'hover:border-amber-500/35',
      valueColor: 'text-amber-400'
    }
  ];

  const cards = isReseller ? resellerCards : adminCards;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-4 bg-[#111d35] rounded w-2/3 mb-3"></div>
            <div className="h-8 bg-[#111d35] rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-[#111d35] rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, idx) => {
        const IconComponent = c.icon;
        return (
          <div
            key={idx}
            className={`glass-card p-5 relative overflow-hidden transition-all duration-200 border border-[#1e2d4a] ${c.borderColor}`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {c.title}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.badgeColor}`}>
                {c.badge}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${c.valueColor}`}>
                  {c.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  {c.sub}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl border flex-shrink-0 ${c.iconBg} ${c.iconColor}`}>
                <IconComponent className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
