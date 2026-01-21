
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, TransactionType, Category, Merchant, PaymentMethod } from '../types';
import { 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Calendar, 
  AlertCircle, 
  CreditCard, 
  Tag, 
  Store, 
  RotateCcw, 
  Hash, 
  Sigma, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  FileText,
  ListOrdered,
  Layers,
  Filter,
  Info,
  DollarSign,
  Repeat,
  SortAsc,
  SortDesc,
  Plus,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  ChevronDown
} from 'lucide-react';
import TransactionForm from './TransactionForm';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  merchants: Merchant[];
  paymentMethods: PaymentMethod[];
  onDelete: (id: number) => void;
  onDeleteMultiple?: (ids: number[]) => void;
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onAddCategory: (c: Category) => void;
  onUpdateCategory: (c: Category) => void;
  onAddMerchant: (m: Merchant) => void;
  onAddPaymentMethod: (p: PaymentMethod) => void;
  onSaveAsTemplate: (t: Transaction) => void;
  initialFilter?: { value: string, type: FilterScope } | null;
  onClearInitialFilter?: () => void;
  onViewMerchantDetail?: (name: string) => void;
}

const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type SortKey = 'date' | 'amount' | 'category' | 'subCategory' | 'merchant' | 'paymentMethod' | 'description';
type FilterScope = 'category' | 'sub' | 'merchant' | 'payment' | 'keyword';

interface FilterPill {
  value: string;
  type: FilterScope;
}

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  categories, 
  merchants,
  paymentMethods,
  onDelete,
  onDeleteMultiple,
  onAddTransaction,
  onUpdateTransaction,
  onAddCategory,
  onUpdateCategory,
  onAddMerchant,
  onAddPaymentMethod,
  onSaveAsTemplate,
  initialFilter,
  onClearInitialFilter,
  onViewMerchantDetail
}) => {
  const [activeFilters, setActiveFilters] = useState<FilterPill[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialFilter) {
      const { value, type } = initialFilter;
      if (!activeFilters.some(f => f.value === value && f.type === type)) {
        setActiveFilters([...activeFilters, { value, type }]);
      }
      onClearInitialFilter?.();
    }
  }, [initialFilter, activeFilters, onClearInitialFilter]);

  const addFilter = (val: string, scope: FilterScope = 'keyword') => {
    const clean = val.trim();
    if (clean && !activeFilters.some(f => f.value === clean && f.type === scope)) {
      setActiveFilters([...activeFilters, { value: clean, type: scope }]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeFilter = (val: string, scope: FilterScope) => {
    setActiveFilters(activeFilters.filter(f => !(f.value === val && f.type === scope)));
  };

  const getScopeLabel = (scope: FilterScope) => {
    switch (scope) {
      case 'category': return 'Categories';
      case 'merchant': return 'Merchants';
      case 'payment': return 'Payment Methods';
      case 'sub': return 'Sub-Categories';
      case 'keyword': return 'Notes';
      default: return '';
    }
  };

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

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(t => {
      const y = t.date.split('-')[0];
      if (y) years.add(y);
    });
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const handleYearChange = (year: string) => {
    if (!year) {
      setStartDate('');
      setEndDate('');
      return;
    }
    const newStart = `${year}-01-01`;
    const newEnd = `${year}-12-31`;
    if (startDate === newStart && endDate === newEnd) {
      setStartDate('');
      setEndDate('');
    } else {
      setStartDate(newStart);
      setEndDate(newEnd);
    }
  };

  const currentSelectedYear = useMemo(() => {
    return availableYears.find(year => startDate === `${year}-01-01` && endDate === `${year}-12-31`) || "";
  }, [startDate, endDate, availableYears]);

  const autocompleteSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const query = inputValue.toLowerCase().trim();
    
    const groups: { type: FilterScope; items: string[] }[] = [
      { type: 'category', items: [] },
      { type: 'sub', items: [] },
      { type: 'merchant', items: [] },
      { type: 'payment', items: [] }
    ];

    categories.forEach(c => {
      if (c.name.toLowerCase().includes(query)) groups[0].items.push(c.name);
      c.subCategories?.forEach(s => {
        if (s.toLowerCase().includes(query)) groups[1].items.push(s);
      });
    });

    merchants.forEach(m => {
      if (m.name.toLowerCase().includes(query)) groups[2].items.push(m.name);
    });

    paymentMethods.forEach(p => {
      if (p.name.toLowerCase().includes(query)) groups[3].items.push(p.name);
    });

    return groups.map(group => ({
      ...group,
      items: Array.from(new Set(group.items))
        .filter(item => !activeFilters.some(f => f.value === item && f.type === group.type))
        .slice(0, 8)
    })).filter(group => group.items.length > 0);
  }, [inputValue, categories, merchants, paymentMethods, activeFilters]);

  const duplicateInfo = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(t => {
      // Fingerprint now includes all relevant transaction data to strictly identify exact duplicates
      // including Notes (description), subCategory, and paymentMethod as requested.
      const fingerprint = `${t.date}|${t.amount}|${t.merchant || ''}|${t.category}|${t.subCategory || ''}|${t.type}|${t.paymentMethod || ''}|${t.description || ''}`;
      if (!groups[fingerprint]) groups[fingerprint] = [];
      groups[fingerprint].push(t);
    });

    const duplicateIds = new Set<number>();
    const allFlaggedIds = new Set<number>();
    Object.values(groups).forEach(group => {
      if (group.length > 1) {
        const sorted = [...group].sort((a, b) => (a.id || 0) - (b.id || 0));
        sorted.forEach((item, idx) => {
          if (item.id) {
            allFlaggedIds.add(item.id);
            if (idx > 0) duplicateIds.add(item.id);
          }
        });
      }
    });
    return { deleteList: Array.from(duplicateIds), flaggedIds: allFlaggedIds, totalPairs: Object.values(groups).filter(g => g.length > 1).length };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => {
      const matchesPills = activeFilters.length === 0 || activeFilters.every(filter => {
        const f = filter.value.toLowerCase();
        switch (filter.type) {
          case 'category': return t.category.toLowerCase().includes(f);
          case 'sub': return (t.subCategory || '').toLowerCase().includes(f);
          case 'merchant': return (t.merchant || '').toLowerCase().includes(f);
          case 'payment': return (t.paymentMethod || '').toLowerCase().includes(f);
          case 'keyword': return (t.description || '').toLowerCase().includes(f);
          default: return false;
        }
      });

      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchesStartDate = !startDate || t.date >= startDate;
      const matchesEndDate = !endDate || t.date <= endDate;
      let matchesDuplicates = true;
      if (showOnlyDuplicates && t.id) matchesDuplicates = duplicateInfo.flaggedIds.has(t.id);
      return matchesPills && matchesType && matchesStartDate && matchesEndDate && matchesDuplicates;
    });

    result.sort((a, b) => {
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      const valA = (a[sortConfig.key] || '').toString().toLowerCase();
      const valB = (b[sortConfig.key] || '').toString().toLowerCase();
      return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return result;
  }, [transactions, activeFilters, typeFilter, startDate, endDate, sortConfig, showOnlyDuplicates, duplicateInfo]);

  const summaryMetrics = useMemo(() => {
    const count = filteredTransactions.length;
    let incomeTotal = 0;
    let expenseTotal = 0;
    filteredTransactions.forEach(t => {
      if (t.type === TransactionType.INCOME) incomeTotal += t.amount;
      else expenseTotal += t.amount;
    });
    return { count, netTotal: incomeTotal - expenseTotal, incomeTotal, expenseTotal };
  }, [filteredTransactions]);

  const toggleSort = (key: SortKey) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'asc' ? 'desc' : 'asc' }));

  const handleCleanDuplicates = () => {
    if (onDeleteMultiple && duplicateInfo.deleteList.length > 0) {
      onDeleteMultiple(duplicateInfo.deleteList);
      setIsCleaningDuplicates(false);
      setShowOnlyDuplicates(false);
    }
  };

  const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <SortAsc size={10} className="ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? <SortAsc size={10} className="ml-1 text-blue-600" /> : <SortDesc size={10} className="ml-1 text-blue-600" />;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {duplicateInfo.deleteList.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Potential Duplicates Detected</h4>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">We found {duplicateInfo.deleteList.length} entries that look like copies of existing records.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setShowOnlyDuplicates(!showOnlyDuplicates)}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${showOnlyDuplicates ? 'bg-amber-600 text-white border-amber-600 shadow-lg' : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-100'}`}
            >
              {showOnlyDuplicates ? 'Viewing All' : 'Review Copies'}
            </button>
            <button 
              onClick={() => setIsCleaningDuplicates(true)}
              className="flex-1 md:flex-none px-4 py-2.5 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"
            >
              Purge {duplicateInfo.deleteList.length} Entries
            </button>
          </div>
        </div>
      )}

      {viewingTransaction && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4" onClick={() => setViewingTransaction(null)}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className={`p-6 flex items-center justify-between border-b border-gray-100 ${viewingTransaction.type === TransactionType.INCOME ? 'bg-emerald-50/50' : 'bg-rose-50/50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${viewingTransaction.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  <Info size={20} />
                </div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Transaction Details</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setEditingTransaction(viewingTransaction); setViewingTransaction(null); }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => setViewingTransaction(null)}
                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Transaction Value</p>
                <h2 className={`text-4xl font-black ${viewingTransaction.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {viewingTransaction.type === TransactionType.INCOME ? '+' : '-'}${viewingTransaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <div className={`mt-2 flex items-center gap-2 font-bold text-xs ${viewingTransaction.fromTemplate ? 'text-rose-600' : 'text-gray-400'}`}>
                  <Calendar size={14} /> {viewingTransaction.date}
                  {viewingTransaction.fromTemplate && (
                    <span className="flex items-center gap-1 ml-1 text-[9px] px-1.5 py-0.5 bg-rose-50 rounded border border-rose-100 uppercase tracking-tighter">
                      <Repeat size={10} /> Recurring
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Store size={10} className="text-blue-500" /> Payee</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{viewingTransaction.merchant || 'Undefined'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Tag size={10} className="text-emerald-500" /> Category</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{viewingTransaction.category}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><CreditCard size={10} className="text-rose-500" /> Payment</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{viewingTransaction.paymentMethod || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Info size={10} className="text-indigo-500" /> Flow</p>
                  <p className={`text-sm font-black uppercase tracking-tight ${viewingTransaction.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>{viewingTransaction.type}</p>
                </div>
              </div>

              {viewingTransaction.description && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><FileText size={10} /> Notes</p>
                  <p className="text-xs font-semibold text-gray-600 leading-relaxed italic">"{viewingTransaction.description}"</p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-3">
                  <button 
                    onClick={() => { onSaveAsTemplate(viewingTransaction!); setViewingTransaction(null); }}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    <Repeat size={14} /> Save as Recurring
                  </button>
                  <button 
                    onClick={() => { setDeletingTransaction(viewingTransaction!); setViewingTransaction(null); }}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-rose-700 transition-all active:scale-95"
                  >
                    <Trash2 size={14} /> Delete Entry
                  </button>
                </div>
                <button 
                  onClick={() => setViewingTransaction(null)}
                  className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 text-blue-600">
            <ListOrdered size={20} />
          </div>
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Financial Ledger</h3>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          style={{ backgroundColor: '#2563EB' }}
          className="text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> ADD NEW
        </button>
      </div>

      <div className="sticky top-0 z-30 space-y-3 bg-gray-50/90 backdrop-blur-md py-2">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative group" ref={searchContainerRef}>
              <div className="min-h-[46px] w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap gap-2 items-center focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search size={16} className="text-gray-400 shrink-0" />
                {activeFilters.map(f => (
                  <span key={`${f.type}-${f.value}`} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm">
                    <span className="opacity-60">{getScopeLabel(f.type)}:</span> {f.value}
                    <button onClick={() => removeFilter(f.value, f.type)} className="hover:text-blue-100 transition-colors"><X size={10} /></button>
                  </span>
                ))}
                <input 
                  type="text" 
                  placeholder={activeFilters.length === 0 ? "Filter Category, Payee, Sub, Payment..." : ""} 
                  className="flex-1 min-w-[120px] bg-transparent text-xs font-bold outline-none placeholder-gray-300"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValue.trim()) addFilter(inputValue);
                    if (e.key === 'Backspace' && !inputValue && activeFilters.length > 0) {
                      const last = activeFilters[activeFilters.length - 1];
                      removeFilter(last.value, last.type);
                    }
                  }}
                />
              </div>

              {showSuggestions && autocompleteSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-40 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                  {autocompleteSuggestions.map((group) => (
                    <div key={group.type}>
                      <div className="px-4 py-1.5 bg-gray-50/80 text-[9px] font-black text-gray-400 uppercase tracking-widest border-y border-gray-100/50 flex items-center justify-between">
                        <span>{getScopeLabel(group.type)}</span>
                        <div className="w-8 h-[1px] bg-gray-200"></div>
                      </div>
                      {group.items.map((label, idx) => (
                        <button 
                          key={idx}
                          onClick={() => addFilter(label, group.type)}
                          className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center justify-between group transition-colors"
                        >
                          <span className="text-xs font-bold text-gray-700">{label}</span>
                          <Plus size={10} className="text-gray-200 group-hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:w-48 shrink-0 flex gap-2">
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value as any)} 
                className="flex-1 h-[46px] px-4 bg-gray-50 rounded-xl border border-gray-200 text-[10px] font-black uppercase outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer appearance-none"
              >
                <option value="ALL">All Flows</option>
                <option value={TransactionType.INCOME}>Income only</option>
                <option value={TransactionType.EXPENSE}>Expenses only</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-4 pt-1 border-t border-gray-50 mt-4">
            <div className="flex flex-wrap gap-2 items-center">
              <PresetBtn 
                label="Today" 
                onClick={() => toggleDateRange('today')} 
                active={startDate === datePresets.today.start && endDate === datePresets.today.end} 
              />
              <PresetBtn 
                label="This Week" 
                onClick={() => toggleDateRange('week')} 
                active={startDate === datePresets.week.start && endDate === datePresets.week.end} 
              />
              <PresetBtn 
                label="This Month" 
                onClick={() => toggleDateRange('month')} 
                active={startDate === datePresets.month.start && endDate === datePresets.month.end} 
              />
              <div className="relative">
                <select 
                  value={currentSelectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all outline-none cursor-pointer border ${
                    currentSelectedYear 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                      : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  <option value="" className="text-gray-900 bg-white">Select Year</option>
                  {availableYears.map(year => (
                    <option key={year} value={year} className="text-gray-900 bg-white">{year}</option>
                  ))}
                </select>
                <ChevronDown size={10} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${currentSelectedYear ? 'text-white' : 'text-gray-400'}`} />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 flex-1 min-w-[300px]">
              <Calendar size={12} className="text-gray-400 ml-1" />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none flex-1" />
              <span className="text-gray-300 text-[10px] font-black uppercase">to</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none flex-1" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryMiniCard label="Records" value={summaryMetrics.count} icon={Hash} colorClass="bg-gray-100 text-gray-500" />
          <SummaryMiniCard label="Net Balance" value={summaryMetrics.netTotal} icon={Sigma} colorClass={summaryMetrics.netTotal >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} />
          <SummaryMiniCard label="Total Income" value={summaryMetrics.incomeTotal} icon={TrendingUp} colorClass="bg-emerald-100 text-emerald-600" />
          <SummaryMiniCard label="Total Expense" value={summaryMetrics.expenseTotal} icon={TrendingDown} colorClass="bg-rose-100 text-rose-600" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4 w-32 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('date')}>
                  <div className="flex items-center">Date <SortIndicator columnKey="date" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('category')}>
                  <div className="flex items-center">Category <SortIndicator columnKey="category" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('subCategory')}>
                  <div className="flex items-center">Sub-Category <SortIndicator columnKey="subCategory" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('merchant')}>
                  <div className="flex items-center">Payee <SortIndicator columnKey="merchant" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('paymentMethod')}>
                  <div className="flex items-center">Payment Method <SortIndicator columnKey="paymentMethod" /></div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center justify-end">Amount <SortIndicator columnKey="amount" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.map(t => {
                const isDuplicate = t.id && duplicateInfo.flaggedIds.has(t.id);
                const isToBeDeleted = t.id && duplicateInfo.deleteList.includes(t.id);
                return (
                  <tr 
                    key={t.id} 
                    className={`hover:bg-blue-50/20 group transition-colors cursor-pointer ${isDuplicate ? 'bg-amber-50/10' : ''}`}
                    onClick={() => setViewingTransaction(t)}
                  >
                    <td 
                      className={`px-6 py-3.5 font-bold text-[10px] uppercase tracking-tighter ${t.fromTemplate ? 'text-rose-600' : 'text-gray-400'}`}
                      title={t.fromTemplate ? "Posted via Recurring Transactions" : undefined}
                    >
                      <div className="flex items-center gap-2">
                        {isToBeDeleted && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm" title="Marked as copy" />}
                        {t.date}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); addFilter(t.category, 'category'); }} className="font-black text-gray-900 uppercase tracking-tight text-xs hover:text-blue-600">{t.category}</button>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      {t.subCategory ? (
                        <button onClick={(e) => { e.stopPropagation(); addFilter(t.subCategory!, 'sub'); }} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-blue-600">{t.subCategory}</button>
                      ) : <span className="text-gray-200 italic">-</span>}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); addFilter(t.merchant || 'Undefined', 'merchant'); }} className="font-black text-gray-700 uppercase tracking-tight text-xs hover:text-blue-600 truncate max-w-[150px]">
                          {t.merchant || 'Undefined'}
                        </button>
                        {t.description && (
                          <div className="relative group/note shrink-0">
                            <FileText size={12} className="text-gray-300 group-hover/note:text-blue-500 transition-colors cursor-help" />
                            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white text-gray-700 p-3 rounded-xl text-[11px] font-semibold shadow-2xl border border-gray-100 opacity-0 invisible group-hover/note:opacity-100 group-hover/note:visible transition-all z-50 text-left whitespace-normal break-words">
                              <div className="text-[9px] font-black uppercase text-blue-500 mb-1 border-b border-blue-50 pb-1">Notes</div>
                              <div className="pt-1">{t.description}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      {t.paymentMethod ? (
                        <button onClick={(e) => { e.stopPropagation(); addFilter(t.paymentMethod!, 'payment'); }} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-blue-600">
                          <CreditCard size={12} className="text-gray-300" /> {t.paymentMethod}
                        </button>
                      ) : <span className="text-gray-200">-</span>}
                    </td>
                    <td className={`px-6 py-3.5 text-right font-black text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-gray-900'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}${t.amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-16 text-center"><div className="flex flex-col items-center gap-2 opacity-20"><ListOrdered size={40} /><p className="text-xs font-black uppercase tracking-widest">No Records Found</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCleaningDuplicates && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center border border-gray-100 shadow-2xl">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black uppercase mb-2 tracking-tight">Purge All Copies?</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed px-4">
              This will safely remove all <span className="font-bold text-gray-900">{duplicateInfo.deleteList.length}</span> identical entries, keeping only the original record for each.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={handleCleanDuplicates} className="w-full py-4 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                <CheckCircle size={14} /> Clear {duplicateInfo.deleteList.length} Duplicates
              </button>
              <button onClick={() => setIsCleaningDuplicates(false)} className="w-full py-4 rounded-2xl bg-gray-100 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {(isAdding || editingTransaction) && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 uppercase tracking-tight text-xs flex items-center gap-2">
                {editingTransaction ? <Edit2 size={14} /> : <PlusCircle size={14} />}
                {editingTransaction ? 'Edit Transaction' : 'New Transaction Entry'}
              </h3>
              <button onClick={() => { setEditingTransaction(null); setIsAdding(false); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-8">
              <TransactionForm 
                categories={categories} 
                paymentMethods={paymentMethods} 
                transactions={transactions} 
                merchants={merchants}
                onAddTransaction={(t) => { onAddTransaction(t); setIsAdding(false); }} 
                onUpdateTransaction={(t) => { onUpdateTransaction(t); setEditingTransaction(null); }} 
                onAddCategory={onAddCategory} 
                onUpdateCategory={onUpdateCategory} 
                onAddMerchant={onAddMerchant}
                onAddPaymentMethod={onAddPaymentMethod}
                editingTransaction={editingTransaction} 
                onCancelEdit={() => { setEditingTransaction(null); setIsAdding(false); }} 
              />
            </div>
          </div>
        </div>
      )}

      {deletingTransaction && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center border border-gray-100 shadow-2xl">
            <AlertCircle size={40} className="mx-auto text-rose-500 mb-4" />
            <h3 className="text-xl font-black uppercase mb-2">Delete Record?</h3>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingTransaction(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button onClick={() => { deletingTransaction.id && onDelete(deletingTransaction.id); setDeletingTransaction(null); }} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PresetBtn = ({ label, onClick, active }: { label: string, onClick: () => void, active?: boolean }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
      active 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
    }`}
  >
    {label}
  </button>
);

const SummaryMiniCard = ({ label, value, icon: Icon, colorClass }: any) => (
  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 group hover:shadow-md transition-all">
    <div className={`p-2 rounded-lg ${colorClass} shrink-0 shadow-sm`}>
      <Icon size={14} />
    </div>
    <div>
      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <h4 className="text-[11px] font-black text-gray-900 leading-none">
        {label === 'Records' ? value : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </h4>
    </div>
  </div>
);

export default TransactionList;
