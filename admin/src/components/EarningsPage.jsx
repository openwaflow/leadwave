import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Download,
  RefreshCw,
  Search,
  Users,
  ShieldCheck,
  KeyRound,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

const fmt = (n, cur = '₹') => `${cur}${(parseFloat(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function EarningsPage({ isReseller }) {
  const [data, setData]           = useState({ earnings: [], summary: { total: 0, commission: 0, net: 0, count: 0 } });
  const [loading, setLoading]     = useState(true);
  const [period, setPeriod]       = useState('month');
  const [resellers, setResellers] = useState([]);
  const [filterRes, setFilterRes] = useState('');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 25;

  const loadData = async () => {
    setLoading(true);
    try {
      const res = isReseller
        ? await api.listTransactions('', period)
        : await api.getEarnings(period, filterRes);
      if (res?.success) setData(res);
    } catch (e) {
      console.error('Error loading earnings:', e);
    }
    setLoading(false);
  };

  const loadResellers = async () => {
    if (isReseller) return;
    try {
      const res = await api.listResellers();
      if (res?.success) setResellers(res.resellers || []);
    } catch (e) {}
  };

  useEffect(() => { loadResellers(); }, [isReseller]);
  useEffect(() => { loadData(); setPage(1); }, [period, filterRes]);

  const currency   = data?.summary?.currency || '₹';
  const rawList    = data?.earnings || [];
  const filtered   = rawList.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      String(e.customer_name || '').toLowerCase().includes(s) ||
      String(e.reseller_name || '').toLowerCase().includes(s) ||
      String(e.license_key || '').toLowerCase().includes(s) ||
      String(e.plan_type || '').toLowerCase().includes(s)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const periodBtns = [
    { v: 'today', l: 'Today' },
    { v: 'week',  l: 'Last 7 Days' },
    { v: 'month', l: 'This Month' },
    { v: 'year',  l: 'This Year' },
    { v: '',      l: 'All Time' },
  ];

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Date', 'License Key', 'Client', 'Plan', 'Sale Price', 'Commission', 'Net Profit', 'Reseller'];
    const rows = filtered.map(e => [
      e.date || '',
      e.license_key || '',
      `"${e.customer_name || ''}"`,
      `"${e.plan_type || ''}"`,
      e.sale_price || 0,
      e.commission_amount || 0,
      (e.sale_price || 0) - (e.commission_amount || 0),
      `"${e.reseller_name || 'Direct Admin'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WAGrow_Earnings_${period || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <span>{isReseller ? 'My Commission & Sales History' : 'Revenue & Commission Analytics'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isReseller ? 'Real-time sales performance and pending payouts' : 'Complete financial overview with reseller-wise commission split.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={exportCSV}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={loadData}
            className="btn-secondary text-xs p-2.5"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: isReseller ? 'My Total Sales' : 'Gross Revenue',
            value: fmt(data?.summary?.total, currency),
            sub: `${data?.summary?.count ?? 0} total transactions`,
            color: 'text-emerald-400',
            border: 'border-emerald-500/25',
            bg: 'bg-emerald-500/5',
            icon: DollarSign
          },
          {
            label: isReseller ? 'Earned Commission' : 'Reseller Commissions',
            value: fmt(data?.summary?.commission, currency),
            sub: isReseller ? 'Your total commission' : 'Distributed to partners',
            color: 'text-indigo-400',
            border: 'border-indigo-500/25',
            bg: 'bg-indigo-500/5',
            icon: Users
          },
          {
            label: isReseller ? 'Paid Out Balance' : 'Net Admin Profit',
            value: fmt(data?.summary?.net, currency),
            sub: isReseller ? 'Settled to your account' : 'After all commissions',
            color: 'text-cyan-400',
            border: 'border-cyan-500/25',
            bg: 'bg-cyan-500/5',
            icon: ShieldCheck
          },
          {
            label: 'Keys Activated',
            value: data?.summary?.count ?? 0,
            sub: `${period ? period.toUpperCase() : 'ALL TIME'} period`,
            color: 'text-amber-400',
            border: 'border-amber-500/25',
            bg: 'bg-amber-500/5',
            icon: KeyRound
          }
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className={`glass-panel p-4 sm:p-5 rounded-2xl border ${c.border} ${c.bg}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</span>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div className={`text-2xl sm:text-3xl font-black font-mono mt-2 ${c.color}`}>
                {loading ? '...' : c.value}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Period Switcher */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto pb-1 md:pb-0">
          {periodBtns.map((b) => (
            <button
              key={b.v}
              onClick={() => setPeriod(b.v)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
                period === b.v
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {b.l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-lg">
          {/* Reseller Filter (Admin Only) */}
          {!isReseller && resellers.length > 0 && (
            <select
              className="glass-input text-xs py-2 px-3 rounded-xl w-auto min-w-[150px]"
              value={filterRes}
              onChange={(e) => setFilterRes(e.target.value)}
            >
              <option value="">All Resellers &amp; Direct</option>
              {resellers.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
              ))}
            </select>
          )}

          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="glass-input pl-8 text-xs"
              placeholder="Search ledger..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-panel overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-5">Date</th>
                <th className="py-3.5 px-4">License Key</th>
                <th className="py-3.5 px-4">Client / Plan</th>
                {!isReseller && <th className="py-3.5 px-4">Reseller Partner</th>}
                <th className="py-3.5 px-4">Sale Price</th>
                <th className="py-3.5 px-4">Commission</th>
                <th className="py-3.5 px-5 text-right">{isReseller ? 'My Share' : 'Net Profit'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={isReseller ? 6 : 7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <span className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Loading ledger records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={isReseller ? 6 : 7} className="py-12 text-center">
                    <div className="max-w-xs mx-auto text-slate-400">
                      <TrendingUp className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                      <p className="font-bold text-white text-sm">No transaction records found</p>
                      <p className="text-xs text-slate-500 mt-1">
                        When paid licenses are generated, sales and commissions automatically log here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item, idx) => {
                  const salePrice = parseFloat(item.sale_price) || 0;
                  const comm = parseFloat(item.commission_amount) || 0;
                  const net = isReseller ? comm : (salePrice - comm);

                  return (
                    <tr key={item.id || idx} className="table-row-hover">
                      {/* Date */}
                      <td className="py-3.5 px-4 sm:px-5 text-slate-300 font-mono text-xs">
                        {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>

                      {/* License Key */}
                      <td className="py-3.5 px-4">
                        <code className="font-mono text-xs text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 select-all max-w-[130px] truncate block" title={item.license_key}>
                          {item.license_key && item.license_key.length > 20
                            ? `${item.license_key.substring(0, 14)}...`
                            : item.license_key}
                        </code>
                      </td>

                      {/* Client / Plan */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">
                          {item.customer_name || 'Direct Buyer'}
                        </div>
                        <span className="text-[10px] text-indigo-400 font-semibold">
                          {item.plan_type || 'Pro License'}
                        </span>
                      </td>

                      {/* Reseller Name */}
                      {!isReseller && (
                        <td className="py-3.5 px-4">
                          {item.reseller_name ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-indigo-300 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded">
                              <Users className="w-3 h-3 text-indigo-400" />
                              <span>{item.reseller_name}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 font-medium">Direct / Admin</span>
                          )}
                        </td>
                      )}

                      {/* Sale Price */}
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {fmt(salePrice, currency)}
                      </td>

                      {/* Commission */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {comm > 0 ? (
                          <span className="text-indigo-400">
                            {fmt(comm, currency)} ({item.commission_percent || 30}%)
                          </span>
                        ) : (
                          <span className="text-slate-500">₹0 (0%)</span>
                        )}
                      </td>

                      {/* Net */}
                      <td className="py-3.5 px-5 text-right font-mono font-black text-sm text-emerald-400">
                        +{fmt(net, currency)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Count */}
        <div className="p-3.5 bg-slate-950/60 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between px-5">
          <span>
            Showing {paginated.length} of {filtered.length} transactions
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-white text-xs">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
