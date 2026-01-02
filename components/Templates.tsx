
import React, { useState, useMemo } from 'react';
import { RecurringTemplate, TransactionType, Category, Transaction, PaymentMethod, Merchant } from '../types';
import { 
  Repeat, 
  Trash2, 
  Zap, 
  LayoutGrid, 
  Info, 
  Edit2, 
  X, 
  PlusCircle, 
  CreditCard,
  Search,
  ChevronDown,
  SortAsc,
  SortDesc
} from 'lucide-react';
import TransactionForm from './TransactionForm';

interface TemplatesProps {
  templates: RecurringTemplate[];
  onPost: (t: RecurringTemplate) => void;
  onDelete: (id: number) => void;
  onUpdate: (t: RecurringTemplate) => void;
  onAdd: (t: RecurringTemplate) => void;
  onAddPaymentMethod: (p: PaymentMethod) => void;
  transactions: Transaction[];
  categories: Category[];
  merchants: Merchant[];
  paymentMethods: PaymentMethod[];
}

const Templates: React.FC<TemplatesProps> = ({ 
  templates, 
  onPost, 
  onDelete, 
  onUpdate, 
  onAdd, 
  onAddPaymentMethod,
  transactions, 
  categories, 
  merchants, 
  paymentMethods 
}) => {
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [searchValue, setSearchValue] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'amount' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleEditClick = (tmp: RecurringTemplate) => {
    setEditingTemplate(tmp);
  };

  const handleUpdateTemplate = (t: Transaction) => {
    if (!editingTemplate) return;
    const updatedTemplate: RecurringTemplate = {
      id: editingTemplate.id,
      name: t.merchant || t.category,
      amount: t.amount,
      category: t.category,
      subCategory: t.subCategory,
      merchant: t.merchant,
      paymentMethod: t.paymentMethod,
      description: t.description,
      type: t.type
    };
    onUpdate(updatedTemplate);
    setEditingTemplate(null);
  };

  const handleCreateTemplate = (t: Transaction) => {
    const newTemplate: RecurringTemplate = {
      name: t.merchant || t.category,
      amount: t.amount,
      category: t.category,
      subCategory: t.subCategory,
      merchant: t.merchant,
      paymentMethod: t.paymentMethod,
      description: t.description,
      type: t.type
    };
    onAdd(newTemplate);
    setIsCreating(false);
  };

  const filteredAndSortedTemplates = useMemo(() => {
    let result = templates;
    
    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      result = templates.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.category.toLowerCase().includes(query) || 
        (t.description || '').toLowerCase().includes(query) ||
        (t.merchant || '').toLowerCase().includes(query)
      );
    }

    return [...result].sort((a, b) => {
      let comp = 0;
      if (sortKey === 'name') comp = a.name.localeCompare(b.name);
      else if (sortKey === 'amount') comp = a.amount - b.amount;
      else if (sortKey === 'category') comp = a.category.localeCompare(b.category);
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [templates, searchValue, sortKey, sortOrder]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 text-indigo-600">
              <Repeat size={20} />
            </div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Recurring Templates</h3>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle size={16} /> New Template
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative group flex-1 max-w-md">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
              <Search size={16} />
            </div>
            <input 
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-11 pr-10 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all placeholder-gray-300"
            />
            {searchValue && (
              <button 
                onClick={() => setSearchValue('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-48">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="w-full pl-4 pr-10 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer"
              >
                <option value="name">Name</option>
                <option value="amount">Amount</option>
                <option value="category">Category</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-500 hover:text-blue-600 transition-all active:scale-95"
            >
              {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
            </button>
          </div>
        </div>
      </div>

      {(editingTemplate || isCreating) && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isCreating ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                  {isCreating ? <PlusCircle size={18} /> : <Edit2 size={18} />}
                </div>
                <h3 className="font-black text-gray-800 uppercase tracking-tight text-sm">
                  {isCreating ? 'Create Template' : 'Edit Template'}
                </h3>
              </div>
              <button 
                onClick={() => { setEditingTemplate(null); setIsCreating(false); }} 
                className="p-2 hover:bg-gray-200 rounded-full text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <TransactionForm 
                categories={categories} 
                paymentMethods={paymentMethods}
                transactions={transactions}
                merchants={merchants}
                onAddTransaction={isCreating ? handleCreateTemplate : () => {}} 
                onUpdateTransaction={!isCreating ? handleUpdateTemplate : undefined}
                onAddCategory={() => {}} 
                onAddPaymentMethod={onAddPaymentMethod}
                editingTransaction={editingTemplate ? {
                  ...editingTemplate,
                  date: new Date().toISOString().split('T')[0]
                } : null} 
                onCancelEdit={() => { setEditingTemplate(null); setIsCreating(false); }} 
              />
            </div>
          </div>
        </div>
      )}

      {filteredAndSortedTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
          <Info size={40} className="text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">No templates found.</p>
          <p className="text-xs text-gray-400">Try adjusting your search or click "New Template" to start.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedTemplates.map(tmp => (
            <div key={tmp.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tmp.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{tmp.name}</h3>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{tmp.category}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditClick(tmp)}
                    className="p-2 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => tmp.id && onDelete(tmp.id)}
                    className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <p className={`text-2xl font-black ${tmp.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-gray-900'}`}>
                  ${tmp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                {tmp.description && <p className="text-xs text-gray-400 mt-1 italic line-clamp-1">"{tmp.description}"</p>}
                {tmp.paymentMethod && <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 border-t pt-2 flex items-center gap-1"><CreditCard size={10}/> {tmp.paymentMethod}</p>}
              </div>

              <button 
                onClick={() => onPost(tmp)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100"
              >
                <Zap size={14} />
                Post for Today
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Templates;
