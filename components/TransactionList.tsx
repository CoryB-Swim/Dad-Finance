import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, TransactionType, Category, Vendor } from '../types';
import { Search, Trash2, Edit2, ArrowUpDown, Info, X, ChevronRight, Calendar, ExternalLink, AlertCircle, Copy, Bookmark } from 'lucide-react';
import TransactionForm from './TransactionForm';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  vendors: Vendor[];
  onDelete: (id: number) => void;
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onAddCategory: (c: Category) => void;
  onSaveAsTemplate: (t: Transaction) => void;
}

type SortKey = 'date' | 'amount' | 'category' | 'subCategory' | 'vendor';

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  categories, 
  vendors,
  onDelete,
  onAddTransaction,
  onUpdateTransaction,
  onAddCategory,
  onSaveAsTemplate
}) => {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [duplicatingTransaction, setDuplicatingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const filterContainerRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingTransaction(null);
        setDuplicatingTransaction(null);
        setDeletingTransaction(null);
        setShowSuggestions(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return { categories: [], subCategories: [], vendors: [], notes: [] };
    const query = inputValue.toLowerCase();
    
    const cats = Array.from(new Set(transactions.map(t => t.category)))
      .filter(c => c.toLowerCase().includes(query))
      .slice(0, 5);
      
    const subs = Array.from(new Set(transactions.map(t => t.subCategory).filter(Boolean)))
      .filter(s => s!.toLowerCase().includes(query))
      .slice(0, 5);
      
    const vends = Array.from(new Set(transactions.map(t => t.vendor).filter(Boolean)))
      .filter(v => v!.toLowerCase().includes(query))
      .slice(0, 5);

    const words = new Set<string>();
    transactions.forEach(t => {
      if (t.description) {
        t.description.split(/\s+/).forEach(word => {
          const cleanWord = word.replace(/[.,!?;:()]/g, '');
          if (cleanWord.length > 2) words.add(cleanWord);
        });
      }
    });
    const noteWords = Array.from(words)
      .filter(w => w.toLowerCase().includes(query))
      .slice(0, 5);

    return { categories: cats, subCategories: subs, vendors: vends, notes: noteWords };
  }, [transactions, inputValue]);

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => {
      const matchesPills = activeFilters.every(filter => {
        const f = filter.toLowerCase();
        return (
          t.category.toLowerCase().includes(f) ||
          (t.subCategory || '').toLowerCase().includes(f) ||
          (t.vendor || '').toLowerCase().includes(f) ||
          (t.description || '').toLowerCase().includes(f)
        );
      });
      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchesStartDate = !startDate || t.date >= startDate;
      const matchesEndDate = !endDate || t.date <= endDate;
      return matchesPills && matchesType && matchesStartDate && matchesEndDate;
    });

    result.sort((a, b) => {
      let valA = a[sortConfig.key] || '';
      let valB = b[sortConfig.key] || '';
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    return result;
  }, [transactions, activeFilters, typeFilter, startDate, endDate, sortConfig]);

  const filteredTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  const toggleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const addFilter = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !activeFilters.includes(trimmed)) {
      setActiveFilters([...activeFilters, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeFilter = (val: string) => {
    setActiveFilters(activeFilters.filter(f => f !== val));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue) {
      addFilter(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && activeFilters.length > 0) {
      removeFilter(activeFilters[activeFilters.length - 1]);
    }
  };

  const confirmDelete = () => {
    if (deletingTransaction && deletingTransaction.id !== undefined) {
      onDelete(deletingTransaction.id);
      setDeletingTransaction(null);
    }
  };

  const handleDuplicate = (t: Transaction) => {
    const copy = { ...t };
    delete copy.id;
    copy.date = new Date().toISOString().split('T')[0];
    setDuplicatingTransaction(copy);
  };

  return (
    <div className="space-y-4 relative">
      {/* Modals for Edit, Duplicate, and Delete */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Edit2 size={18} /></div>
                <h3 className="font-black text-gray-800 uppercase tracking-tight text-sm">Edit Transaction</h3>
              </div>
              <button onClick={() => setEditingTransaction(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6">
              <TransactionForm categories={categories} transactions={transactions} onAddTransaction={onAddTransaction} onUpdateTransaction={(t) => { onUpdateTransaction(t); setEditingTransaction(null); }} onAddCategory={onAddCategory} editingTransaction={editingTransaction} onCancelEdit={() => setEditingTransaction(null)} />
            </div>
          </div>
        </div>
      )}

      {duplicatingTransaction && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Copy size={18} /></div>
                <h3 className="font-black text-gray-800 uppercase tracking-tight text-sm">Duplicate Transaction</h3>
              </div>
              <button onClick={() => setDuplicatingTransaction(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6">
              <TransactionForm categories={categories} transactions={transactions} onAddTransaction={(t) => { onAddTransaction(t); setDuplicatingTransaction(null); }} onAddCategory={onAddCategory} editingTransaction={duplicatingTransaction} onCancelEdit={() => setDuplicatingTransaction(null)} />
            </div>
          </div>
        </div>
      )}

      {deletingTransaction && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} /></div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase">Are you sure?</h3>
              <p className="text-sm text-gray-500">Delete record for {deletingTransaction.vendor || 'Unknown Vendor'}?</p>
            </div>
            <div className="bg-gray-50 p-4 flex gap-3">
              <button onClick={() => setDeletingTransaction(null)} className="flex-1 px-4 py-2.5 bg-white border rounded-xl font-black text-xs uppercase">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-black text-xs uppercase">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 border-b border-gray-50 bg-gray-50/20 flex justify-between items-center">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Record Transaction</h3>
        </div>
        <div className="p-3">
            <TransactionForm categories={categories} transactions={transactions} onAddTransaction={onAddTransaction} onAddCategory={onAddCategory} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        <div className="lg:col-span-3 space-y-2 relative" ref={filterContainerRef}>
          <div className="flex flex-wrap items-center gap-2 p-2 bg-white rounded-xl shadow-sm border border-gray-100 min-h-[44px] transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
            <Search size={16} className="text-gray-400 ml-2" />
            {activeFilters.map(filter => (
              <span key={filter} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100 animate-in zoom-in-95">
                {filter}
                <button onClick={() => removeFilter(filter)} className="hover:bg-blue-200 rounded-full p-0.5"><X size={12} /></button>
              </span>
            ))}
            <input
              type="text" value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder={activeFilters.length === 0 ? "Search by Vendor, Category, or Notes..." : ""}
              className="flex-1 min-w-[150px] bg-transparent outline-none text-sm py-1 font-medium text-gray-900 placeholder-gray-400"
            />
          </div>

          {showSuggestions && inputValue.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-72 overflow-y-auto p-2">
                {Object.entries(suggestions).map(([type, items]) => (
                  items.length > 0 && (
                    <div key={type} className="mb-2 last:mb-0">
                      <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">{type}</div>
                      {items.map(item => (
                        <button 
                          key={item} 
                          onClick={() => addFilter(item)} 
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg group text-left transition-colors"
                        >
                          <span className="font-medium">{item}</span>
                          <ChevronRight size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between gap-3 h-[44px]">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'ALL')} className="text-xs font-black text-gray-600 uppercase bg-transparent outline-none cursor-pointer flex-1">
            <option value="ALL">All Types</option>
            <option value={TransactionType.INCOME}>Income</option>
            <option value={TransactionType.EXPENSE}>Expense</option>
          </select>
          <div className="h-6 w-px bg-gray-100"></div>
          <span className={`text-sm font-black whitespace-nowrap ${(filteredTotals.income - filteredTotals.expense) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ${(filteredTotals.income - filteredTotals.expense).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5 cursor-pointer" onClick={() => toggleSort('date')}>Date</th>
                <th className="px-5 py-3.5 cursor-pointer" onClick={() => toggleSort('category')}>Category</th>
                <th className="px-5 py-3.5 cursor-pointer" onClick={() => toggleSort('vendor')}>Vendor</th>
                <th className="px-5 py-3.5 text-right cursor-pointer" onClick={() => toggleSort('amount')}>Amount</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.map((t) => (
                  <tr key={t.id} className="group hover:bg-gray-50/80 transition-all">
                    <td className="px-5 py-4 text-gray-500 text-[11px] whitespace-nowrap font-medium">{t.date}</td>
                    <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{t.category}</span></td>
                    <td className="px-5 py-4"><span className="text-gray-900 font-bold text-sm">{t.vendor || '-'}</span></td>
                    <td className={`px-5 py-4 text-right font-black text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>${t.amount.toFixed(2)}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onSaveAsTemplate(t)} className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-md" title="Save as Recurring Template"><Bookmark size={13} /></button>
                          <button onClick={() => handleDuplicate(t)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md" title="Duplicate"><Copy size={13} /></button>
                          <button onClick={() => setEditingTransaction(t)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Edit"><Edit2 size={13} /></button>
                          <button onClick={() => setDeletingTransaction(t)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md" title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No transactions found matching your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;