
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  MoreHorizontal,
  FileText,
  ListOrdered,
  Layers,
  Filter,
  ChevronDown
} from 'lucide-react';
import TransactionForm from './TransactionForm';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  merchants: Merchant[];
  paymentMethods: PaymentMethod[];
  onDelete: (id: number) => void;
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onAddCategory: (c: Category) => void;
  onUpdateCategory: (c: Category) => void;
  onAddMerchant: (m: Merchant) => void;
  onAddPaymentMethod: (p: PaymentMethod) => void;
  onSaveAsTemplate: (t: Transaction) => void;
  initialFilter?: string | null;
  onClearInitialFilter?: () => void;
  onViewMerchantDetail?: (name: string) => void;
}

const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type SortKey = 'date' | 'amount' | 'category' | 'subCategory' | 'merchant' | 'paymentMethod' | 'description';

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  categories, 
  merchants,
  paymentMethods,
  onDelete,
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
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  
  const [selectedMerchantForDetail, setSelectedMerchantForDetail] = useState<string | null>(null);
  const [selectedCategoryForDetail, setSelectedCategoryForDetail] = useState<string | null>(null);
  const [selectedSubCategoryForDetail, setSelectedSubCategoryForDetail] = useState<{cat: string, sub: string} | null>(null);
  const [selectedPaymentForDetail, setSelectedPaymentForDetail] = useState<string | null>(null);
  
  const [activeActionsMenu, setActiveActionsMenu] = useState<number | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);

  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setActiveActionsMenu(null);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', () => setActiveActionsMenu(null), true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', () => setActiveActionsMenu(null), true);
    };
  }, []);

  useEffect(() => {
    if (initialFilter) {
      if (!activeFilters.includes(initialFilter)) {
        setActiveFilters([initialFilter]);
      }
      onClearInitialFilter?.();
    }
  }, [initialFilter, activeFilters, onClearInitialFilter]);

  const addFilter = (val: string) => {
    const clean = val.trim();
    if (clean && !activeFilters.includes(clean)) {
      setActiveFilters([...activeFilters, clean]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeFilter = (val: string) => {
    setActiveFilters(activeFilters.filter(f => f !== val));
  };

  const handleToggleActions = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (activeActionsMenu === id) {
      setActiveActionsMenu(null);
      setMenuAnchorRect(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuAnchorRect(rect);
      setActiveActionsMenu(id);
    }
  };

  const setDateRange = (range: 'today' | 'week' | 'month' | 'year' | 'lastYear') => {
    const todayStr = getLocalDateString();
    let start = '';
    let end = todayStr;

    switch (range) {
      case 'today':
        start = todayStr;
        break;
      case 'week':
        const now = new Date();
        const day = now.getDay(); 
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
        const monday = new Date(now.setDate(diff));
        start = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        break;
      case 'month':
        const mon = new Date();
        start = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      case 'year':
        const yr = new Date();
        start = `${yr.getFullYear()}-01-01`;
        end = `${yr.getFullYear()}-12-31`;
        break;
      case 'lastYear':
        const last = new Date().getFullYear() - 1;
        start = `${last}-01-01`;
        end = `${last}-12-31`;
        break;
    }
    setStartDate(start);
    setEndDate(end);
  };

  const autocompleteSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const query = inputValue.toLowerCase().trim();
    const suggestions: { label: string; type: 'category' | 'sub' | 'merchant' | 'payment' }[] = [];

    categories.forEach(c => {
      if (c.name.toLowerCase().includes(query)) suggestions.push({ label: c.name, type: 'category' });
      c.subCategories?.forEach(s => {
        if (s.toLowerCase().includes(query)) suggestions.push({ label: s, type: 'sub' });
      });
    });

    merchants.forEach(m => {
      if (m.name.toLowerCase().includes(query)) suggestions.push({ label: m.name, type: 'merchant' });
    });

    paymentMethods.forEach(p => {
      if (p.name.toLowerCase().includes(query)) suggestions.push({ label: p.name, type: 'payment' });
    });

    const unique = suggestions.filter((v, i, a) => 
      a.findIndex(t => t.label === v.label) === i && !activeFilters.includes(v.label)
    );
    
    return unique.slice(0, 10);
  }, [inputValue, categories, merchants, paymentMethods, activeFilters]);

  const categoryStats = useMemo(() => {
    if (!selectedCategoryForDetail) return null;
    const catTxs = transactions.filter(t => t.category === selectedCategoryForDetail);
    const totalSpent = catTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    return { name: selectedCategoryForDetail, count: catTxs.length, totalSpent };
  }, [selectedCategoryForDetail, transactions]);

  const subCategoryStats = useMemo(() => {
    if (!selectedSubCategoryForDetail) return null;
    const { cat, sub } = selectedSubCategoryForDetail;
    const subTxs = transactions.filter(t => t.category === cat && t.subCategory === sub);
    const totalSpent = subTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    return { name: sub, count: subTxs.length, totalSpent, parent: cat };
  }, [selectedSubCategoryForDetail, transactions]);

  const merchantStats = useMemo(() => {
    if (!selectedMerchantForDetail) return null;
    const mName = selectedMerchantForDetail;
    const mTxs = transactions.filter(t => t.merchant === mName);
    const totalSpent = mTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    const merchantObj = merchants.find(m => m.name === mName);
    return { name: mName, count: mTxs.length, totalSpent, website: merchantObj?.website, location: merchantObj?.location, phone: merchantObj?.phone };
  }, [selectedMerchantForDetail, transactions, merchants]);

  const paymentStats = useMemo(() => {
    if (!selectedPaymentForDetail) return null;
    const pName = selectedPaymentForDetail;
    const pTxs = transactions.filter(t => t.paymentMethod === pName);
    const totalSpent = pTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    return { name: pName, count: pTxs.length, totalSpent };
  }, [selectedPaymentForDetail, transactions]);

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => {
      const matchesPills = activeFilters.length === 0 || activeFilters.every(filter => {
        const f = filter.toLowerCase();
        return t.category.toLowerCase().includes(f) || 
               (t.subCategory || '').toLowerCase().includes(f) || 
               (t.merchant || '').toLowerCase().includes(f) || 
               (t.paymentMethod || '').toLowerCase().includes(f) || 
               (t.description || '').toLowerCase().includes(f);
      });

      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchesStartDate = !startDate || t.date >= startDate;
      const matchesEndDate = !endDate || t.date <= endDate;
      return matchesPills && matchesType && matchesStartDate && matchesEndDate;
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
  }, [transactions, activeFilters, typeFilter, startDate, endDate, sortConfig]);

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

  const InfoCard = ({ title, subTitle, stats, icon: Icon, colorClass, onClose, onQuickFilter }: any) => (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className={`relative h-24 ${colorClass} p-6`}>
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
            <X size={18} />
          </button>
          <div className="absolute -bottom-6 left-6 w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-gray-100">
            <Icon size={32} strokeWidth={2.5} className="text-gray-800" />
          </div>
        </div>
        <div className="pt-10 px-6 pb-6">
          <div className="mb-6">
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-tight">{title}</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{subTitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {stats.map((s: any, i: number) => (
              <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">{s.label}</p>
                <h4 className="text-xl font-black text-gray-900">{s.value}</h4>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-gray-100 flex gap-3">
            <button 
              onClick={onQuickFilter}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-50 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Filter size={14} /> Filter History
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Dynamic Info Cards */}
      {selectedCategoryForDetail && categoryStats && (
        <InfoCard 
          title={categoryStats.name} 
          subTitle="Category Analysis" 
          icon={Tag} 
          colorClass="bg-emerald-600"
          onClose={() => setSelectedCategoryForDetail(null)}
          onQuickFilter={() => { addFilter(categoryStats.name); setSelectedCategoryForDetail(null); }}
          stats={[
            { label: 'Total Records', value: categoryStats.count },
            { label: 'Period Volume', value: `$${categoryStats.totalSpent.toLocaleString()}` }
          ]}
        />
      )}
      {selectedSubCategoryForDetail && subCategoryStats && (
        <InfoCard 
          title={subCategoryStats.name} 
          subTitle={`Sub-category of ${subCategoryStats.parent}`} 
          icon={Layers} 
          colorClass="bg-indigo-600"
          onClose={() => setSelectedSubCategoryForDetail(null)}
          onQuickFilter={() => { addFilter(subCategoryStats.name); setSelectedSubCategoryForDetail(null); }}
          stats={[
            { label: 'Total Records', value: subCategoryStats.count },
            { label: 'Period Volume', value: `$${subCategoryStats.totalSpent.toLocaleString()}` }
          ]}
        />
      )}
      {selectedMerchantForDetail && merchantStats && (
        <InfoCard 
          title={merchantStats.name} 
          subTitle="Payee / Merchant Profile" 
          icon={Store} 
          colorClass="bg-amber-600"
          onClose={() => setSelectedMerchantForDetail(null)}
          onQuickFilter={() => { addFilter(merchantStats.name); setSelectedMerchantForDetail(null); }}
          stats={[
            { label: 'Visits', value: merchantStats.count },
            { label: 'Period Volume', value: `$${merchantStats.totalSpent.toLocaleString()}` },
            { label: 'Site', value: merchantStats.website || 'N/A' },
            { label: 'Location', value: merchantStats.location || 'N/A' }
          ]}
        />
      )}
      {selectedPaymentForDetail && paymentStats && (
        <InfoCard 
          title={selectedPaymentForDetail} 
          subTitle="Payment Method Profile" 
          icon={CreditCard} 
          colorClass="bg-rose-600"
          onClose={() => setSelectedPaymentForDetail(null)}
          onQuickFilter={() => { addFilter(selectedPaymentForDetail!); setSelectedPaymentForDetail(null); }}
          stats={[
            { label: 'Usage Count', value: paymentStats.count },
            { label: 'Period Volume', value: `$${paymentStats.totalSpent.toLocaleString()}` }
          ]}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 text-blue-600">
            <ListOrdered size={20} />
          </div>
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Financial Ledger</h3>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle size={16} /> New Transaction
        </button>
      </div>

      {activeActionsMenu !== null && menuAnchorRect && createPortal(
        <div 
          ref={actionsMenuRef}
          style={{ position: 'fixed', top: menuAnchorRect.bottom + 4, left: menuAnchorRect.right - 128, zIndex: 9999, width: '8rem' }}
          className="bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {(() => {
            const t = transactions.find(tx => tx.id === activeActionsMenu);
            if (!t) return null;
            return (
              <>
                <button onClick={() => { setEditingTransaction(t); setActiveActionsMenu(null); }} className="w-full text-left px-3 py-1.5 text-[10px] font-black uppercase text-gray-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"><Edit2 size={12} /> Edit</button>
                <button onClick={() => { onSaveAsTemplate(t); setActiveActionsMenu(null); }} className="w-full text-left px-3 py-1.5 text-[10px] font-black uppercase text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"><FileText size={12} /> Template</button>
                <div className="my-1 border-t border-gray-50"></div>
                <button onClick={() => { setDeletingTransaction(t); setActiveActionsMenu(null); }} className="w-full text-left px-3 py-1.5 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 flex items-center gap-2"><Trash2 size={12} /> Delete</button>
              </>
            );
          })()}
        </div>,
        document.body
      )}

      {/* Overhauled Filter Panel */}
      <div className="sticky top-0 z-30 space-y-3 bg-gray-50/90 backdrop-blur-md py-2">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          
          {/* Row 1: Integrated Search with Chips & Suggestions */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative group" ref={searchContainerRef}>
              <div className="min-h-[46px] w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap gap-2 items-center focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search size={16} className="text-gray-400 shrink-0" />
                {activeFilters.map(f => (
                  <span key={f} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm">
                    {f}
                    <button onClick={() => removeFilter(f)} className="hover:text-blue-100 transition-colors"><X size={10} /></button>
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
                    if (e.key === 'Backspace' && !inputValue && activeFilters.length > 0) removeFilter(activeFilters[activeFilters.length - 1]);
                  }}
                />
              </div>

              {showSuggestions && autocompleteSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-40 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                  {autocompleteSuggestions.map((s, idx) => (
                    <button 
                      key={idx}
                      onClick={() => addFilter(s.label)}
                      className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center justify-between group transition-colors"
                    >
                      <span className="text-xs font-bold text-gray-700">{s.label}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-gray-300 group-hover:text-blue-500">{s.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="md:w-48 shrink-0">
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value as any)} 
                className="w-full h-[46px] px-4 bg-gray-50 rounded-xl border border-gray-200 text-[10px] font-black uppercase outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer appearance-none"
              >
                <option value="ALL">All Flows</option>
                <option value={TransactionType.INCOME}>Income only</option>
                <option value={TransactionType.EXPENSE}>Expenses only</option>
              </select>
            </div>
          </div>

          {/* Row 2: Date Controls (Pickers + Presets) */}
          <div className="flex flex-col xl:flex-row gap-4 pt-1 border-t border-gray-50 mt-4">
            <div className="flex flex-wrap gap-2 items-center">
              <PresetBtn label="Today" onClick={() => setDateRange('today')} active={startDate === endDate && startDate === getLocalDateString()} />
              <PresetBtn label="This Week" onClick={() => setDateRange('week')} />
              <PresetBtn label="This Month" onClick={() => setDateRange('month')} />
              <PresetBtn label="This Year" onClick={() => setDateRange('year')} />
              <PresetBtn label="Last Year" onClick={() => setDateRange('lastYear')} />
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }} 
                  className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <RotateCcw size={14} />
                </button>
              )}
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
        <table className="w-full text-left text-[11px] table-fixed min-w-[900px] border-separate border-spacing-0">
          <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest sticky top-0 z-20 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
            <tr>
              <th className="px-4 py-3 bg-gray-50 border-b border-gray-100 cursor-pointer w-[100px]" onClick={() => toggleSort('date')}>Date</th>
              <th className="px-4 py-3 bg-gray-50 border-b border-gray-100 cursor-pointer w-[160px]" onClick={() => toggleSort('category')}>Category</th>
              <th className="px-4 py-3 bg-gray-50 border-b border-gray-100 cursor-pointer w-[160px]" onClick={() => toggleSort('subCategory')}>Sub-Category</th>
              <th className="px-4 py-3 bg-gray-50 border-b border-gray-100 cursor-pointer w-[180px]" onClick={() => toggleSort('merchant')}>Payee</th>
              <th className="px-4 py-3 bg-gray-50 border-b border-gray-100 cursor-pointer w-[150px]" onClick={() => toggleSort('paymentMethod')}>Payment Method</th>
              <th className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-right cursor-pointer w-[100px]" onClick={() => toggleSort('amount')}>Amount</th>
              <th className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-center w-[60px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredTransactions.map(t => (
              <tr key={t.id} className="hover:bg-blue-50/20 group transition-colors">
                <td className="px-4 py-2.5 text-gray-400 font-bold">{t.date}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => setSelectedCategoryForDetail(t.category)} className="font-black text-gray-800 truncate hover:text-blue-600">{t.category}</button>
                </td>
                <td className="px-4 py-2.5">
                  {t.subCategory ? (
                    <button onClick={() => setSelectedSubCategoryForDetail({ cat: t.category, sub: t.subCategory! })} className="font-bold text-gray-500 truncate hover:text-blue-600">{t.subCategory}</button>
                  ) : <span className="text-gray-200 italic">-</span>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedMerchantForDetail(t.merchant || 'Undefined')} className="font-bold text-gray-700 truncate hover:text-blue-600 max-w-[120px]">
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
                <td className="px-4 py-2.5">
                  {t.paymentMethod ? (
                    <button onClick={() => setSelectedPaymentForDetail(t.paymentMethod!)} className="flex items-center gap-1.5 text-gray-500 font-bold truncate hover:text-blue-600">
                      <CreditCard size={10} className="text-gray-300" /> {t.paymentMethod}
                    </button>
                  ) : <span className="text-gray-200">-</span>}
                </td>
                <td className={`px-4 py-2.5 text-right font-black ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'}${t.amount.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button onClick={(e) => t.id && handleToggleActions(e, t.id)} className={`p-1 hover:bg-gray-100 rounded-md transition-all ${activeActionsMenu === t.id ? 'text-blue-600 bg-blue-50' : 'text-gray-300'}`}>
                    <MoreHorizontal size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-200 italic font-bold">No entries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(isAdding || editingTransaction) && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-sm rounded-2xl p-6 text-center border border-gray-100 shadow-2xl">
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
