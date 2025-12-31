import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, TransactionType, Category, Merchant, PaymentMethod } from '../types';
import { Save, RotateCcw, Calendar, CreditCard, Tag, Store } from 'lucide-react';

interface TransactionFormProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction?: (t: Transaction) => void;
  onAddCategory: (c: Category) => void;
  onUpdateCategory?: (c: Category) => void;
  onAddMerchant?: (m: Merchant) => void;
  editingTransaction?: Transaction | null;
  onCancelEdit?: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  categories, 
  paymentMethods,
  transactions, 
  onAddTransaction,
  onUpdateTransaction,
  onAddCategory,
  onUpdateCategory,
  onAddMerchant,
  editingTransaction,
  onCancelEdit
}) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [description, setDescription] = useState('');
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date);
      setCategory(editingTransaction.category);
      setSubCategory(editingTransaction.subCategory || '');
      setMerchant(editingTransaction.merchant || '');
      setPaymentMethod(editingTransaction.paymentMethod || '');
      setDescription(editingTransaction.description || '');
    } else {
      resetForm();
    }
  }, [editingTransaction]);

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setSubCategory('');
    setMerchant('');
    setDescription('');
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === type || c.type === TransactionType.BOTH);
  }, [categories, type]);

  const activeCategoryObject = useMemo(() => {
    return categories.find(c => c.name.toLowerCase() === category.toLowerCase());
  }, [categories, category]);

  const suggestions = useMemo(() => {
    const merchantsSet = new Set<string>();
    transactions.forEach(t => { if (t.merchant) merchantsSet.add(t.merchant); });
    
    // Also include currently registered merchants
    const registeredMerchants = merchantsSet;
    
    const historySubs = new Set<string>();
    transactions.forEach(t => {
      if (t.category.toLowerCase() === category.toLowerCase() && t.subCategory) historySubs.add(t.subCategory);
    });

    const definedSubs = activeCategoryObject?.subCategories || [];
    const combinedSubs = Array.from(new Set([...definedSubs, ...Array.from(historySubs)])).sort();

    return {
      merchants: Array.from(registeredMerchants).sort(),
      filteredSubCategories: combinedSubs
    };
  }, [transactions, category, activeCategoryObject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || !date || !category.trim()) return;

    const trimmedCategory = category.trim();
    const trimmedSubCategory = subCategory.trim();
    const trimmedMerchant = merchant.trim();

    // 1. Auto-handle Category Creation
    let currentCat = categories.find(c => c.name.toLowerCase() === trimmedCategory.toLowerCase());
    if (!currentCat) {
      const newCat: Category = { name: trimmedCategory, type: type, subCategories: trimmedSubCategory ? [trimmedSubCategory] : [] };
      onAddCategory(newCat);
      currentCat = newCat; // Temporary ref for logic below
    } else if (trimmedSubCategory && onUpdateCategory) {
      // 2. Auto-handle Sub-category Creation within existing Category
      const subExists = (currentCat.subCategories || []).some(s => s.toLowerCase() === trimmedSubCategory.toLowerCase());
      if (!subExists) {
        onUpdateCategory({
          ...currentCat,
          subCategories: [...(currentCat.subCategories || []), trimmedSubCategory]
        });
      }
    }

    // 3. Auto-handle Merchant Creation
    if (trimmedMerchant && onAddMerchant) {
      const merchantExists = transactions.some(t => t.merchant?.toLowerCase() === trimmedMerchant.toLowerCase());
      // For simplicity, we check transactions; in a more robust app, we'd check the merchant store passed in via props
      if (!merchantExists) {
        onAddMerchant({ name: trimmedMerchant });
      }
    }

    const transactionData: Transaction = {
      amount: parsedAmount,
      date,
      category: currentCat?.name || trimmedCategory,
      subCategory: trimmedSubCategory || undefined,
      merchant: trimmedMerchant || undefined,
      paymentMethod,
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

  const triggerPicker = () => {
    if (dateInputRef.current && 'showPicker' in HTMLInputElement.prototype) {
      try { dateInputRef.current.showPicker(); } catch (e) { dateInputRef.current.click(); }
    }
  };

  const getSubmitText = () => {
    if (editingTransaction) return editingTransaction.id !== undefined ? 'Update' : 'Copy';
    return 'Save Transaction';
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-gray-50/80 p-4 rounded-xl border border-gray-100 shadow-inner">
        {/* Row 1: Core Financials */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex bg-white border border-gray-300 rounded-lg p-0.5 shrink-0 shadow-sm h-[38px] items-center">
            <button
              type="button"
              onClick={() => { setType(TransactionType.EXPENSE); }}
              className={`px-4 h-full rounded-md text-[10px] font-black uppercase transition-all ${
                type === TransactionType.EXPENSE ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-600'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setType(TransactionType.INCOME); }}
              className={`px-4 h-full rounded-md text-[10px] font-black uppercase transition-all ${
                type === TransactionType.INCOME ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Income
            </button>
          </div>

          <div className="w-32 shrink-0">
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-wider">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input
                type="number" step="0.01" required value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-lg outline-none text-xs bg-white text-gray-900 shadow-sm placeholder-gray-400 font-bold"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="w-40 shrink-0">
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-wider">Date</label>
            <div className="relative flex items-center group">
              <input
                ref={dateInputRef}
                type="date" required value={date}
                onChange={(e) => setDate(e.target.value)}
                onClick={triggerPicker}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 shadow-sm font-bold pr-10 outline-none cursor-pointer"
              />
              <div className="absolute right-3 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors">
                <Calendar size={14} />
              </div>
            </div>
          </div>

          <div className="min-w-[160px] flex-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-wider">Category</label>
            <div className="relative flex items-center group">
              <input
                type="text"
                list="category-list"
                required
                value={category}
                onChange={(e) => { setCategory(e.target.value); setSubCategory(''); }}
                placeholder="Select or type new..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs bg-white shadow-sm font-bold outline-none focus:border-blue-400 transition-colors"
              />
              <div className="absolute left-3 pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Tag size={14} />
              </div>
              <datalist id="category-list">
                {filteredCategories.map((c) => <option key={c.id || c.name} value={c.name} />)}
              </datalist>
            </div>
          </div>

          <div className="min-w-[160px] flex-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-wider">Sub-Category</label>
            <div className="relative flex items-center group">
              <input
                type="text"
                list="sub-category-list"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="Select or type new..."
                className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-xs bg-white shadow-sm font-bold outline-none focus:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                disabled={!category.trim()}
              />
              <datalist id="sub-category-list">
                {suggestions.filteredSubCategories.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
        </div>

        {/* Row 2: Details & Actions */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-wider">Merchant / Payee</label>
            <div className="relative flex items-center group">
              <input
                type="text"
                list="merchant-list-form"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs bg-white shadow-sm placeholder-gray-300 font-bold outline-none focus:border-blue-400 transition-colors"
                placeholder="Where was this spent?"
              />
              <div className="absolute left-3 pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Store size={14} />
              </div>
              <datalist id="merchant-list-form">
                {suggestions.merchants.map(v => <option key={v} value={v} />)}
              </datalist>
            </div>
          </div>

          <div className="min-w-[160px] flex-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-wider">Payment Method</label>
            <div className="relative flex items-center group">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs bg-white shadow-sm cursor-pointer font-bold outline-none focus:border-blue-400 transition-colors appearance-none"
              >
                <option value="">No Payment Method</option>
                {paymentMethods.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <div className="absolute left-3 pointer-events-none text-gray-400">
                <CreditCard size={14} />
              </div>
            </div>
          </div>

          <div className="min-w-[250px] flex-[2]">
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-wider">Description & Notes</label>
            <input
              type="text" value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white shadow-sm placeholder-gray-300 font-bold outline-none focus:border-blue-400 transition-colors"
              placeholder="Additional details (Optional)..."
            />
          </div>

          <div className="flex gap-2 shrink-0 pb-0.5">
            {editingTransaction && (
              <button 
                type="button" 
                onClick={onCancelEdit} 
                className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-300 transition-colors"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <button 
              type="submit" 
              className={`px-6 py-2 rounded-lg text-white text-[10px] font-black shadow-lg uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
                editingTransaction ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : 'bg-gray-900 hover:bg-black shadow-gray-200'
              }`}
            >
              <Save size={14} />
              {getSubmitText()}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;