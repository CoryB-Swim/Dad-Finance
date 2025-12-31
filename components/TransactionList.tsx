
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
  Type, 
  RotateCcw, 
  Hash, 
  Calculator, 
  Sigma, 
  TrendingUp, 
  TrendingDown, 
  AlignLeft, 
  PlusCircle, 
  MoreHorizontal,
  FileText,
  // Added ListOrdered to resolve the missing component error
  ListOrdered
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
  onSaveAsTemplate: (t: Transaction) => void;
  initialFilter?: string | null;
  onClearInitialFilter?: () => void;
  onViewMerchantDetail?: (name: string) => void;
}

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
  const [activeActionsMenu, setActiveActionsMenu] = useState<number | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setActiveActionsMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialFilter) {
      if (!activeFilters.includes(initialFilter)) {
        setActiveFilters([initialFilter]);
        setStartDate('');
        setEndDate('');
      }
      onClearInitialFilter?.();
    }
  }, [initialFilter, activeFilters, onClearInitialFilter]);

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

  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
  };

  const groupedSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const query = inputValue.toLowerCase();
    const groups: Record<string, { label: string; icon: any; items: Set<string> }> = {
      category: { label: 'Categories', icon: Tag, items: new Set() },
      subCategory: { label: 'Sub-Categories', icon: Tag, items: new Set() },
      merchant: { label: 'Payees', icon: Store, items: new Set() },
      paymentMethod: { label: 'Payment Methods', icon: CreditCard, items: new Set() },
      description: { label: 'Notes', icon: Type, items: new Set() }
    };
    transactions.forEach(t => {
      if (t.category?.toLowerCase().includes(query)) groups.category.items.add(t.category);
      if (t.subCategory?.toLowerCase().includes(query)) groups.subCategory.items.add(t.subCategory);
      if (t.merchant?.toLowerCase().includes(query)) groups.merchant.items.add(t.merchant);
      if (t.paymentMethod?.toLowerCase().includes(query)) groups.paymentMethod.items.add(t.paymentMethod);
      if (t.description?.toLowerCase().includes(query)) groups.description.items.add(t.description);
    });
    return Object.values(groups).map(g => ({ ...g, items: Array.from(g.items).sort().slice(0, 5) })).filter(g => g.items.length > 0);
  }, [transactions, inputValue]);

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => {
      const matchesPills = activeFilters.length === 0 || activeFilters.every(filter => {
        const f = filter.toLowerCase();
        return t.category.toLowerCase().includes(f) || (t.subCategory || '').toLowerCase().includes(f) || (t.merchant || '').toLowerCase().includes(f) || (t.paymentMethod || '').toLowerCase().includes(f) || (t.description || '').toLowerCase().includes(f);
      });
      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchesStartDate = !startDate || t.date >= startDate;
      const matchesEndDate = !endDate || t.date <= endDate;
      return matchesPills && matchesType && matchesStartDate && matchesEndDate;
    });
    result.sort((a, b) => {
      let valA = (a[sortConfig.key] || '').toString();
      let valB = (b[sortConfig.key] || '').toString();
      if (sortConfig.key === 'amount') return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
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
    const netTotal = incomeTotal - expenseTotal;
    const average = count > 0 ? (incomeTotal + expenseTotal) / count : 0;
    return { count, netTotal, incomeTotal, expenseTotal, average };
  }, [filteredTransactions]);

  const toggleSort = (key: SortKey) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'asc' ? 'desc' : 'asc' }));
  const addFilter = (val: string) => {
    const clean = val.trim();
    if (clean && !activeFilters.includes(clean)) setActiveFilters([...activeFilters, clean]);
    setInputValue('');
    setShowSuggestions(false);
  };

  const SummaryCard = ({ label, value, icon: Icon, colorClass, subValue }: any) => {
    const isCount = label.toLowerCase().includes('count') || label.toLowerCase() === 'transactions';
    return (
      <div className="flex-1 min-w-[160px] bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3 group hover:shadow-md transition-all">
        <div className={`p-2 rounded-lg ${colorClass} shrink-0 shadow-sm`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
          <h4 className="text-xs font-black text-gray-900 leading-none">
            {typeof value === 'number' && isCount 
              ? value 
              : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </h4>
          {subValue && <p className="text-[7px] font-bold text-gray-300 mt-0.5">{subValue}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with New Transaction Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
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

      {/* Transaction Modal (Add/Edit) */}
      {(isAdding || editingTransaction) && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 uppercase tracking-tight text-xs flex items-center gap-2">
                {editingTransaction ? <Edit2 size={14} /> : <PlusCircle size={14} />}
                {editingTransaction ? 'Edit Transaction' : 'New Transaction Entry'}
              </h3>
              <button 
                onClick={() => { setEditingTransaction(null); setIsAdding(false); }} 
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <TransactionForm 
                categories={categories} paymentMethods={paymentMethods} transactions={transactions} 
                onAddTransaction={(t) => { onAddTransaction(t); setIsAdding(false); }} 
                onUpdateTransaction={(t) => { onUpdateTransaction(t); setEditingTransaction(null); }} 
                onAddCategory={onAddCategory} onUpdateCategory={onUpdateCategory} onAddMerchant={onAddMerchant}
                editingTransaction={editingTransaction} onCancelEdit={() => { setEditingTransaction(null); setIsAdding(false); }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingTransaction && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 text-center border border-gray-100 shadow-2xl">
            <AlertCircle size={40} className="mx-auto text-rose-500 mb-4" />
            <h3 className="text-xl font-black uppercase mb-2">Delete Record?</h3>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone and will be permanently removed from your ledger.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingTransaction(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button onClick={() => { deletingTransaction.id && onDelete(deletingTransaction.id); setDeletingTransaction(null); }} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-20 space-y-3 bg-gray-50/90 backdrop-blur-md py-2">
        <div className="flex flex-col gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-3 items-center">
            <div ref={searchRef} className="flex-1 min-w-[250px] relative">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all">
                <Search size={14} className="text-gray-400" />
                <input 
                  type="text" placeholder="Global Search..." 
                  className="flex-1 bg-transparent outline-none text-[11px] font-bold"
                  value={inputValue} onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)} onKeyDown={(e) => e.key === 'Enter' && addFilter(inputValue)}
                />
              </div>
              {showSuggestions && groupedSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 shadow-2xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="max-h-[300px] overflow-y-auto">
                    {groupedSuggestions.map((group) => (
                      <div key={group.label} className="border-b border-gray-50 last:border-0">
                        <div className="px-3 py-1.5 bg-gray-50 flex items-center gap-2">
                          <group.icon size={10} className="text-gray-400" />
                          <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">{group.label}</span>
                        </div>
                        {group.items.map((item) => (
                          <button key={item} onClick={() => addFilter(item)} className="w-full text-left px-6 py-2 text-[10px] font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">{item}</button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              {activeFilters.map(f => (
                <span key={f} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase border border-blue-100">
                  {f} <button onClick={() => setActiveFilters(activeFilters.filter(x => x !== f))}><X size={10}/></button>
                </span>
              ))}
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-[10px] font-black uppercase outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer">
              <option value="ALL">All Types</option>
              <option value={TransactionType.INCOME}>Income</option>
              <option value={TransactionType.EXPENSE}>Expense</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-4 items-center pt-2 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-gray-400" />
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Temporal Range</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold outline-none focus:bg-white transition-all h-8" />
              <span className="text-gray-300 font-bold text-[10px]">to</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold outline-none focus:bg-white transition-all h-8" />
            </div>
            <div className="flex gap-1 ml-auto">
              <button onClick={setThisYear} className="px-2 py-1 bg-white border border-gray-200 text-gray-500 rounded-lg text-[9px] font-black uppercase hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">This Year</button>
              <button onClick={setLastYear} className="px-2 py-1 bg-white border border-gray-200 text-gray-500 rounded-lg text-[9px] font-black uppercase hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">Last Year</button>
              {(startDate || endDate) && (
                <button onClick={clearDateRange} className="px-2 py-1 text-rose-500 rounded-lg text-[9px] font-black uppercase hover:bg-rose-50 transition-all flex items-center gap-1">
                  <RotateCcw size={10} /> Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mini Summary Dashboard */}
        <div className="flex flex-wrap gap-3">
          <SummaryCard label="Records" value={summaryMetrics.count} icon={Hash} colorClass="bg-gray-100 text-gray-500" />
          <SummaryCard label="Net Balance" value={summaryMetrics.netTotal} icon={Sigma} colorClass={summaryMetrics.netTotal >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} />
          <SummaryCard label="Period Income" value={summaryMetrics.incomeTotal} icon={TrendingUp} colorClass="bg-emerald-100 text-emerald-600" />
          <SummaryCard label="Period Expense" value={summaryMetrics.expenseTotal} icon={TrendingDown} colorClass="bg-rose-100 text-rose-600" />
          <SummaryCard label="Avg Ticket" value={summaryMetrics.average} icon={Calculator} colorClass="bg-blue-50 text-blue-600" subValue="Mean per entry" />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-[11px] table-fixed min-w-[900px] border-collapse">
          <thead className="bg-gray-50/50 text-gray-400 font-black uppercase tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-4 py-2.5 cursor-pointer w-[100px]" onClick={() => toggleSort('date')}>Date</th>
              <th className="px-4 py-2.5 cursor-pointer w-[180px]" onClick={() => toggleSort('category')}>Group</th>
              <th className="px-4 py-2.5 cursor-pointer w-[160px]" onClick={() => toggleSort('merchant')}>Payee</th>
              <th className="px-4 py-2.5 cursor-pointer w-[140px]" onClick={() => toggleSort('paymentMethod')}>Source</th>
              <th className="px-4 py-2.5 cursor-pointer" onClick={() => toggleSort('description')}>Notes</th>
              <th className="px-4 py-2.5 text-right cursor-pointer w-[100px]" onClick={() => toggleSort('amount')}>Value</th>
              <th className="px-4 py-2.5 text-center w-[60px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredTransactions.map(t => (
              <tr key={t.id} className="hover:bg-blue-50/20 group relative transition-colors duration-75">
                <td className="px-4 py-2.5 text-gray-400 font-bold whitespace-nowrap">{t.date}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-black text-gray-800">
                      {t.category}{t.subCategory ? `: ${t.subCategory}` : ''}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {t.merchant ? (
                    <button 
                      onClick={() => onViewMerchantDetail?.(t.merchant!)}
                      className="font-bold text-gray-700 truncate block hover:text-blue-600 transition-all text-left w-full"
                    >
                      {t.merchant}
                    </button>
                  ) : <span className="text-gray-200 italic">None</span>}
                </td>
                <td className="px-4 py-2.5">
                  {t.paymentMethod ? (
                    <div className="flex items-center gap-1.5 text-gray-500 font-bold truncate">
                      <CreditCard size={10} className="text-gray-300" />
                      {t.paymentMethod}
                    </div>
                  ) : <span className="text-gray-200">-</span>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="relative flex items-center gap-1.5 text-gray-400 font-medium truncate group/note">
                    {t.description && <AlignLeft size={10} className="shrink-0 text-gray-300" />}
                    <span className="truncate">{t.description || ''}</span>
                    {t.description && (
                      <div className="absolute left-0 bottom-full mb-1 px-2 py-1.5 bg-gray-900 text-white text-[9px] rounded-lg opacity-0 group-hover/note:opacity-100 pointer-events-none transition-all duration-100 z-50 shadow-xl font-bold min-w-[150px] max-w-[300px] whitespace-normal border border-gray-800">
                        {t.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-2.5 text-right font-black whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'}${t.amount.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-center relative">
                  <div className="flex justify-center items-center">
                    <div className="relative" ref={activeActionsMenu === t.id ? actionsMenuRef : null}>
                      <button 
                        onClick={() => setActiveActionsMenu(activeActionsMenu === t.id ? null : (t.id || null))}
                        className="p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      
                      {activeActionsMenu === t.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                          <button 
                            onClick={() => { setEditingTransaction(t); setActiveActionsMenu(null); }}
                            className="w-full text-left px-3 py-1.5 text-[10px] font-black uppercase text-gray-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button 
                            onClick={() => { onSaveAsTemplate(t); setActiveActionsMenu(null); }}
                            className="w-full text-left px-3 py-1.5 text-[10px] font-black uppercase text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                          >
                            <FileText size={12} /> Template
                          </button>
                          <div className="my-1 border-t border-gray-50"></div>
                          <button 
                            onClick={() => { setDeletingTransaction(t); setActiveActionsMenu(null); }}
                            className="w-full text-left px-3 py-1.5 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 flex items-center gap-2"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-200 italic font-bold">No entries match your current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;
