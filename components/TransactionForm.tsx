
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, TransactionType, Category, Merchant, PaymentMethod } from '../types';
import { Save, RotateCcw, Calendar, CreditCard, Tag, Store, Layers, FileText, DollarSign } from 'lucide-react';

interface TransactionFormProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  merchants: Merchant[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction?: (t: Transaction) => void;
  onAddCategory: (c: Category) => void;
  onUpdateCategory?: (c: Category) => void;
  onAddMerchant?: (m: Merchant) => void;
  onAddPaymentMethod?: (p: PaymentMethod) => void;
  editingTransaction?: Transaction | null;
  onCancelEdit?: () => void;
}

const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  categories, 
  paymentMethods,
  transactions,
  merchants,
  onAddTransaction,
  onUpdateTransaction,
  onAddCategory,
  onUpdateCategory,
  onAddMerchant,
  onAddPaymentMethod,
  editingTransaction,
  onCancelEdit
}) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateString());
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
    setPaymentMethod('');
    setDate(getLocalDateString());
  };

  const suggestions = useMemo(() => {
    const merchantsSet = new Set<string>();
    merchants.forEach(m => merchantsSet.add(m.name));
    transactions.forEach(t => { if (t.merchant) merchantsSet.add(t.merchant); });
    
    const historySubs = new Set<string>();
    const activeCatObj = categories.find(c => c.name.toLowerCase() === category.toLowerCase());
    transactions.forEach(t => {
      if (t.category.toLowerCase() === category.toLowerCase() && t.subCategory) historySubs.add(t.subCategory);
    });

    return {
      merchants: Array.from(merchantsSet).sort(),
      filteredSubCategories: Array.from(new Set([...(activeCatObj?.subCategories || []), ...Array.from(historySubs)])).sort(),
      paymentMethods: paymentMethods.map(p => p.name).sort()
    };
  }, [transactions, merchants, category, categories, paymentMethods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || !date || !category.trim()) return;

    const trimmedCategory = category.trim();
    const trimmedSubCategory = subCategory.trim();
    const trimmedMerchant = merchant.trim() || 'Undefined';
    const trimmedPayment = paymentMethod.trim();

    // Inline Category creation
    let currentCat = categories.find(c => c.name.toLowerCase() === trimmedCategory.toLowerCase());
    if (!currentCat) {
      const newCat: Category = { name: trimmedCategory, type: type, subCategories: trimmedSubCategory ? [trimmedSubCategory] : [] };
      onAddCategory(newCat);
    } else if (trimmedSubCategory && onUpdateCategory) {
      const subExists = (currentCat.subCategories || []).some(s => s.toLowerCase() === trimmedSubCategory.toLowerCase());
      if (!subExists) {
        onUpdateCategory({
          ...currentCat,
          subCategories: [...(currentCat.subCategories || []), trimmedSubCategory]
        });
      }
    }

    // Inline Merchant creation
    if (trimmedMerchant && trimmedMerchant !== 'Undefined' && onAddMerchant) {
      const merchantExists = merchants.some(m => m.name.toLowerCase() === trimmedMerchant.toLowerCase());
      if (!merchantExists) onAddMerchant({ name: trimmedMerchant });
    }

    // Inline Payment Method creation
    if (trimmedPayment && onAddPaymentMethod) {
      const paymentExists = paymentMethods.some(p => p.name.toLowerCase() === trimmedPayment.toLowerCase());
      if (!paymentExists) onAddPaymentMethod({ name: trimmedPayment });
    }

    const transactionData: Transaction = {
      amount: parsedAmount,
      date,
      category: trimmedCategory,
      subCategory: trimmedSubCategory || undefined,
      merchant: trimmedMerchant,
      paymentMethod: trimmedPayment || undefined,
      description,
      type
    };

    if (editingTransaction?.id !== undefined) {
      transactionData.id = editingTransaction.id;
      onUpdateTransaction?.(transactionData);
    } else {
      onAddTransaction(transactionData);
    }
    
    resetForm();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 animate-in fade-in duration-300">
      {/* SECTION 1: CORE DATA */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
          <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><DollarSign size={16} /></div>
          <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Transaction Basics</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Flow Type</label>
            <div className="flex bg-gray-100 p-1.5 rounded-2xl h-14">
              <button
                type="button"
                onClick={() => setType(TransactionType.EXPENSE)}
                className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
                  type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-500'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType(TransactionType.INCOME)}
                className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
                  type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-500'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Amount</label>
            <div className="relative group h-14">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number" step="0.01" required value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-full pl-10 pr-6 bg-gray-50 border border-gray-200 rounded-2xl text-lg font-black focus:ring-4 focus:ring-blue-100 focus:border-blue-300 focus:bg-white outline-none transition-all placeholder-gray-300"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Posting Date</label>
            <div className="relative group h-14" onClick={() => dateInputRef.current?.showPicker()}>
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors">
                <Calendar size={20} />
              </div>
              <input
                ref={dateInputRef}
                type="date" required value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-full pl-14 pr-6 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-300 focus:bg-white outline-none transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: CLASSIFICATION */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
          <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600"><Tag size={16} /></div>
          <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Categorization & Payee</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Main Category</label>
            <div className="relative group h-14">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Tag size={20} />
              </div>
              <input
                type="text" list="cat-suggestions" required value={category}
                onChange={(e) => { setCategory(e.target.value); setSubCategory(''); }}
                className="w-full h-full pl-14 pr-6 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-300 focus:bg-white outline-none transition-all"
                placeholder="Required"
              />
              <datalist id="cat-suggestions">
                {categories.filter(c => c.type === type || c.type === TransactionType.BOTH).map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Sub-Category</label>
            <div className="relative group h-14">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Layers size={20} />
              </div>
              <input
                type="text" list="sub-suggestions" value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full h-full pl-14 pr-6 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-300 focus:bg-white outline-none transition-all disabled:opacity-50"
                placeholder="Optional"
                disabled={!category.trim()}
              />
              <datalist id="sub-suggestions">
                {suggestions.filteredSubCategories.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Merchant / Payee</label>
            <div className="relative group h-14">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Store size={20} />
              </div>
              <input
                type="text" list="merch-suggestions" value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full h-full pl-14 pr-6 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-300 focus:bg-white outline-none transition-all"
                placeholder="Undefined"
              />
              <datalist id="merch-suggestions">
                {suggestions.merchants.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: OTHER INFO */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
          <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600"><CreditCard size={16} /></div>
          <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Payment & Notes</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Payment Method</label>
            <div className="relative group h-14">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <CreditCard size={20} />
              </div>
              <input
                type="text" list="pay-suggestions" value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-full pl-14 pr-6 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-300 focus:bg-white outline-none transition-all"
                placeholder="Search or add new..."
              />
              <datalist id="pay-suggestions">
                {suggestions.paymentMethods.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Description / Notes</label>
            <div className="relative group h-14">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <FileText size={20} />
              </div>
              <input
                type="text" value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-full pl-14 pr-6 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-300 focus:bg-white outline-none transition-all"
                placeholder="Optional memo..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
        <button 
          type="submit" 
          className="flex-1 w-full sm:w-auto h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <Save size={20} />
          {editingTransaction ? 'Update Record' : 'Save Transaction'}
        </button>
        {editingTransaction && (
          <button 
            type="button" 
            onClick={onCancelEdit}
            className="w-full sm:w-auto h-16 px-10 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default TransactionForm;
