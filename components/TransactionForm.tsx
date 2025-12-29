import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { Plus, X, Save, RotateCcw, Calendar } from 'lucide-react';

interface TransactionFormProps {
  categories: Category[];
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction?: (t: Transaction) => void;
  onAddCategory: (c: Category) => void;
  editingTransaction?: Transaction | null;
  onCancelEdit?: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  categories, 
  transactions, 
  onAddTransaction,
  onUpdateTransaction,
  onAddCategory,
  editingTransaction,
  onCancelEdit
}) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date);
      setCategory(editingTransaction.category);
      setSubCategory(editingTransaction.subCategory || '');
      setVendor(editingTransaction.vendor || '');
      setDescription(editingTransaction.description || '');
    } else {
      resetForm();
    }
  }, [editingTransaction]);

  const resetForm = () => {
    setAmount('');
    setSubCategory('');
    setVendor('');
    setDescription('');
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === type || c.type === TransactionType.BOTH);
  }, [categories, type]);

  const activeCategoryObject = useMemo(() => {
    return categories.find(c => c.name === category);
  }, [categories, category]);

  const suggestions = useMemo(() => {
    const vends = new Set<string>();
    transactions.forEach(t => { if (t.vendor) vends.add(t.vendor); });

    const historySubs = new Set<string>();
    transactions.forEach(t => {
      if (t.category === category && t.subCategory) historySubs.add(t.subCategory);
    });

    const definedSubs = activeCategoryObject?.subCategories || [];
    const combinedSubs = Array.from(new Set([...definedSubs, ...Array.from(historySubs)])).sort();

    return {
      vendors: Array.from(vends).sort(),
      filteredSubCategories: combinedSubs
    };
  }, [transactions, category, activeCategoryObject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || !date || !category) return;

    const transactionData: Transaction = {
      amount: parsedAmount,
      date,
      category,
      subCategory,
      vendor,
      description,
      type
    };

    if (editingTransaction && editingTransaction.id !== undefined) {
      transactionData.id = editingTransaction.id;
      if (onUpdateTransaction) onUpdateTransaction(transactionData);
    } else {
      onAddTransaction(transactionData);
    }
    
    resetForm();
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    onAddCategory({ name: newCategoryName.trim(), type: type, subCategories: [] });
    setCategory(newCategoryName.trim());
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  // Helper to force picker open if click doesn't hit the indicator
  const triggerPicker = () => {
    if (dateInputRef.current && 'showPicker' in HTMLInputElement.prototype) {
      try {
        dateInputRef.current.showPicker();
      } catch (e) {
        dateInputRef.current.click();
      }
    }
  };

  const getSubmitText = () => {
    if (editingTransaction) {
      return editingTransaction.id !== undefined ? 'Update' : 'Copy';
    }
    return 'Save';
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-100 shadow-inner">
        <div className="flex bg-white border border-gray-300 rounded-lg p-0.5 shrink-0 shadow-sm">
          <button
            type="button"
            onClick={() => { setType(TransactionType.EXPENSE); setCategory(''); }}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
              type === TransactionType.EXPENSE ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Exp
          </button>
          <button
            type="button"
            onClick={() => { setType(TransactionType.INCOME); setCategory(''); }}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
              type === TransactionType.INCOME ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inc
          </button>
        </div>

        <div className="w-24 shrink-0">
          <label className="block text-[9px] font-black text-gray-500 uppercase mb-0.5 ml-1 tracking-tight">Amount</label>
          <input
            type="number" step="0.01" required value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg outline-none text-xs bg-white text-gray-900 shadow-sm placeholder-gray-400 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0.00"
          />
        </div>

        <div className="w-40 shrink-0">
          <label className="block text-[9px] font-black text-gray-500 uppercase mb-0.5 ml-1 tracking-tight">Date</label>
          <div className="relative flex items-center group">
            <input
              ref={dateInputRef}
              type="date" required value={date}
              onChange={(e) => setDate(e.target.value)}
              onClick={triggerPicker}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-[11px] bg-white text-gray-900 shadow-sm font-medium pr-8 outline-none focus:border-blue-300 cursor-pointer"
            />
            <div className="absolute right-0 top-0 bottom-0 px-2.5 flex items-center pointer-events-none rounded-r-lg transition-colors group-hover:bg-gray-50">
              <Calendar 
                size={14} 
                className="text-gray-400 group-hover:text-blue-500 transition-colors" 
              />
            </div>
          </div>
        </div>

        <div className="min-w-[130px] flex-1">
          <div className="flex justify-between items-center mb-0.5 px-1">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-tight">Category</label>
            <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} className="text-[8px] uppercase font-black text-blue-600 tracking-tighter hover:underline">+ NEW</button>
          </div>
          {showAddCategory ? (
            <div className="flex gap-1">
              <input type="text" autoFocus value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Name" className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white shadow-sm font-medium" />
              <button type="button" onClick={handleAddCategory} className="bg-blue-600 text-white px-1.5 rounded-lg hover:bg-blue-700"><Plus size={12}/></button>
              <button type="button" onClick={() => setShowAddCategory(false)} className="text-gray-400 hover:text-gray-600"><X size={12}/></button>
            </div>
          ) : (
            <select
              required value={category}
              onChange={(e) => { setCategory(e.target.value); setSubCategory(''); }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white shadow-sm cursor-pointer font-medium"
            >
              <option value="" disabled>Select...</option>
              {filteredCategories.map((c) => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
            </select>
          )}
        </div>

        <div className="min-w-[130px] flex-1">
          <label className="block text-[9px] font-black text-gray-500 uppercase mb-0.5 ml-1 tracking-tight">Sub-Category</label>
          <input
            type="text" list="sub-category-list" value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
            className={`w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white shadow-sm placeholder-gray-400 font-medium ${!category && 'opacity-50'}`}
            placeholder="Type..." disabled={!category}
          />
          <datalist id="sub-category-list">
            {suggestions.filteredSubCategories.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>

        <div className="min-w-[130px] flex-1">
          <label className="block text-[9px] font-black text-gray-500 uppercase mb-0.5 ml-1 tracking-tight">Vendor</label>
          <input
            type="text" list="vendor-list" value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white shadow-sm placeholder-gray-400 font-medium"
            placeholder="Payee"
          />
          <datalist id="vendor-list">
            {suggestions.vendors.map(v => <option key={v} value={v} />)}
          </datalist>
        </div>

        <div className="min-w-[150px] flex-[1.5]">
          <label className="block text-[9px] font-black text-gray-500 uppercase mb-0.5 ml-1 tracking-tight">Notes</label>
          <input
            type="text" value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white shadow-sm placeholder-gray-400 font-medium"
            placeholder="Notes/Details..."
          />
        </div>

        <div className="flex gap-1 shrink-0 pb-0.5">
          <button type="submit" className={`px-4 py-2 rounded-lg text-white text-[11px] font-black shadow-md uppercase tracking-wide ${editingTransaction ? (editingTransaction.id !== undefined ? 'bg-blue-600' : 'bg-indigo-600') : 'bg-gray-900'}`}>
            <Save size={14} className="inline mr-1" /> {getSubmitText()}
          </button>
          {editingTransaction && (
            <button type="button" onClick={onCancelEdit} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-[11px] font-black uppercase">
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;