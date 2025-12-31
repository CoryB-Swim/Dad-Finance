
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  LineChart, Line, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { 
  Wallet, TrendingUp, TrendingDown, LayoutDashboard, Table as TableIcon, 
  Store, Layers, Calendar, RotateCcw, ChevronRight, BarChart3, Sigma, Calculator
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

  const monthlyGridData = useMemo(() => {
    const grid: Record<string, Record<string, number>> = {};
    const incomeCats = new Set<string>();
    const expenseCats = new Set<string>();
    filteredTransactions.forEach(t => {
      const monthIdx = new Date(t.date).getMonth();
      const cat = t.category;
      if (!grid[cat]) grid[cat] = {};
      grid[cat][monthIdx] = (grid[cat][monthIdx] || 0) + t.amount;
      if (t.type === TransactionType.INCOME) incomeCats.add(cat);
      else expenseCats.add(cat);
    });
    return { grid, incomeCats: Array.from(incomeCats).sort(), expenseCats: Array.from(expenseCats).sort() };
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
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
            <SummaryTable gridData={monthlyGridData} />
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

const SummaryTable = ({ gridData }: { gridData: any }) => {
  const { grid, incomeCats, expenseCats } = gridData;
  // Fix: Explicitly cast the values from Object.values to number array before reduce to avoid unknown type errors.
  const getRowTotal = (cat: string) => (Object.values(grid[cat] || {}) as number[]).reduce((a: number, b: number) => a + b, 0);
  // Fix: Ensure the accumulator and the added value are treated as numbers to avoid unknown type errors in strict TypeScript.
  const getMonthTotal = (monthIdx: number, cats: string[]) => cats.reduce((sum: number, cat: string) => sum + (Number(grid[cat]?.[monthIdx]) || 0), 0);
  
  let runningBalance = 0;

  return (
    <table className="w-full text-[11px] text-left border-collapse">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          <th className="px-6 py-4 font-black text-blue-600 uppercase w-40 sticky left-0 bg-gray-50 z-10">Intelligence Grid</th>
          {MONTH_NAMES.map(m => <th key={m} className="px-3 py-4 font-black text-gray-400 text-center uppercase tracking-tighter">{m}</th>)}
          <th className="px-6 py-4 font-black text-gray-900 text-center border-l bg-gray-50">Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        <tr className="bg-white font-black text-emerald-600">
          <td className="px-6 py-4 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Net Income</td>
          {MONTH_NAMES.map((_, i) => <td key={i} className="px-3 py-4 text-center">${getMonthTotal(i, incomeCats).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
          <td className="px-6 py-4 text-center border-l bg-gray-50">${incomeCats.reduce((s, c) => s + getRowTotal(c), 0).toLocaleString()}</td>
        </tr>
        <tr className="bg-white font-black text-rose-500">
          <td className="px-6 py-4 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Total Expenses</td>
          {MONTH_NAMES.map((_, i) => <td key={i} className="px-3 py-4 text-center">${getMonthTotal(i, expenseCats).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
          <td className="px-6 py-4 text-center border-l bg-gray-50">${expenseCats.reduce((s, c) => s + getRowTotal(c), 0).toLocaleString()}</td>
        </tr>
        <tr className="bg-blue-50/30 font-black text-blue-800 border-t-2 border-blue-100">
          <td className="px-6 py-4 sticky left-0 bg-blue-50/30">Running Balance</td>
          {MONTH_NAMES.map((_, i) => {
            runningBalance += (getMonthTotal(i, incomeCats) - getMonthTotal(i, expenseCats));
            return <td key={i} className="px-3 py-4 text-center">${runningBalance.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
          })}
          <td className="px-6 py-4 text-center border-l bg-blue-50/50"></td>
        </tr>
        <tr className="bg-gray-50/50"><td colSpan={14} className="px-6 py-2.5 font-black text-emerald-800 uppercase tracking-widest text-[9px]">Income Categories Breakdown</td></tr>
        {incomeCats.map(cat => (
          <tr key={cat} className="hover:bg-gray-50">
            <td className="px-6 py-3 text-gray-600 sticky left-0 bg-white font-bold">{cat}</td>
            {MONTH_NAMES.map((_, i) => <td key={i} className="px-3 py-3 text-center text-gray-500">${(grid[cat]?.[i] || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
            <td className="px-6 py-3 text-center font-black text-emerald-600 border-l bg-gray-50/50">${getRowTotal(cat).toLocaleString()}</td>
          </tr>
        ))}
        <tr className="bg-gray-50/50"><td colSpan={14} className="px-6 py-2.5 font-black text-rose-800 uppercase tracking-widest text-[9px]">Expense Categories Breakdown</td></tr>
        {expenseCats.map(cat => (
          <tr key={cat} className="hover:bg-gray-50">
            <td className="px-6 py-3 text-gray-600 sticky left-0 bg-white font-bold">{cat}</td>
            {MONTH_NAMES.map((_, i) => <td key={i} className="px-3 py-3 text-center text-gray-500">${(grid[cat]?.[i] || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
            <td className="px-6 py-3 text-center font-black text-rose-600 border-l bg-gray-50/50">${getRowTotal(cat).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Dashboard;
