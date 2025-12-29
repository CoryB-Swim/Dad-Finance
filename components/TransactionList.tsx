
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, TransactionType, Category, Merchant, PaymentMethod } from '../types';
import { Search, Trash2, Edit2, Info, X, ChevronRight, Calendar, AlertCircle, Copy, Bookmark, CreditCard, Tag, Store, Type } from 'lucide-react';
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
}

type SortKey = 'date' | 'amount' | 'category' | 'subCategory' | 'merchant' | 'paymentMethod';

interface SuggestionGroup {
  label: string;
  icon: any;
  items: string[];
}

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
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Grouped search suggestions
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

    return Object.values(groups)
      .map(group => ({
        ...group,
        items: Array.from(group.items).sort().slice(0, 5) // Limit each group for UX
      }))
      .filter(group => group.items.length > 0);
  }, [transactions, inputValue]);

  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => {
      const matchesPills = activeFilters.length === 0 || activeFilters.every(filter => {
        const f = filter.toLowerCase();
        return (
          t.category.toLowerCase().includes(f) ||
          (t.subCategory || '').toLowerCase().includes(f) ||
          (t.merchant || '').toLowerCase().includes(f) ||
          (t.paymentMethod || '').toLowerCase().includes(f) ||
          (t.description || '').toLowerCase().includes(f)
        );
      });
      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchesStartDate = !startDate || t.date >= startDate;
      const matchesEndDate = !endDate || t.date <= endDate;
      return matchesPills && matchesType && matchesStartDate && matchesEndDate;
    });

    result.sort((a, b) => {
      let valA = (a[sortConfig.key] || '').toString();
      let valB = (b[sortConfig.key] || '').toString();
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return result;
  }, [transactions, activeFilters, typeFilter, startDate, endDate, sortConfig]);

  const toggleSort = (key: SortKey) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'asc' ? 'desc' : 'asc' }));

  const addFilter = (val: string) => {
    const clean = val.trim();
    if (clean && !activeFilters.includes(clean)) {
      setActiveFilters([...activeFilters, clean]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addFilter(inputValue);
    }
  };

  return (
    <div className="space-y-4">
      {editingTransaction && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 uppercase tracking-tight text-sm">Edit Transaction</h3>
              <button onClick={() => setEditingTransaction(null)} className="p-2 text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6">
              <TransactionForm 
                categories={categories} 
                paymentMethods={paymentMethods} 
                transactions={transactions} 
                onAddTransaction={onAddTransaction} 
                onUpdateTransaction={(t) => { onUpdateTransaction(t); setEditingTransaction(null); }} 
                onAddCategory={onAddCategory} 
                onUpdateCategory={onUpdateCategory}
                onAddMerchant={onAddMerchant}
                editingTransaction={editingTransaction} 
                onCancelEdit={() => setEditingTransaction(null)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingTransaction && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 text-center border border-gray-100 shadow-2xl">
            <AlertCircle size={40} className="mx-auto text-rose-500 mb-4" />
            <h3 className="text-xl font-black uppercase mb-2">Delete Record?</h3>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingTransaction(null)} className="flex-1 py-2 rounded-xl bg-gray-100 font-bold uppercase text-xs">Cancel</button>
              <button onClick={() => { deletingTransaction.id && onDelete(deletingTransaction.id); setDeletingTransaction(null); }} className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-bold uppercase text-xs">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <TransactionForm 
          categories={categories} 
          paymentMethods={paymentMethods} 
          transactions={transactions} 
          onAddTransaction={onAddTransaction} 
          onAddCategory={onAddCategory} 
          onUpdateCategory={onUpdateCategory}
          onAddMerchant={onAddMerchant}
        />
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div ref={searchRef} className="flex-1 min-w-[300px] relative">
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search size={16} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Payee, Category, Method or Notes..." 
              className="flex-1 bg-transparent outline-none text-sm"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          {/* Predictive Custom Dropdown */}
          {showSuggestions && groupedSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-2xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="max-h-[350px] overflow-y-auto">
                {groupedSuggestions.map((group) => (
                  <div key={group.label} className="border-b border-gray-50 last:border-0">
                    <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                      <group.icon size={12} className="text-gray-400" />
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{group.label}</span>
                    </div>
                    {group.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => addFilter(item)}
                        className="w-full text-left px-8 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {activeFilters.map(f => (
            <span key={f} className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold uppercase border border-blue-100">
              {f}
              <button onClick={() => setActiveFilters(activeFilters.filter(x => x !== f))}><X size={12}/></button>
            </span>
          ))}
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="px-3 py-2 bg-white rounded-xl border border-gray-100 text-xs font-bold uppercase">
          <option value="ALL">All Types</option>
          <option value={TransactionType.INCOME}>Income</option>
          <option value={TransactionType.EXPENSE}>Expense</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/50 text-gray-400 font-black uppercase tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-5 py-3.5 cursor-pointer" onClick={() => toggleSort('date')}>Date</th>
              <th className="px-5 py-3.5 cursor-pointer" onClick={() => toggleSort('category')}>Category</th>
              <th className="px-5 py-3.5 cursor-pointer" onClick={() => toggleSort('subCategory')}>Sub-Category</th>
              <th className="px-5 py-3.5 cursor-pointer" onClick={() => toggleSort('merchant')}>Payee</th>
              <th className="px-5 py-3.5 cursor-pointer" onClick={() => toggleSort('paymentMethod')}>Method</th>
              <th className="px-5 py-3.5 text-right cursor-pointer" onClick={() => toggleSort('amount')}>Amount</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredTransactions.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/50 group">
                <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{t.date}</td>
                <td className="px-5 py-4">
                  <span className="px-2 py-0.5 bg-gray-100 rounded font-bold uppercase text-[9px] text-gray-500 whitespace-nowrap">
                    {t.category}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {t.subCategory ? (
                    <span className="text-gray-600 font-medium">{t.subCategory}</span>
                  ) : (
                    <span className="text-gray-300 italic">-</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    {t.merchant ? (
                      <span className="font-bold text-gray-900">{t.merchant}</span>
                    ) : (
                      <span className="text-gray-300 italic">Unspecified</span>
                    )}
                    {t.description && (
                      <div className="group/note relative inline-block">
                        <Info size={12} className="text-gray-300 cursor-help hover:text-blue-500 transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover/note:opacity-100 pointer-events-none transition-all duration-200 transform translate-y-1 group-hover/note:translate-y-0 whitespace-nowrap z-50 shadow-xl font-medium">
                          {t.description}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  {t.paymentMethod ? (
                    <div className="flex items-center gap-1.5 text-gray-600 font-medium whitespace-nowrap">
                      <CreditCard size={12} className="text-gray-400" />
                      {t.paymentMethod}
                    </div>
                  ) : (
                    <span className="text-gray-300 italic">-</span>
                  )}
                </td>
                <td className={`px-5 py-4 text-right font-black whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${t.amount.toFixed(2)}
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingTransaction(t)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                    <button onClick={() => setDeletingTransaction(t)} className="p-1 text-gray-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-20 text-center text-gray-400 italic">
                  No transactions found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;
