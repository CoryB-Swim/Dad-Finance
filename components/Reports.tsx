import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Cell, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  BarChart3, 
  Table as TableIcon, 
  Store, 
  TrendingUp, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Layers,
  RotateCcw
} from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  categories: Category[];
}

type ReportTab = 'overview' | 'monthly' | 'merchants' | 'categories';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1', '#14B8A6', '#F97316'];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const Reports: React.FC<ReportsProps> = ({ transactions, categories }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Presets
  const setThisYear = () => {
    const year = new Date().getFullYear();
    setStartDate(`${year}-01-01`);
    setEndDate(`${year}-12-31`);
  };

  const setLastYear = () => {
    const year = new Date().getFullYear() - 1;
    setStartDate(`${year}-01-01`);
    setEndDate(`${year}-12-31`);
  };

  const clearRange = () => {
    setStartDate('');
    setEndDate('');
  };

  // Filtered transactions based on date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesStart = !startDate || t.date >= startDate;
      const matchesEnd = !endDate || t.date <= endDate;
      return matchesStart && matchesEnd;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, startDate, endDate]);

  // 1. Monthly Grid Data
  const monthlyGridData = useMemo(() => {
    const grid: Record<string, Record<string, number>> = {};
    const incomeCats = new Set<string>();
    const expenseCats = new Set<string>();

    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      const monthIdx = date.getMonth();
      const cat = t.category;
      
      if (!grid[cat]) grid[cat] = {};
      grid[cat][monthIdx] = (grid[cat][monthIdx] || 0) + t.amount;

      if (t.type === TransactionType.INCOME) incomeCats.add(cat);
      else expenseCats.add(cat);
    });

    return { 
      grid, 
      incomeCats: Array.from(incomeCats).sort(), 
      expenseCats: Array.from(expenseCats).sort() 
    };
  }, [filteredTransactions]);

  // 2. Trend Chart Data
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

  // 3. Merchant Data
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

  // 4. Category Average Data
  const categoryAverages = useMemo(() => {
    const totals: Record<string, number> = {};
    const monthCounts: Record<string, Set<number>> = {};
    
    filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
      const month = new Date(t.date).getMonth();
      totals[t.category] = (totals[t.category] || 0) + t.amount;
      if (!monthCounts[t.category]) monthCounts[t.category] = new Set();
      monthCounts[t.category].add(month);
    });

    return Object.entries(totals).map(([name, total]) => ({
      name,
      total,
      average: total / Math.max(monthCounts[name].size, 1)
    })).sort((a, b) => b.average - a.average);
  }, [filteredTransactions]);

  const SummaryTable = () => {
    const { grid, incomeCats, expenseCats } = monthlyGridData;
    const getRowTotal = (cat: string) => Object.values(grid[cat] || {}).reduce((a, b) => a + b, 0);
    const getMonthTotal = (monthIdx: number, cats: string[]) => cats.reduce((sum, cat) => sum + (grid[cat]?.[monthIdx] || 0), 0);
    const totalIncome = (m: number) => getMonthTotal(m, incomeCats);
    const totalExpenses = (m: number) => getMonthTotal(m, expenseCats);

    let runningBalance = 0;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-[11px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 font-black text-blue-600 uppercase w-32 sticky left-0 bg-gray-50 z-10">Summary</th>
              {MONTH_NAMES.map(m => <th key={m} className="px-3 py-3 font-bold text-gray-500 text-center">{m}</th>)}
              <th className="px-3 py-3 font-black text-gray-900 text-center border-l">Total</th>
              <th className="px-3 py-3 font-black text-gray-400 text-center">Avg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <tr className="bg-white hover:bg-gray-50/50">
              <td className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-white">Income</td>
              {MONTH_NAMES.map((_, i) => <td key={i} className="px-3 py-3 text-center text-emerald-600 font-medium">${totalIncome(i).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
              <td className="px-3 py-3 text-center font-bold border-l">${incomeCats.reduce((s, c) => s + getRowTotal(c), 0).toLocaleString()}</td>
              <td className="px-3 py-3 text-center text-gray-400 font-medium">${(incomeCats.reduce((s, c) => s + getRowTotal(c), 0) / 12).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
            </tr>
            <tr className="bg-white hover:bg-gray-50/50">
              <td className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-white">Expenses</td>
              {MONTH_NAMES.map((_, i) => <td key={i} className="px-3 py-3 text-center text-rose-500 font-medium">${totalExpenses(i).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
              <td className="px-3 py-3 text-center font-bold border-l">${expenseCats.reduce((s, c) => s + getRowTotal(c), 0).toLocaleString()}</td>
              <td className="px-3 py-3 text-center text-gray-400 font-medium">${(expenseCats.reduce((s, c) => s + getRowTotal(c), 0) / 12).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
            </tr>
            <tr className="bg-gray-50/50 font-bold border-t-2 border-gray-100">
              <td className="px-4 py-3 text-blue-800 sticky left-0 bg-gray-50">Net savings</td>
              {MONTH_NAMES.map((_, i) => {
                const net = totalIncome(i) - totalExpenses(i);
                return <td key={i} className={`px-3 py-3 text-center ${net < 0 ? 'text-rose-600 bg-rose-50/30' : 'text-emerald-700'}`}>${net.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
              })}
              <td className="px-3 py-3 text-center border-l bg-gray-50">${(incomeCats.reduce((s, c) => s + getRowTotal(c), 0) - expenseCats.reduce((s, c) => s + getRowTotal(c), 0)).toLocaleString()}</td>
              <td className="px-3 py-3 text-center text-gray-400">Avg</td>
            </tr>
            <tr className="bg-blue-50/30 font-black">
              <td className="px-4 py-3 text-blue-900 sticky left-0 bg-blue-50/30">Ending balance</td>
              {MONTH_NAMES.map((_, i) => {
                runningBalance += (totalIncome(i) - totalExpenses(i));
                return <td key={i} className="px-3 py-3 text-center text-blue-800">${runningBalance.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
              })}
              <td className="px-3 py-3 text-center border-l"></td>
              <td className="px-3 py-3 text-center text-gray-400"></td>
            </tr>
            <tr className="bg-gray-50/80"><td colSpan={15} className="px-4 py-2 font-black text-emerald-700 uppercase tracking-widest text-[9px]">Income Categories</td></tr>
            {incomeCats.map(cat => (
              <tr key={cat} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-600 sticky left-0 bg-white font-medium">{cat}</td>
                {MONTH_NAMES.map((_, i) => <td key={i} className="px-3 py-2.5 text-center text-gray-500">${(grid[cat]?.[i] || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
                <td className="px-3 py-2.5 text-center font-bold text-emerald-600 border-l">${getRowTotal(cat).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-center text-gray-400">${(getRowTotal(cat) / 12).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
              </tr>
            ))}
            <tr className="bg-gray-50/80"><td colSpan={15} className="px-4 py-2 font-black text-rose-700 uppercase tracking-widest text-[9px]">Expense Categories</td></tr>
            {expenseCats.map(cat => (
              <tr key={cat} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-600 sticky left-0 bg-white font-medium">{cat}</td>
                {MONTH_NAMES.map((_, i) => <td key={i} className="px-3 py-2.5 text-center text-gray-500">${(grid[cat]?.[i] || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
                <td className="px-3 py-2.5 text-center font-bold text-rose-600 border-l">${getRowTotal(cat).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-center text-gray-400">${(getRowTotal(cat) / 12).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const NavItem = ({ id, icon: Icon, label }: { id: ReportTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
        activeTab === id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          <NavItem id="overview" icon={TrendingUp} label="Overview" />
          <NavItem id="monthly" icon={TableIcon} label="Monthly Grid" />
          <NavItem id="merchants" icon={Store} label="Merchants" />
          <NavItem id="categories" icon={Layers} label="Categories" />
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 border-r pr-4 border-gray-100 mr-2">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Report Range</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold h-9 outline-none focus:bg-white transition-all" />
            <span className="text-gray-300 font-bold text-xs">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold h-9 outline-none focus:bg-white transition-all" />
          </div>
          <div className="flex gap-2">
            <button onClick={setThisYear} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">This Year</button>
            <button onClick={setLastYear} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">Last Year</button>
            {(startDate || endDate) && (
              <button onClick={clearRange} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><RotateCcw size={14} /></button>
            )}
          </div>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-8">Cash Flow Dynamics</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 600, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 600, fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} name="Income" />
                    <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} name="Expenses" />
                    <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={4} dot={{r: 6, strokeWidth: 3}} strokeDasharray="5 5" name="Ending Balance" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Savings</p>
                 <h4 className="text-2xl font-black text-emerald-600">${trendData.reduce((acc, curr) => acc + (curr.income - curr.expenses), 0).toLocaleString()}</h4>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Monthly Income</p>
                 <h4 className="text-2xl font-black text-gray-900">${(trendData.reduce((acc, curr) => acc + curr.income, 0) / 12).toLocaleString(undefined, {maximumFractionDigits:0})}</h4>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Monthly Expense</p>
                 <h4 className="text-2xl font-black text-rose-500">${(trendData.reduce((acc, curr) => acc + curr.expenses, 0) / 12).toLocaleString(undefined, {maximumFractionDigits:0})}</h4>
               </div>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Efficiency Ratio</p>
                 <h4 className="text-2xl font-black text-blue-600">
                   {((trendData.reduce((a,c) => a+c.income, 0) - trendData.reduce((a,c) => a+c.expenses, 0)) / trendData.reduce((a,c) => a+c.income, 1) * 100).toFixed(1)}%
                 </h4>
               </div>
            </div>
          </div>
        )}
        {activeTab === 'monthly' && <SummaryTable />}
        {activeTab === 'merchants' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-6 border-b border-gray-50"><h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Merchant Loyalty Analysis</h3></div>
             <table className="w-full text-left">
               <thead className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-100">
                 <tr><th className="px-6 py-4">Merchant</th><th className="px-6 py-4">Core Category</th><th className="px-6 py-4 text-center">Visits</th><th className="px-6 py-4 text-right">Avg Spend</th><th className="px-6 py-4 text-right">Total Period Spend</th></tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {merchantStats.map((m) => (
                   <tr key={m.name} className="hover:bg-gray-50 transition-colors">
                     <td className="px-6 py-4 font-bold text-gray-900">{m.name}</td>
                     <td className="px-6 py-4"><span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 rounded text-gray-500 uppercase">{m.category}</span></td>
                     <td className="px-6 py-4 text-center text-sm font-medium text-gray-600">{m.count}</td>
                     <td className="px-6 py-4 text-right text-sm font-bold text-gray-600">${m.average.toFixed(2)}</td>
                     <td className="px-6 py-4 text-right text-lg font-black text-indigo-600">${m.total.toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-8">Average $ spent per category</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryAverages} margin={{ bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 600, fill: '#94a3b8'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="average" radius={[6, 6, 0, 0]} barSize={40}>
                      {categoryAverages.map((_, index) => <Cell key={`cell-${index}`} fill="#E07A5F" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-100">
                    <tr><th className="px-6 py-4">Category</th><th className="px-6 py-4 text-right">Total Spent</th><th className="px-6 py-4 text-right">Monthly Average</th><th className="px-6 py-4 text-right">% of Outgoings</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {categoryAverages.map(c => {
                      const grandTotal = categoryAverages.reduce((s, x) => s + x.total, 0);
                      return (
                        <tr key={c.name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                          <td className="px-6 py-4 text-right font-medium text-gray-600">${c.total.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-black text-gray-800">${c.average.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                          <td className="px-6 py-4 text-right"><span className="text-xs font-black text-rose-500 bg-rose-50 px-2 py-1 rounded">{((c.total / grandTotal) * 100).toFixed(1)}%</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;