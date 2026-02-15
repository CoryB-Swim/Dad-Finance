import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  ComposedChart, Line, Area, CartesianGrid, XAxis, YAxis, Legend, BarChart, Bar, LabelList
} from 'recharts';
import { 
  Wallet, TrendingUp, TrendingDown, Table as TableIcon, 
  Store, Layers, Calendar as CalendarIcon, RotateCcw, ChevronDown, BarChart3, Sigma, Calculator,
  ArrowUpDown, MoveUp, MoveDown, History, ChevronRight, Hash, DollarSign, FileText, ListOrdered,
  ChevronLeft, LayoutList, SortAsc, SortDesc, CalendarDays
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
}

type DashboardTab = 'overview' | 'ledger' | 'comparison' | 'merchants' | 'categories';
type MerchantViewMode = 'list' | 'calendar' | 'yearly';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1', '#14B8A6', '#F97316'];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatLongDate = (dateStr: string) => {
  const date = new Date(dateStr.replace(/-/g, '/'));
  return new Intl.DateTimeFormat('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(date);
};

const TrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
    const expenses = payload.find((p: any) => p.dataKey === 'expenses')?.value || 0;
    const growth = payload.find((p: any) => p.dataKey === 'cumulative')?.value || 0;

    return (
      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 min-w-[180px] z-[100]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 pb-2">{label}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-4">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">Income</span>
            <span className="text-xs font-black text-gray-900">${income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-tight">Expenses</span>
            <span className="text-xs font-black text-gray-900">${expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center gap-4 pt-2 border-t border-gray-50">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">Net Growth</span>
            <span className={`text-xs font-black ${growth >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              ${growth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const ExpensePieTooltip = ({ active, payload, total }: { active?: boolean, payload?: any[], total: number }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;

    return (
      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 min-w-[160px] z-[200]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-50 pb-1.5">{data.name}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-tight">Amount</span>
            <span className="text-xs font-black text-gray-900">${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-tight">Percentage</span>
            <span className="text-xs font-black text-blue-600">{percentage}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomYoYTooltip = ({ active, payload, label, currentYear, prevYear }: any) => {
  if (active && payload && payload.length) {
    const focusData = payload.find((p: any) => p.dataKey === 'current');
    const compareData = payload.find((p: any) => p.dataKey === 'previous');
    const seasonalAvg = payload.find((p: any) => p.dataKey === 'seasonalAvg')?.value || 0;

    return (
      <div className="bg-white p-5 rounded-2xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 min-w-[240px] z-[100]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 pb-2">{label} Analysis</p>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Historical {label} Avg</span>
              <span className="text-xs font-black text-gray-900">${seasonalAvg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {focusData && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-tight text-blue-600">{currentYear} Actual</span>
                <span className="text-xs font-black text-gray-900">${focusData.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center justify-between text-[8px] font-black uppercase">
                <span className="text-gray-400">Vs Seasonal Avg</span>
                <span className={focusData.value > seasonalAvg ? 'text-rose-500' : 'text-emerald-500'}>
                  {focusData.value > seasonalAvg ? '+' : ''}{(((focusData.value - seasonalAvg) / (seasonalAvg || 1)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {compareData && (
            <div className="space-y-1 pt-2 border-t border-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-tight text-blue-300">{prevYear} Actual</span>
                <span className="text-xs font-black text-gray-900">${compareData.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center justify-between text-[8px] font-black uppercase">
                <span className="text-gray-300">Vs Seasonal Avg</span>
                <span className={compareData.value > seasonalAvg ? 'text-rose-300' : 'text-emerald-300'}>
                  {compareData.value > seasonalAvg ? '+' : ''}{(((compareData.value - seasonalAvg) / (seasonalAvg || 1)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, categories }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comparisonYear, setComparisonYear] = useState<string>('');
  
  // Drill-down State
  const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null);
  const [drillDownSubCategory, setDrillDownSubCategory] = useState<string | null>(null);
  const [drillDownMerchant, setDrillDownMerchant] = useState<string | null>(null);

  // Merchant View State
  const [merchantViewMode, setMerchantViewMode] = useState<MerchantViewMode>('yearly');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [merchantSort, setMerchantSort] = useState<{ key: 'date' | 'amount', dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });

  const datePresets = useMemo(() => {
    const todayStr = getLocalDateString();
    const now = new Date();
    const day = now.getDay(); 
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(new Date(now).setDate(diff));
    
    return {
      today: { start: todayStr, end: todayStr },
      week: { 
        start: `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`,
        end: todayStr 
      },
      month: {
        start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        end: todayStr
      }
    };
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(t => {
      const y = t.date.split('-')[0];
      if (y) years.add(y);
    });
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const toggleDateRange = (range: 'today' | 'week' | 'month') => {
    const { start, end } = datePresets[range];
    if (startDate === start && endDate === end) {
      setStartDate('');
      setEndDate('');
    } else {
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleYearChange = (year: string) => {
    if (!year) {
      setStartDate('');
      setEndDate('');
      return;
    }
    setStartDate(`${year}-01-01`);
    setEndDate(`${year}-12-31`);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesStart = !startDate || t.date >= startDate;
      const matchesEnd = !endDate || t.date <= endDate;
      return matchesStart && matchesEnd;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, startDate, endDate]);

  const seasonalMonthlyAverages = useMemo(() => {
    const monthSums = Array(12).fill(0);
    const monthCounts = Array(12).fill(0);
    const seenMonthYears = new Set<string>();

    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
      const d = new Date(t.date.replace(/-/g, '/'));
      const m = d.getMonth();
      const y = d.getFullYear();
      monthSums[m] += t.amount;
      seenMonthYears.add(`${m}-${y}`);
    });

    seenMonthYears.forEach(val => {
      const m = parseInt(val.split('-')[0]);
      monthCounts[m]++;
    });

    return monthSums.map((sum, i) => monthCounts[i] > 0 ? sum / monthCounts[i] : 0);
  }, [transactions]);

  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  const trendData = useMemo(() => {
    const months: Record<number, { income: number; expenses: number }> = {};
    for(let i=0; i<12; i++) months[i] = { income: 0, expenses: 0 };
    filteredTransactions.forEach(t => {
      const m = new Date(t.date.replace(/-/g, '/')).getMonth();
      if (t.type === TransactionType.INCOME) months[m].income += t.amount;
      else months[m].expenses += t.amount;
    });

    let runningCumulative = 0;
    return MONTH_NAMES.map((name, i) => {
      const income = months[i].income;
      const expenses = months[i].expenses;
      runningCumulative += (income - expenses);
      return { 
        name, 
        income, 
        expenses, 
        cumulative: runningCumulative 
      };
    });
  }, [filteredTransactions]);

  const annualTrendData = useMemo(() => {
    const years: Record<string, { income: number, expenses: number }> = {};
    transactions.forEach(t => {
      const y = t.date.split('-')[0];
      if (!y) return;
      if (!years[y]) years[y] = { income: 0, expenses: 0 };
      if (t.type === TransactionType.INCOME) years[y].income += t.amount;
      else if (t.type === TransactionType.EXPENSE) years[y].expenses += t.amount;
    });
    return Object.entries(years).map(([name, data]) => ({ name, ...data })).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const merchantStats = useMemo(() => {
    const data: Record<string, { total: number; count: number; category: string }> = {};
    filteredTransactions.forEach(t => {
      if (!t.merchant) return;
      if (!data[t.merchant]) data[t.merchant] = { total: 0, count: 0, category: t.category };
      data[t.merchant].total += t.amount;
      data[t.merchant].count += 1;
    });
    return Object.entries(data).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const comparisonData = useMemo(() => {
    const currentStart = startDate ? new Date(startDate.replace(/-/g, '/')) : new Date(new Date().getFullYear(), 0, 1);
    const focusYear = currentStart.getFullYear();
    const compareYearStr = comparisonYear || (focusYear - 1).toString();
    const compareYearNum = parseInt(compareYearStr);

    const focusTxs = transactions.filter(t => t.date.startsWith(focusYear.toString()));
    const benchmarkTxs = transactions.filter(t => t.date.startsWith(compareYearStr));

    const months: Record<number, { name: string; current: number; previous: number; currentInc: number; previousInc: number; seasonalAvg: number }> = {};
    for (let i = 0; i < 12; i++) {
      months[i] = { 
        name: MONTH_NAMES[i], 
        current: 0, 
        previous: 0, 
        currentInc: 0, 
        previousInc: 0,
        seasonalAvg: seasonalMonthlyAverages[i] 
      };
    }
    
    focusTxs.forEach(t => {
      const m = new Date(t.date.replace(/-/g, '/')).getMonth();
      if (t.type === TransactionType.EXPENSE) months[m].current += t.amount;
      else if (t.type === TransactionType.INCOME) months[m].currentInc += t.amount;
    });
    benchmarkTxs.forEach(t => {
      const m = new Date(t.date.replace(/-/g, '/')).getMonth();
      if (t.type === TransactionType.EXPENSE) months[m].previous += t.amount;
      else if (t.type === TransactionType.INCOME) months[m].previousInc += t.amount;
    });

    const data = Object.values(months);
    const totalCurrentExp = data.reduce((a, b) => a + b.current, 0);
    const totalPreviousExp = data.reduce((a, b) => a + b.previous, 0);
    const totalCurrentInc = data.reduce((a, b) => a + b.currentInc, 0);
    const totalPreviousInc = data.reduce((a, b) => a + b.previousInc, 0);

    return { 
      data, 
      currentYear: focusYear, 
      prevYear: compareYearNum,
      totalCurrentExp,
      totalPreviousExp,
      totalCurrentInc,
      totalPreviousInc,
      peakCurrent: Math.max(...data.map(d => d.current)),
      peakPrevious: Math.max(...data.map(d => d.previous))
    };
  }, [transactions, startDate, comparisonYear, seasonalMonthlyAverages]);

  const hierarchicalLedger = useMemo(() => {
    const tree: Record<string, any> = { [TransactionType.INCOME]: {}, [TransactionType.EXPENSE]: {} };
    filteredTransactions.forEach(t => {
      const type = t.type; if (type !== TransactionType.INCOME && type !== TransactionType.EXPENSE) return;
      const m = new Date(t.date.replace(/-/g, '/')).getMonth();
      const cat = t.category || 'Other';
      if (!tree[type][cat]) tree[type][cat] = { total: 0, months: Array(12).fill(0) };
      tree[type][cat].total += t.amount;
      tree[type][cat].months[m] += t.amount;
    });
    return tree;
  }, [filteredTransactions]);

  // Enhanced Explorer Data Logic
  const explorerData = useMemo(() => {
    const totals: Record<string, number> = {};
    
    // Filter transactions based on current drill-down level
    const baseSet = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);
    let targetSet = baseSet;
    let groupKey: 'category' | 'subCategory' | 'merchant' = 'category';

    if (drillDownCategory) {
      targetSet = baseSet.filter(t => t.category === drillDownCategory);
      groupKey = 'subCategory';
    }
    
    if (drillDownSubCategory) {
      targetSet = targetSet.filter(t => (t.subCategory || 'Unspecified') === drillDownSubCategory);
      groupKey = 'merchant';
    }

    targetSet.forEach(t => {
      const key = (groupKey === 'merchant' ? t.merchant : groupKey === 'subCategory' ? t.subCategory : t.category) || 'Unspecified';
      totals[key] = (totals[key] || 0) + t.amount;
    });

    const items = Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    
    const topN = 10;
    if (items.length <= topN) return items;

    const topItems = items.slice(0, topN);
    const remainder = items.slice(topN);
    const otherSum = remainder.reduce((sum, item) => sum + item.value, 0);

    return [
      ...topItems,
      { name: `Other ${groupKey === 'category' ? 'Categories' : groupKey === 'subCategory' ? 'Subs' : 'Merchants'}`, value: otherSum }
    ];
  }, [filteredTransactions, drillDownCategory, drillDownSubCategory]);

  const merchantDetailTransactions = useMemo(() => {
    if (!drillDownMerchant) return [];
    return filteredTransactions
      .filter(t => t.merchant === drillDownMerchant && t.type === TransactionType.EXPENSE)
      .sort((a, b) => {
        if (merchantSort.key === 'amount') {
          return merchantSort.dir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
        }
        return merchantSort.dir === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      });
  }, [filteredTransactions, drillDownMerchant, merchantSort]);

  // Set default calendar month to the first available transaction's month in the filtered set
  useEffect(() => {
    if (drillDownMerchant && merchantDetailTransactions.length > 0) {
      const earliest = [...merchantDetailTransactions].sort((a, b) => a.date.localeCompare(b.date))[0];
      if (earliest) {
        setCalendarDate(new Date(earliest.date.replace(/-/g, '/')));
      }
    }
  }, [drillDownMerchant, merchantDetailTransactions]);

  // Monthly Calendar Cell logic
  const getCalendarMonthData = (year: number, month: number, txs: Transaction[]) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: null, date: null, txs: [] });
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTxs = txs.filter(t => t.date === dateStr);
      days.push({ day: i, date: dateStr, txs: dayTxs });
    }
    while (days.length < 42) days.push({ day: null, date: null, txs: [] });
    return days;
  };

  // 3-Month Window for Timeline View
  const scrollableCalendarWindow = useMemo(() => {
    if (!drillDownMerchant) return [];
    const months = [];
    for (let i = 0; i < 3; i++) {
      const targetDate = new Date(calendarDate);
      targetDate.setMonth(calendarDate.getMonth() + i);
      const year = targetDate.getFullYear();
      const monthIdx = targetDate.getMonth();
      months.push({
        name: FULL_MONTH_NAMES[monthIdx],
        year,
        days: getCalendarMonthData(year, monthIdx, merchantDetailTransactions)
      });
    }
    return months;
  }, [calendarDate, merchantDetailTransactions, drillDownMerchant]);

  // Current selected month view data
  const calendarData = useMemo(() => {
    return getCalendarMonthData(calendarDate.getFullYear(), calendarDate.getMonth(), merchantDetailTransactions);
  }, [calendarDate, merchantDetailTransactions]);

  const merchantInsightStats = useMemo(() => {
    if (merchantDetailTransactions.length === 0) return { count: 0, avg: 0, total: 0 };
    const total = merchantDetailTransactions.reduce((s, t) => s + t.amount, 0);
    return {
      count: merchantDetailTransactions.length,
      total,
      avg: total / merchantDetailTransactions.length
    };
  }, [merchantDetailTransactions]);

  const explorerTotalValue = useMemo(() => explorerData.reduce((s, i) => s + i.value, 0), [explorerData]);

  const handleSliceClick = (data: any) => {
    if (!drillDownCategory) {
      if (!data.name.includes('Other')) setDrillDownCategory(data.name);
    } else if (!drillDownSubCategory) {
      if (!data.name.includes('Other')) setDrillDownSubCategory(data.name);
    } else if (!drillDownMerchant) {
      if (!data.name.includes('Other')) {
        setDrillDownMerchant(data.name);
      }
    }
  };

  const resetDrilldown = () => {
    setDrillDownCategory(null);
    setDrillDownSubCategory(null);
    setDrillDownMerchant(null);
    setMerchantViewMode('yearly');
    setMerchantSort({ key: 'date', dir: 'desc' });
  };

  const changeMonth = (offset: number) => {
    const next = new Date(calendarDate);
    next.setMonth(next.getMonth() + offset);
    setCalendarDate(next);
  };

  const toggleMerchantSort = (key: 'date' | 'amount') => {
    setMerchantSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Net Balance" amount={stats.balance} icon={Wallet} color="bg-blue-600" />
        <StatCard title="Total Income" amount={stats.income} icon={TrendingUp} color="bg-emerald-600" />
        <StatCard title="Total Expenses" amount={stats.expenses} icon={TrendingDown} color="bg-rose-600" />
      </div>

      <div className="space-y-4">
        <div className="bg-white p-2 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full overflow-x-auto">
            <TabBtn id="overview" icon={BarChart3} label="Overview" active={activeTab === 'overview'} onClick={setActiveTab} className="flex-1" />
            <TabBtn id="ledger" icon={TableIcon} label="Ledger" active={activeTab === 'ledger'} onClick={setActiveTab} className="flex-1" />
            <TabBtn id="comparison" icon={ArrowUpDown} label="YoY Compare" active={activeTab === 'comparison'} onClick={setActiveTab} className="flex-1" />
            <TabBtn id="merchants" icon={Store} label="Entities" active={activeTab === 'merchants'} onClick={setActiveTab} className="flex-1" />
            <TabBtn id="categories" icon={Layers} label="Insights" active={activeTab === 'categories'} onClick={setActiveTab} className="flex-1" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <PresetBtn label="Today" active={startDate === datePresets.today.start} onClick={() => toggleDateRange('today')} />
            <PresetBtn label="This Week" active={startDate === datePresets.week.start} onClick={() => toggleDateRange('week')} />
            <PresetBtn label="This Month" active={startDate === datePresets.month.start} onClick={() => toggleDateRange('month')} />
            <div className="h-6 w-px bg-gray-100 mx-1 hidden sm:block"></div>
            <div className="relative group">
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select 
                value={startDate ? startDate.split('-')[0] : ''}
                onChange={(e) => handleYearChange(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest pl-4 pr-10 py-2 rounded-xl outline-none cursor-pointer hover:bg-white transition-all shadow-sm"
              >
                <option value="">Full History</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 w-full md:w-auto shadow-inner">
            <CalendarIcon size={14} className="text-gray-400 ml-1" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none w-full md:w-28 uppercase" />
            <span className="text-[10px] font-black text-gray-300">TO</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none w-full md:w-28 uppercase" />
            {(startDate || endDate) && <button onClick={() => {setStartDate(''); setEndDate('');}} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg ml-1 transition-all"><RotateCcw size={14}/></button>}
          </div>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartBox title="Annual Trend Analysis">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={annualTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700}}
                      tickFormatter={(v) => `$${v.toLocaleString()}`}
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}} 
                      formatter={(v: number) => [`$${v.toLocaleString()}`, '']}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>

              <ChartBox title="Monthly Trend Analysis">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={trendData}>
                    <defs>
                      <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700}}
                      tickFormatter={(v) => `$${v.toLocaleString()}`}
                    />
                    <Tooltip content={<TrendTooltip />} cursor={{fill: '#f8fafc'}} />
                    <Legend verticalAlign="top" height={36} />
                    <Area type="monotone" dataKey="income" stroke="#10B981" fill="url(#colorInc)" strokeWidth={2} name="Income" />
                    <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="url(#colorExp)" strokeWidth={2} name="Expenses" />
                    <Line type="monotone" dataKey="cumulative" stroke="#2563EB" strokeWidth={3} dot={false} name="Cumulative Growth" />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartBox>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <MiniStat label="Net Savings" value={stats.balance} icon={Sigma} color="text-emerald-600" />
               <MiniStat label="Monthly Avg Income" value={stats.income / 12} icon={TrendingUp} color="text-gray-900" />
               <MiniStat label="Monthly Avg Spend" value={stats.expenses / 12} icon={TrendingDown} color="text-rose-500" />
               <MiniStat label="Efficiency Ratio" value={stats.income > 0 ? (stats.balance / stats.income) * 100 : 0} icon={Calculator} color="text-blue-600" isPerc />
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-4">Hierarchy</th>
                  {MONTH_NAMES.map(m => <th key={m} className="px-2 py-4 text-center">{m}</th>)}
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {renderLedgerRows(hierarchicalLedger[TransactionType.INCOME], 'Income', 'text-emerald-600')}
                {renderLedgerRows(hierarchicalLedger[TransactionType.EXPENSE], 'Expenses', 'text-rose-600')}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-2xl">
                <History size={16} className="text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-900">Period Configuration:</span>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-gray-400 uppercase">Focus Year</p>
                <select 
                  value={comparisonData.currentYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="bg-white border border-gray-100 text-[10px] font-black uppercase px-4 py-2 rounded-xl outline-none shadow-sm"
                >
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="text-gray-300 font-black">VS</div>
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-gray-400 uppercase">Compare Against</p>
                <select 
                  value={comparisonData.prevYear}
                  onChange={(e) => setComparisonYear(e.target.value)}
                  className="bg-white border border-gray-100 text-[10px] font-black uppercase px-4 py-2 rounded-xl outline-none shadow-sm"
                >
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-800 uppercase mb-8">YoY Comparison</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={comparisonData.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700}}
                      tickFormatter={(v) => `$${v.toLocaleString()}`}
                    />
                    <Tooltip 
                        content={<CustomYoYTooltip currentYear={comparisonData.currentYear} prevYear={comparisonData.prevYear} />} 
                        cursor={{fill: '#f8fafc'}} 
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar dataKey="current" fill="#2563EB" radius={[4,4,0,0]} name={`${comparisonData.currentYear} Actual`} />
                    <Bar dataKey="previous" fill="#DBEAFE" radius={[4,4,0,0]} name={`${comparisonData.prevYear} Actual`} />
                    <Line 
                      type="monotone" 
                      dataKey="seasonalAvg" 
                      stroke="#94a3b8" 
                      strokeDasharray="5 5" 
                      dot={false} 
                      strokeWidth={2} 
                      name="Historical Monthly Average" 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Growth Metrics</h3>
                <div className="space-y-4">
                  <ComparisonMetricCard 
                    label="Total Period Spend" 
                    currentVal={comparisonData.totalCurrentExp} 
                    prevVal={comparisonData.totalPreviousExp}
                    currentYear={comparisonData.currentYear}
                    prevYear={comparisonData.prevYear}
                  />
                  <ComparisonMetricCard 
                    label="Peak Monthly Spend" 
                    currentVal={comparisonData.peakCurrent} 
                    prevVal={comparisonData.peakPrevious}
                    currentYear={comparisonData.currentYear}
                    prevYear={comparisonData.prevYear}
                  />
                  <ComparisonMetricCard 
                    label="Efficiency Ratio" 
                    currentVal={comparisonData.totalCurrentInc > 0 ? ((comparisonData.totalCurrentInc - comparisonData.totalCurrentExp) / comparisonData.totalCurrentInc) * 100 : 0} 
                    prevVal={comparisonData.totalPreviousInc > 0 ? ((comparisonData.totalPreviousInc - comparisonData.totalPreviousExp) / comparisonData.totalPreviousInc) * 100 : 0}
                    currentYear={comparisonData.currentYear}
                    prevYear={comparisonData.prevYear}
                    isPerc
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'merchants' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                <tr><th className="px-8 py-4">Entity</th><th className="px-8 py-4">Category</th><th className="px-8 py-4 text-center">Visits</th><th className="px-8 py-4 text-right">Volume</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {merchantStats.map(m => (
                  <tr key={m.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-5 font-black text-gray-900 text-xs uppercase tracking-tight">{m.name}</td>
                    <td className="px-8 py-5"><span className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-500 uppercase">{m.category}</span></td>
                    <td className="px-8 py-5 text-center text-xs font-bold text-gray-600">{m.count}</td>
                    <td className="px-8 py-5 text-right font-black text-blue-600">${m.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            <ChartBox title="Expense Distribution Explorer">
              {/* Breadcrumbs */}
              <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button 
                  onClick={resetDrilldown}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${!drillDownCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                  All Categories
                </button>
                {drillDownCategory && (
                  <>
                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                    <button 
                      onClick={() => { setDrillDownSubCategory(null); setDrillDownMerchant(null); }}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${drillDownCategory && !drillDownSubCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                      {drillDownCategory}
                    </button>
                  </>
                )}
                {drillDownSubCategory && (
                  <>
                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                    <button 
                      onClick={() => setDrillDownMerchant(null)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${drillDownSubCategory && !drillDownMerchant ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                      {drillDownSubCategory}
                    </button>
                  </>
                )}
                {drillDownMerchant && (
                  <>
                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                    <button 
                      className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white whitespace-nowrap"
                    >
                      {drillDownMerchant}
                    </button>
                  </>
                )}
              </div>

              {/* Explorer Container - Adjusted proportions for Detail View */}
              <div className="flex flex-col md:flex-row items-stretch gap-6 min-h-[400px] lg:h-[420px] relative">
                {drillDownMerchant ? (
                  /* Detail View: Merchant Insight Cards - Tighter and Flipped Proportions */
                  <div className="w-full flex flex-col md:flex-row gap-5 items-stretch h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="w-full md:w-[35%] h-full flex flex-col justify-between space-y-2">
                      <div className="p-5 bg-blue-50 rounded-[24px] border border-blue-100 shadow-sm text-center flex-1 flex flex-col justify-center">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-2 shadow-lg shadow-blue-100">
                          <Store size={20} />
                        </div>
                        <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-0.5 truncate">{drillDownMerchant}</h4>
                        <p className="text-[8px] font-bold text-blue-400 uppercase tracking-[0.2em]">Aggregate Insights</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm flex flex-col items-center">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Visits</p>
                          <p className="text-xl font-black text-gray-900">{merchantInsightStats.count}</p>
                        </div>
                        <div className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm flex flex-col items-center">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Avg Ticket</p>
                          <p className="text-xl font-black text-gray-900">${merchantInsightStats.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-900 p-5 rounded-[24px] text-center shadow-xl">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Period Spend</p>
                        <p className="text-2xl font-black text-white">${merchantInsightStats.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                    
                    {/* Detailed History Timeline for Merchant - Tighter Padding & Removed Vertical Spacing */}
                    <div className="w-full md:w-[65%] h-full bg-gray-50/50 rounded-[28px] border border-gray-100 flex flex-col relative overflow-hidden">
                       <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-20">
                         <div className="flex items-center gap-2">
                           <ListOrdered size={14} className="text-gray-400" />
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">History Timeline</span>
                         </div>
                         <div className="flex bg-gray-200 p-0.5 rounded-lg">
                           <button 
                             onClick={() => setMerchantViewMode('list')}
                             className={`p-1 rounded-md transition-all ${merchantViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                             title="List View"
                           >
                             <LayoutList size={12} />
                           </button>
                           <button 
                             onClick={() => setMerchantViewMode('calendar')}
                             className={`p-1 rounded-md transition-all ${merchantViewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                             title="Monthly Calendar"
                           >
                             <CalendarIcon size={12} />
                           </button>
                           <button 
                             onClick={() => setMerchantViewMode('yearly')}
                             className={`p-1 rounded-md transition-all ${merchantViewMode === 'yearly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                             title="3-Month Timeline"
                           >
                             <CalendarDays size={12} />
                           </button>
                         </div>
                       </div>
                       
                       <div className={`flex-1 relative ${['calendar', 'yearly'].includes(merchantViewMode) ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
                         {merchantViewMode === 'list' ? (
                           /* List View with Sorting */
                           <div className="p-2 flex flex-col h-full">
                             <div className="flex items-center justify-end gap-3 px-2 mb-1 pb-1 border-b border-gray-100">
                               <button 
                                 onClick={() => toggleMerchantSort('date')}
                                 className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${merchantSort.key === 'date' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
                               >
                                 Date {merchantSort.key === 'date' && (merchantSort.dir === 'asc' ? <SortAsc size={8}/> : <SortDesc size={8}/>)}
                               </button>
                               <button 
                                 onClick={() => toggleMerchantSort('amount')}
                                 className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${merchantSort.key === 'amount' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
                               >
                                 Amount {merchantSort.key === 'amount' && (merchantSort.dir === 'asc' ? <SortAsc size={8}/> : <SortDesc size={8}/>)}
                               </button>
                             </div>
                             <div className="space-y-1 overflow-y-auto custom-scrollbar pr-1">
                               {merchantDetailTransactions.map((t, i) => (
                                 <div key={i} className="bg-white px-3 py-2 rounded-xl flex items-center justify-between border border-transparent shadow-sm hover:border-blue-100 transition-all group">
                                   <div className="flex items-center gap-3">
                                     <div className="p-1 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                       <CalendarIcon size={12} />
                                     </div>
                                     <p className="text-[10px] font-black text-gray-900 leading-none">{t.date}</p>
                                   </div>
                                   <span className="text-[12px] font-black text-rose-600 tabular-nums">
                                     -${t.amount.toFixed(2)}
                                   </span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         ) : merchantViewMode === 'calendar' ? (
                           /* Single Month Calendar View - Vertically Tighter (No gap-y) */
                           <div className="h-full flex flex-col p-3 animate-in zoom-in-95 duration-200 bg-white overflow-visible">
                             <div className="flex items-center justify-between mb-2 px-1">
                               <button onClick={() => changeMonth(-1)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors"><ChevronLeft size={14}/></button>
                               <h5 className="text-[9px] font-black uppercase text-gray-900 tracking-[0.2em]">
                                 {FULL_MONTH_NAMES[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                               </h5>
                               <button onClick={() => changeMonth(1)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors"><ChevronRight size={14}/></button>
                             </div>
                             
                             {/* Removed gap-y for tighter vertical rows */}
                             <div className="grid grid-cols-7 gap-x-1 gap-y-0 flex-1 overflow-visible border-t border-l border-gray-50">
                               {DAYS_SHORT.map(d => (
                                 <div key={d} className="text-center text-[7px] font-black text-gray-300 uppercase py-1 border-b border-r border-gray-50">{d[0]}</div>
                               ))}
                               {calendarData.map((d, i) => {
                                 const colIndex = i % 7;
                                 const isBottomRows = i >= 21;
                                 let tooltipXClass = "left-1/2 -translate-x-1/2";
                                 let arrowXClass = "left-1/2 -translate-x-1/2";
                                 if (colIndex <= 1) { tooltipXClass = "left-0 translate-x-0"; arrowXClass = "left-4"; } 
                                 else if (colIndex >= 5) { tooltipXClass = "right-0 translate-x-0 left-auto"; arrowXClass = "right-4 left-auto"; }

                                 return (
                                   <div key={i} className="relative group h-7 md:h-8 border-b border-r border-gray-50">
                                     {d.day ? (
                                       <>
                                         <div className={`w-full h-full flex items-center justify-center text-[8px] font-black transition-all ${
                                            d.txs.length > 0 
                                              ? 'bg-blue-600 text-white shadow-inner' 
                                              : 'bg-white text-gray-300'
                                          }`}>
                                           {d.day}
                                         </div>
                                         {d.txs.length > 0 && (
                                           <div className={`absolute ${isBottomRows ? 'bottom-full mb-2' : 'top-full mt-2'} ${tooltipXClass} z-[300] w-52 bg-white p-3 rounded-2xl shadow-[0_10px_40_rgba(0,0,0,0.15)] opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-y-1 group-hover:translate-y-0 border border-blue-50`}>
                                              <p className="text-[8px] font-black uppercase tracking-[0.1em] text-blue-600 mb-2 border-b border-gray-50 pb-1.5">{formatLongDate(d.date!)}</p>
                                              <div className="space-y-2 max-h-[120px] overflow-y-auto scrollbar-hide">
                                                {d.txs.map((tx, idx) => (
                                                  <div key={idx} className="flex flex-col gap-0.5 border-b border-gray-50 last:border-0 pb-1 last:pb-0">
                                                    <span className="text-[10px] font-black text-gray-900">${tx.amount.toFixed(2)}</span>
                                                  </div>
                                                ))}
                                              </div>
                                              <div className={`absolute ${isBottomRows ? 'top-full border-t-white' : 'bottom-full border-b-white'} ${arrowXClass} w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent ${isBottomRows ? 'border-t-[6px]' : 'border-b-[6px]'}`}></div>
                                           </div>
                                         )}
                                       </>
                                     ) : (
                                        <div className="w-full h-full bg-gray-50/20"></div>
                                     )}
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         ) : (
                           /* 3-Month Window Side-by-Side View - Vertically Tighter (gap-y-0) and No Overflow Clip */
                           <div className="h-full flex flex-col p-3 bg-white animate-in zoom-in-95 duration-300">
                             <div className="flex items-center justify-between mb-4 shrink-0 px-2">
                               <button onClick={() => changeMonth(-1)} className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><ChevronLeft size={16}/></button>
                               <h5 className="text-[9px] font-black uppercase text-gray-400 tracking-[0.15em]">Timeline Explorer</h5>
                               <button onClick={() => changeMonth(1)} className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><ChevronRight size={16}/></button>
                             </div>

                             <div className="grid grid-cols-3 gap-3 flex-1 overflow-visible">
                               {scrollableCalendarWindow.map((month, mIdx) => (
                                 <div key={mIdx} className="bg-gray-50/50 p-2 rounded-[20px] border border-gray-100/50 transition-all flex flex-col overflow-visible">
                                   <div className="flex items-center justify-between mb-1.5 px-1 bg-white/50 py-1">
                                      <h6 className="text-[8px] font-black uppercase text-blue-600 tracking-wider">{month.name}</h6>
                                      <span className="text-[7px] font-black text-gray-300">{month.year}</span>
                                   </div>
                                   {/* Removed gap-y for rows and added overflow-visible to fix tooltip clipping */}
                                   <div className="grid grid-cols-7 gap-x-0.5 gap-y-0 flex-1 border-t border-l border-gray-100/50 overflow-visible">
                                      {DAYS_SHORT.map(d => <div key={d} className="text-[6px] font-black text-gray-300 text-center py-0.5 uppercase border-b border-r border-gray-100/50">{d[0]}</div>)}
                                      {month.days.map((d, dIdx) => (
                                        <div key={dIdx} className="relative group border-b border-r border-gray-100/50">
                                          {d.day ? (
                                            <>
                                              <div className={`w-full h-full flex items-center justify-center text-[7px] font-bold transition-all ${
                                                d.txs.length > 0 
                                                  ? 'bg-blue-600 text-white shadow-inner' 
                                                  : 'bg-white text-gray-400'
                                              }`}>
                                                {d.day}
                                              </div>
                                              {d.txs.length > 0 && (
                                                <div className={`absolute bottom-full mb-2 ${mIdx === 2 ? 'right-0' : mIdx === 0 ? 'left-0' : 'left-1/2 -translate-x-1/2'} z-[300] w-52 bg-white p-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-blue-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-y-1 group-hover:translate-y-0`}>
                                                   <p className="text-[8px] font-black uppercase tracking-widest text-blue-500 mb-1 border-b border-gray-50 pb-1.5">{formatLongDate(d.date!)}</p>
                                                   <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-hide pr-1">
                                                     {d.txs.map((tx, txIdx) => (
                                                       <div key={txIdx} className="border-b border-gray-50 last:border-0 pb-1 last:pb-0">
                                                         <p className="text-[10px] font-black text-gray-900">${tx.amount.toFixed(2)}</p>
                                                       </div>
                                                     ))}
                                                   </div>
                                                   <div className={`absolute top-full ${mIdx === 2 ? 'right-2' : mIdx === 0 ? 'left-2' : 'left-1/2 -translate-x-1/2'} w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white`}></div>
                                                </div>
                                              )}
                                            </>
                                          ) : <div className="w-full h-full bg-gray-50/10"></div>}
                                        </div>
                                      ))}
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Chart View */
                  <>
                    <div className="w-full md:w-1/2 h-full relative flex items-center justify-center">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Spent</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">
                          ${explorerTotalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      
                      <div className="relative z-10 w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={explorerData} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" cy="50%" 
                              innerRadius={90} 
                              outerRadius={130} 
                              paddingAngle={3}
                              stroke="none"
                              onClick={handleSliceClick}
                              className="cursor-pointer outline-none"
                              animationBegin={0}
                              animationDuration={600}
                            >
                              {explorerData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<ExpensePieTooltip total={explorerTotalValue} />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="w-full md:w-1/2 h-full flex flex-col justify-center overflow-y-auto pr-6 space-y-0.5 custom-scrollbar">
                      {explorerData.map((item, i) => {
                        const percentage = explorerTotalValue > 0 ? ((item.value / explorerTotalValue) * 100).toFixed(1) : 0;
                        return (
                          <button 
                            key={item.name} 
                            onClick={() => handleSliceClick(item)}
                            className="w-full flex items-center justify-between py-1.5 px-4 rounded-2xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-100"
                          >
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                              <span className="text-[11px] font-black uppercase text-gray-500 truncate group-hover:text-gray-900">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-4 shrink-0 ml-4">
                              <span className="text-[12px] font-black text-gray-900">
                                ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="w-12 text-right text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">
                                {percentage}%
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </ChartBox>
          </div>
        )}
      </div>
    </div>
  );
};

const TabBtn = ({ id, icon: Icon, label, active, onClick, className = '' }: any) => (
  <button 
    onClick={() => onClick(id)}
    className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'} ${className}`}
  >
    <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
  </button>
);

const PresetBtn = ({ label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
  >
    {label}
  </button>
);

const StatCard = ({ title, amount, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5">
    <div className={`p-4 rounded-2xl ${color} text-white`}><Icon size={24} /></div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <h2 className="text-3xl font-black text-gray-900">${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
    </div>
  </div>
);

const MiniStat = ({ label, value, icon: Icon, color, isPerc }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center">
    <div className={`w-8 h-8 mx-auto rounded-full bg-gray-50 flex items-center justify-center mb-3 ${color}`}><Icon size={14} /></div>
    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">{label}</p>
    <h4 className={`text-lg font-black ${color}`}>
      {isPerc ? `${value.toFixed(1)}%` : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
    </h4>
  </div>
);

const ChartBox = ({ title, children }: any) => (
  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-8">{title}</h3>
    {children}
  </div>
);

const ComparisonMetricCard = ({ label, currentVal, prevVal, currentYear, prevYear, isPerc = false }: any) => {
  const diff = currentVal - prevVal;
  const growth = prevVal !== 0 ? (diff / prevVal) * 100 : 0;

  return (
    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">{label}</p>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[8px] font-black text-blue-500 uppercase">'{currentYear}</p>
            <h4 className="text-xl font-black text-gray-900 leading-none mt-1">
                {isPerc ? `${currentVal.toFixed(1)}%` : `$${currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </h4>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-gray-300 uppercase">'{prevYear}</p>
            <h4 className="text-lg font-black text-gray-400 leading-none mt-1">
                {isPerc ? `${prevVal.toFixed(1)}%` : `$${prevVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </h4>
          </div>
        </div>
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
           <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Annual Delta</span>
           <div className={`flex items-center gap-1 text-[10px] font-black ${growth > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
             {growth > 0 ? <MoveUp size={10}/> : <MoveDown size={10}/>} {Math.abs(growth).toFixed(0)}%
           </div>
        </div>
      </div>
    </div>
  );
};

const renderLedgerRows = (nodes: any, title: string, color: string) => {
  if (!nodes) return null;
  return (
    <>
      <tr className="bg-gray-100/30"><td colSpan={14} className={`px-6 py-2 text-[10px] font-black uppercase ${color}`}>{title}</td></tr>
      {Object.entries(nodes).map(([cat, data]: [string, any]) => (
        <tr key={cat} className="hover:bg-gray-50 transition-colors">
          <td className="px-6 py-3 font-black text-gray-900 text-xs uppercase tracking-tight">{cat}</td>
          {data.months.map((m: number, i: number) => (
            <td key={i} className={`px-2 py-3 text-center text-[10px] font-bold ${m > 0 ? 'text-gray-600' : 'text-gray-200'}`}>
              {m > 0 ? `$${m.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
            </td>
          ))}
          <td className={`px-6 py-3 text-right font-black text-xs border-l ${color}`}>${data.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
        </tr>
      ))}
    </>
  );
};

export default Dashboard;