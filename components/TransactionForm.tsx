
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, TransactionType, Category, Merchant, PaymentMethod, RecurringTemplate, RecurrenceSchedule, Frequency } from '../types';
import { Save, Calendar, CreditCard, Tag, Store, Layers, FileText, DollarSign, Clock } from 'lucide-react';

interface TransactionFormProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  merchants: Merchant[];
  onAddTransaction: (t: any) => void;
  onUpdateTransaction?: (t: any) => void;
  onAddCategory: (c: Category) => void;
  onUpdateCategory?: (c: Category) => void;
  onAddMerchant?: (m: Merchant) => void;
  onAddPaymentMethod?: (p: PaymentMethod) => void;
  editingTransaction?: Transaction | RecurringTemplate | null;
  onCancelEdit?: () => void;
  isTemplateMode?: boolean;
}

const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKS_OF_MONTH = [
  { val: 1, label: "1st" },
  { val: 2, label: "2nd" },
  { val: 3, label: "3rd" },
  { val: 4, label: "4th" },
  { val: 5, label: "Last" }
];

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
  onCancelEdit,
  isTemplateMode = false
}) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [description, setDescription] = useState('');
  
  const [freq, setFreq] = useState<Frequency>('none');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [weekOfMonth, setWeekOfMonth] = useState<number | undefined>(undefined);
  const [monthlyMode, setMonthlyMode] = useState<'date' | 'day'>('date');
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      if ('date' in editingTransaction) setDate(editingTransaction.date);
      setCategory(editingTransaction.category);
      setSubCategory(editingTransaction.subCategory || '');
      setMerchant(editingTransaction.merchant || '');
      setPaymentMethod(editingTransaction.paymentMethod || '');
      setDescription(editingTransaction.description || '');
      
      if ('schedule' in editingTransaction && editingTransaction.schedule) {
        const s = editingTransaction.schedule;
        setFreq(s.frequency);
        setDayOfWeek(s.dayOfWeek ?? 1);
        setDayOfMonth(s.dayOfMonth ?? 1);
        setWeekOfMonth(s.weekOfMonth);
        setMonthlyMode(s.weekOfMonth ? 'day' : 'date');
      }
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
    setFreq('none');
    setDate(getLocalDateString());
  };

  const sortedCategories = useMemo(() => 
    [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );

  const sortedMerchants = useMemo(() => 
    [...merchants].sort((a, b) => a.name.localeCompare(b.name)),
    [merchants]
  );

  const sortedPaymentMethods = useMemo(() => 
    [...paymentMethods].sort((a, b) => a.name.localeCompare(b.name)),
    [paymentMethods]
  );

  const currentCategorySubs = useMemo(() => {
    const cat = categories.find(c => c.name.toLowerCase() === category.toLowerCase().trim());
    return [...(cat?.subCategories || [])].sort((a, b) => a.localeCompare(b));
  }, [category, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || (!isTemplateMode && !date) || !category.trim()) return;

    const trimmedCategory = category.trim();
    const trimmedSubCategory = subCategory.trim();
    const trimmedMerchant = merchant.trim() || 'Undefined';
    const trimmedPayment = paymentMethod.trim();

    // 1. Check and register Category if new
    if (!categories.find(c => c.name.toLowerCase() === trimmedCategory.toLowerCase())) {
      onAddCategory({ name: trimmedCategory, type: type, subCategories: trimmedSubCategory ? [trimmedSubCategory] : [] });
    }

    // 2. Check and register Merchant if new
    if (trimmedMerchant !== 'Undefined' && onAddMerchant) {
      const existingMerchant = merchants.find(m => m.name.toLowerCase() === trimmedMerchant.toLowerCase());
      if (!existingMerchant) {
        onAddMerchant({ name: trimmedMerchant });
      }
    }

    // 3. Check and register Payment Method if new
    if (trimmedPayment && onAddPaymentMethod) {
      const existingPayment = paymentMethods.find(p => p.name.toLowerCase() === trimmedPayment.toLowerCase());
      if (!existingPayment) {
        onAddPaymentMethod({ name: trimmedPayment });
      }
    }

    const baseData = {
      amount: parsedAmount,
      category: trimmedCategory,
      subCategory: trimmedSubCategory || undefined,
      merchant: trimmedMerchant,
      paymentMethod: trimmedPayment || undefined,
      description,
      type
    };

    if (isTemplateMode) {
      const schedule: RecurrenceSchedule = {
        frequency: freq,
        dayOfWeek: (freq === 'weekly' || (freq === 'monthly' && monthlyMode === 'day')) ? dayOfWeek : undefined,
        dayOfMonth: (freq === 'monthly' && monthlyMode === 'date') ? dayOfMonth : undefined,
        weekOfMonth: (freq === 'monthly' && monthlyMode === 'day') ? weekOfMonth : undefined
      };

      const templateData: RecurringTemplate = {
        ...baseData,
        name: trimmedMerchant !== 'Undefined' ? trimmedMerchant : trimmedCategory,
        schedule,
        id: (editingTransaction as any)?.id
      };
      if (editingTransaction?.id !== undefined) {
        onUpdateTransaction?.(templateData);
      } else {
        onAddTransaction(templateData);
      }
    } else {
      const transactionData: Transaction = {
        ...baseData,
        date,
        id: (editingTransaction as any)?.id
      };
      if (editingTransaction?.id !== undefined) {
        onUpdateTransaction?.(transactionData);
      } else {
        onAddTransaction(transactionData);
      }
    }
    resetForm();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-300">
      <section>
        <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-1">
          <div className="p-1 bg-blue-50 rounded text-blue-600"><DollarSign size={14} /></div>
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Financials</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Flow</label>
            <div className="flex bg-gray-100 p-1 rounded-xl h-11">
              <button type="button" onClick={() => setType(TransactionType.EXPENSE)} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Expense</button>
              <button type="button" onClick={() => setType(TransactionType.INCOME)} className={`flex-1 rounded-lg text-[9px] font-black uppercase transition-all ${type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Income</button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Amount</label>
            <div className="relative h-11">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-full pl-8 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-md font-black text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder-0.00" />
            </div>
          </div>
          {!isTemplateMode && (
            <div className="space-y-1">
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Date</label>
              <div className="relative h-11" onClick={() => dateInputRef.current?.showPicker()}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Calendar size={16} /></div>
                <input ref={dateInputRef} type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-full pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer" />
              </div>
            </div>
          )}
        </div>
      </section>

      {isTemplateMode && (
        <section className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/50">
          <div className="flex items-center gap-2 mb-3 border-b border-indigo-100/50 pb-1">
            <div className="p-1 bg-indigo-100/50 rounded text-indigo-600"><Clock size={14} /></div>
            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Recurrence</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-wider ml-1">Frequency</label>
              <select value={freq} onChange={(e) => setFreq(e.target.value as Frequency)} className="w-full h-10 px-3 bg-white border border-indigo-100 rounded-xl text-xs font-black uppercase tracking-tight text-gray-900 focus:ring-4 focus:ring-indigo-100 outline-none appearance-none cursor-pointer">
                <option value="none">Manual Only</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {freq === 'weekly' && (
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-wider ml-1">Weekday</label>
                <select value={dayOfWeek} onChange={(e) => setDayOfWeek(parseInt(e.target.value))} className="w-full h-10 px-3 bg-white border border-indigo-100 rounded-xl text-xs font-bold text-gray-900 focus:ring-4 focus:ring-indigo-100 outline-none appearance-none cursor-pointer">
                  {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            )}

            {freq === 'monthly' && (
              <>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-wider ml-1">Mode</label>
                  <div className="flex bg-white/50 border border-indigo-100 p-0.5 rounded-lg h-10">
                    <button type="button" onClick={() => setMonthlyMode('date')} className={`flex-1 rounded-md text-[8px] font-black uppercase transition-all ${monthlyMode === 'date' ? 'bg-indigo-600 text-white' : 'text-indigo-400'}`}>Date</button>
                    <button type="button" onClick={() => { setMonthlyMode('day'); if(!weekOfMonth) setWeekOfMonth(1); }} className={`flex-1 rounded-md text-[8px] font-black uppercase transition-all ${monthlyMode === 'day' ? 'bg-indigo-600 text-white' : 'text-indigo-400'}`}>Day</button>
                  </div>
                </div>
                {monthlyMode === 'date' ? (
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-wider ml-1">Day #</label>
                    <input type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(parseInt(e.target.value))} className="w-full h-10 px-3 bg-white border border-indigo-100 rounded-xl text-xs font-black text-gray-900 focus:ring-4 focus:ring-indigo-100 outline-none" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-wider ml-1">Week</label>
                      <select value={weekOfMonth} onChange={(e) => setWeekOfMonth(parseInt(e.target.value))} className="w-full h-10 px-3 bg-white border border-indigo-100 rounded-xl text-xs font-bold text-gray-900 focus:ring-4 focus:ring-indigo-100 outline-none">
                        {WEEKS_OF_MONTH.map(w => <option key={w.val} value={w.val}>{w.label}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <div className="mt-3 p-2 bg-white/50 rounded-lg border border-indigo-100/50 flex items-center gap-2">
             <Clock size={12} className="text-indigo-400" />
             <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
               Pattern: {freq === 'none' ? 'Manual Posting' : freq === 'daily' ? 'Repeats daily' : 
                          freq === 'weekly' ? `Every ${DAYS_OF_WEEK[dayOfWeek]}` : 
                          freq === 'monthly' ? (monthlyMode === 'date' ? `Every ${dayOfMonth}th` : `${WEEKS_OF_MONTH.find(w => w.val === weekOfMonth)?.label} ${DAYS_OF_WEEK[dayOfWeek]}`) :
                          'Yearly'}
             </span>
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-1">
          <div className="p-1 bg-indigo-50 rounded text-indigo-600"><Tag size={14} /></div>
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Metadata</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Category</label>
            <div className="relative">
              <Tag size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" list="cat-suggestions" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-11 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none" placeholder="Required..." />
            </div>
            <datalist id="cat-suggestions">{sortedCategories.map(c => <option key={c.id} value={c.name} />)}</datalist>
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Sub-Category</label>
            <div className="relative">
              <Layers size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" list="sub-cat-suggestions" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className="w-full h-11 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none" placeholder="Optional..." />
            </div>
            <datalist id="sub-cat-suggestions">{currentCategorySubs.map((s, idx) => <option key={idx} value={s} />)}</datalist>
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Payee / Merchant</label>
            <div className="relative">
              <Store size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" list="merch-suggestions" value={merchant} onChange={(e) => setMerchant(e.target.value)} className="w-full h-11 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none" placeholder="Optional..." />
            </div>
            <datalist id="merch-suggestions">{sortedMerchants.map(m => <option key={m.id} value={m.name} />)}</datalist>
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider ml-1">Payment Method</label>
            <div className="relative">
              <CreditCard size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" list="pay-suggestions" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full h-11 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none" placeholder="Optional..." />
            </div>
            <datalist id="pay-suggestions">{sortedPaymentMethods.map(p => <option key={p.id} value={p.name} />)}</datalist>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-1">
          <div className="p-1 bg-gray-100 rounded text-gray-600"><FileText size={14} /></div>
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Additional Notes</h4>
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none min-h-[80px]" placeholder="Brief context for this entry..." />
      </section>

      <div className="flex items-center gap-3 pt-4">
        <button type="submit" className="flex-1 h-12 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
          <Save size={16} /> {editingTransaction ? 'Update' : 'Save'} {isTemplateMode ? 'Template' : 'Entry'}
        </button>
        {editingTransaction && (
          <button type="button" onClick={onCancelEdit} className="h-12 px-6 bg-gray-100 text-gray-500 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all active:scale-[0.98]">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default TransactionForm;
