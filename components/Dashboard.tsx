import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  LineChart, Line, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { 
  Wallet, TrendingUp, TrendingDown, LayoutDashboard, Table as TableIcon, 
  Store, Layers, Calendar, RotateCcw, ChevronRight, ChevronDown, BarChart3, Sigma, Calculator,
  ArrowUpDown, SortAsc, SortDesc
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
}

type DashboardTab = 'overview' | 'monthly' | 'merchants' | 'categories';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1', '#14B8A6', '#F97316'];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const Dashboard: React.FC<DashboardProps> = ({ transactions, categories }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filtering Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesStart = !startDate || t.date >= startDate;
      const matchesEnd = !endDate || t.date <= endDate;
      return matchesStart && matchesEnd;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, startDate, endDate]);

  // Primary Stats
  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expenses;
    return { income, expenses, balance };
  }, [filteredTransactions]);

  // Data for Charts/Tables
  const trendData = useMemo(() => {
    const months: Record<number, { income: number; expenses: number; balance: number }> = {};
    let cumulative = 0;
    for(let i=0; i<12; i++) months[i] = { income: 0, expenses: 0, balance: 0 };
    filteredTransactions.forEach(t => {
      const monthIdx = new Date(t.date).getMonth();
      if (t.type === TransactionType.INCOME) {
        months[monthIdx].income += t.amount;
        cumulative += t.amount;
      } else {
        months[monthIdx].expenses += t.amount;
        cumulative -= t.amount;
      }
      months[monthIdx].balance = cumulative;
    });
    return Object.entries(months).map(([idx, data]) => ({
      name: MONTH_NAMES[parseInt(idx)],
      ...data
    }));
  }, [filteredTransactions]);

  const categoryStats = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const merchantStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number; category: string }> = {};
    filteredTransactions.forEach(t => {
      if (!t.merchant) return;
      if (!stats[t.merchant]) stats[t.merchant] = { total: 0, count: 0, category: t.category };
      stats[t.merchant].total += t.amount;
      stats[t.merchant].count += 1;
    });
    return Object.entries(stats)
      .map(([name, s]) => ({ name, ...s, average: s.total / s.count }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  // Hierarchical Data for the Ledger Tab
  const hierarchicalGrid = useMemo(() => {
    const tree: Record<string, any> = {
      [TransactionType.INCOME]: {},
      [TransactionType.EXPENSE]: {}
    };

    filteredTransactions.forEach(t => {
      const type = t.type;
      if (type !== TransactionType.INCOME && type !== TransactionType.EXPENSE) return;
      
      const monthIdx = new Date(t.date).getMonth();
      const cat = t.category || 'Uncategorized';
      const sub = t.subCategory || 'General';
      const merch = t.merchant || 'Direct / Other';

      if (!tree[type][cat]) {
        tree[type][cat] = { total: 0, months: {}, subCategories: {} };
      }
      tree[type][cat].total += t.amount;
      tree[type][cat].months[monthIdx] = (tree[type][cat].months[monthIdx] || 0) + t.amount;

      if (!tree[type][cat].subCategories[sub]) {
        tree[type][cat].subCategories[sub] = { total: 0, months: {}, merchants: {} };
      }
      tree[type][cat].subCategories[sub].total += t.amount;
      tree[type][cat].subCategories[sub].months[monthIdx] = (tree[type][cat].subCategories[sub].months[monthIdx] || 0) + t.amount;

      if (!tree[type][cat].subCategories[sub].merchants[merch]) {
        tree[type][cat].subCategories[sub].merchants[merch] = { total: 0, months: {} };
      }
      tree[type][cat].subCategories[sub].merchants[merch].total += t.amount;
      tree[type][cat].subCategories[sub].merchants[merch].months[monthIdx] = (tree[type][cat].subCategories[sub].merchants[merch].months[monthIdx] || 0) + t.amount;
    });

    return tree;
  }, [filteredTransactions]);

  // Date Presets
  const setThisYear = () => {
    const year = new Date().getFullYear();
    setStartDate(`${year}-01-01`); setEndDate(`${year}-12-31`);
  };
  const setLastYear = () => {
    const year = new Date().getFullYear() - 1;
    setStartDate(`${year}-01-01`); setEndDate(`${year}-12-31`);
  };

  const StatCard = ({ title, amount, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition-shadow">
      <div className={`p-4 rounded-xl ${colorClass}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-gray-900 leading-none">${amount.toLocaleString()}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Balance" amount={stats.balance} icon={Wallet} colorClass="bg-blue-500" />
        <StatCard title="Total Income" amount={stats.income} icon={TrendingUp} colorClass="bg-emerald-500" />
        <StatCard title="Total Expenses" amount={stats.expenses} icon={TrendingDown} colorClass="bg-rose-500" />
      </div>

      {/* 2. Intelligence Controls */}
      <div className="flex flex-wrap items-center justify-between gap-6 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex bg-gray-100 p-1.5 rounded-2xl">
          <TabButton id="overview" icon={BarChart3} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <TabButton id="monthly" icon={TableIcon} label="Ledger" active={activeTab === 'monthly'} onClick={() => setActiveTab('monthly')} />
          <TabButton id="merchants" icon={Store} label="Payees" active={activeTab === 'merchants'} onClick={() => setActiveTab('merchants')} />
          <TabButton id="categories" icon={Layers} label="Insights" active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border-r pr-4 border-gray-100 mr-2">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Range</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold h-9 outline-none focus:bg-white transition-all" />
            <span className="text-gray-300 font-bold text-xs">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold h-9 outline-none focus:bg-white transition-all" />
          </div>
          <div className="flex gap-2">
            <button onClick={setThisYear} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">This Year</button>
            <button onClick={setLastYear} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">Last Year</button>
            {(startDate || endDate) && <button onClick={() => {setStartDate(''); setEndDate('');}} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><RotateCcw size={14} /></button>}
          </div>
        </div>
      </div>

      {/* 3. Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-8">Monthly Trend Analysis</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                      <Legend />
                      <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" name="Income" />
                      <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" name="Expenses" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-8">Category Distribution</h3>
                <div className="h-[350px]">
                  {categoryStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryStats} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" nameKey="name">
                          {categoryStats.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-300 italic font-bold">No categorical data found</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MiniStat label="Net Savings" value={stats.balance} icon={Sigma} color="text-emerald-600" />
              <MiniStat label="Avg Monthly Income" value={trendData.reduce((a,c)=>a+c.income, 0)/12} icon={TrendingUp} color="text-gray-900" />
              <MiniStat label="Avg Monthly Expense" value={trendData.reduce((a,c)=>a+c.expenses, 0)/12} icon={TrendingDown} color="text-rose-500" />
              <MiniStat label="Efficiency Ratio" value={(stats.income > 0 ? (stats.balance / stats.income) * 100 : 0)} icon={Calculator} color="text-blue-600" isPerc />
            </div>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="space-y-8">
            <SummaryTable hierarchicalGrid={hierarchicalGrid} />
          </div>
        )}

        {activeTab === 'merchants' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-6 border-b border-gray-50 flex items-center justify-between">
               <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Top Payee Analysis</h3>
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">Sorted by Volume</span>
             </div>
             <table className="w-full text-left">
               <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-100">
                 <tr><th className="px-8 py-4">Merchant / Payee</th><th className="px-8 py-4">Core Category</th><th className="px-8 py-4 text-center">Visit Count</th><th className="px-8 py-4 text-right">Volume ($)</th></tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {merchantStats.map((m) => (
                   <tr key={m.name} className="hover:bg-gray-50 transition-colors">
                     <td className="px-8 py-5 font-black text-gray-900 uppercase tracking-tight text-xs">{m.name}</td>
                     <td className="px-8 py-5"><span className="text-[9px] font-black px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500 uppercase tracking-widest">{m.category}</span></td>
                     <td className="px-8 py-5 text-center text-xs font-bold text-gray-600">{m.count}</td>
                     <td className="px-8 py-5 text-right font-black text-indigo-600">${m.total.toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-8">Expense Rankings</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryStats} margin={{ bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{fontSize: 9, fontWeight: 800, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={45}>
                      {categoryStats.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, icon: Icon, label, onClick }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
    <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
  </button>
);

const MiniStat = ({ label, value, icon: Icon, color, isPerc }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
    <div className={`w-10 h-10 mx-auto rounded-full bg-gray-50 flex items-center justify-center mb-3 ${color}`}><Icon size={18} /></div>
    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
    <h4 className={`text-xl font-black ${color}`}>{isPerc ? `${value.toFixed(1)}%` : `$${value.toLocaleString(undefined, {maximumFractionDigits:0})}`}</h4>
  </div>
);

const SummaryTable = ({ hierarchicalGrid }: { hierarchicalGrid: any }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<'value' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  // Fixed getMonthTotal to ensure it returns number and handles potential unknown types from Object.values on any
  const getMonthTotal = (monthIdx: number, type: TransactionType): number => {
    const cats = (hierarchicalGrid[type] || {}) as Record<string, any>;
    return (Object.values(cats) as any[]).reduce((sum: number, cat: any) => {
      const months = cat.months || {};
      return sum + (Number(months[monthIdx]) || 0);
    }, 0);
  };

  const renderDrilldownRows = (data: any, type: TransactionType, level: number = 0, parentId: string = '') => {
    return Object.entries(data)
      .sort((a, b) => {
        let comp = 0;
        if (sortMode === 'name') comp = a[0].localeCompare(b[0]);
        else comp = (a[1] as any).total - (b[1] as any).total;
        return sortOrder === 'asc' ? comp : -comp;
      })
      .map(([name, node]: [string, any]) => {
        const id = `${parentId}|${name}`;
        const isExpanded = expanded.has(id);
        const hasChildren = node.subCategories || node.merchants;
        const colorClass = type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-500';
        
        return (
          <React.Fragment key={id}>
            <tr 
              className={`hover:bg-gray-50 transition-colors group cursor-pointer ${level > 0 ? 'bg-gray-50/20' : ''}`}
              onClick={() => hasChildren && toggle(id)}
            >
              <td className="px-8 py-3 sticky left-0 bg-white group-hover:bg-gray-50 border-r border-gray-50 z-10" style={{ paddingLeft: `${level * 24 + 32}px` }}>
                <div className="flex items-center gap-2">
                  {hasChildren ? (
                    isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />
                  ) : (
                    <div className="w-[14px]" />
                  )}
                  <span className={`text-[11px] font-bold uppercase tracking-tight ${level === 0 ? 'text-gray-900 font-black' : 'text-gray-600'}`}>
                    {name}
                  </span>
                </div>
              </td>
              {MONTH_NAMES.map((_, i) => (
                <td key={i} className={`px-3 py-3 text-center text-[10px] font-bold ${node.months[i] ? 'text-gray-600' : 'text-gray-200'}`}>
                  {node.months[i] ? `$${node.months[i].toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                </td>
              ))}
              <td className={`px-8 py-3 text-center font-black border-l bg-gray-50/10 text-xs ${colorClass}`}>
                ${node.total.toLocaleString()}
              </td>
            </tr>
            {isExpanded && node.subCategories && renderDrilldownRows(node.subCategories, type, level + 1, id)}
            {isExpanded && node.merchants && renderDrilldownRows(node.merchants, type, level + 2, id)}
          </React.Fragment>
        );
      });
  };

  return (
    <div className="space-y-10">
      {/* 1. Cash Flow Summary Overview */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Cash Flow Analysis</h3>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 py-1 bg-white rounded-full border border-gray-100 shadow-sm">Aggregated Overview</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-4 font-black text-blue-600 uppercase w-48 sticky left-0 bg-white z-10">Metric</th>
                {MONTH_NAMES.map(m => <th key={m} className="px-3 py-4 font-black text-gray-400 text-center uppercase tracking-tighter">{m}</th>)}
                <th className="px-8 py-4 font-black text-gray-900 text-center border-l bg-gray-50/50">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="bg-white font-black text-emerald-600">
                <td className="px-8 py-5 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Net Income (+)</td>
                {MONTH_NAMES.map((_, i) => <td key={i} className="px-3 py-5 text-center">${getMonthTotal(i, TransactionType.INCOME).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
                {/* Fixed explicitly typing reduce to avoid unknown type errors */}
                <td className="px-8 py-5 text-center border-l bg-gray-50/30">${((Object.values(hierarchicalGrid[TransactionType.INCOME] || {}) as any[]).reduce((s: number, c: any) => s + (Number(c.total) || 0), 0)).toLocaleString()}</td>
              </tr>
              <tr className="bg-white font-black text-rose-500">
                <td className="px-8 py-5 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Total Expenses (-)</td>
                {MONTH_NAMES.map((_, i) => <td key={i} className="px-3 py-5 text-center">${getMonthTotal(i, TransactionType.EXPENSE).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
                {/* Fixed explicitly typing reduce to avoid unknown type errors */}
                <td className="px-8 py-5 text-center border-l bg-gray-50/30">${((Object.values(hierarchicalGrid[TransactionType.EXPENSE] || {}) as any[]).reduce((s: number, c: any) => s + (Number(c.total) || 0), 0)).toLocaleString()}</td>
              </tr>
              <tr className="bg-blue-50/40 font-black text-blue-800 border-t border-blue-100/50">
                <td className="px-8 py-5 sticky left-0 bg-blue-50/40 backdrop-blur-sm">Monthly Net Surplus</td>
                {MONTH_NAMES.map((_, i) => {
                  const net = getMonthTotal(i, TransactionType.INCOME) - getMonthTotal(i, TransactionType.EXPENSE);
                  return <td key={i} className={`px-3 py-5 text-center ${net < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>${net.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                })}
                <td className="px-8 py-5 text-center border-l bg-blue-50/20"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Detailed Drill-down Table for Income */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-emerald-50/30">
          <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest">Inbound Cash Drilldown</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="pl-4 pr-10 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-100 appearance-none cursor-pointer"
              >
                <option value="value">Value</option>
                <option value="name">Name</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm text-emerald-500 hover:text-emerald-600 transition-all active:scale-95"
            >
              {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-8 py-4 font-black text-[10px] text-gray-400 uppercase w-64 sticky left-0 bg-white z-10"></th>
                {MONTH_NAMES.map(m => <th key={m} className="px-3 py-4 font-black text-[10px] text-gray-400 text-center uppercase">{m}</th>)}
                <th className="px-8 py-4 font-black text-[10px] text-emerald-700 text-center border-l bg-gray-50/50">Year Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {renderDrilldownRows(hierarchicalGrid[TransactionType.INCOME] || {}, TransactionType.INCOME)}
              {Object.keys(hierarchicalGrid[TransactionType.INCOME] || {}).length === 0 && (
                <tr><td colSpan={14} className="px-8 py-10 text-center text-gray-300 italic font-bold">No income recorded for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Detailed Drill-down Table for Expenses */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-rose-50/30">
          <h3 className="text-sm font-black text-rose-800 uppercase tracking-widest">Outbound Cash Drilldown</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="pl-4 pr-10 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-rose-100 appearance-none cursor-pointer"
              >
                <option value="value">Value</option>
                <option value="name">Name</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm text-rose-500 hover:text-rose-600 transition-all active:scale-95"
            >
              {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-8 py-4 font-black text-[10px] text-gray-400 uppercase w-64 sticky left-0 bg-white z-10"></th>
                {MONTH_NAMES.map(m => <th key={m} className="px-3 py-4 font-black text-[10px] text-gray-400 text-center uppercase">{m}</th>)}
                <th className="px-8 py-4 font-black text-[10px] text-rose-700 text-center border-l bg-gray-50/50">Year Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {renderDrilldownRows(hierarchicalGrid[TransactionType.EXPENSE] || {}, TransactionType.EXPENSE)}
              {Object.keys(hierarchicalGrid[TransactionType.EXPENSE] || {}).length === 0 && (
                <tr><td colSpan={14} className="px-8 py-10 text-center text-gray-300 italic font-bold">No expenses recorded for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;