import React, { useState } from 'react';
import { RecurringTemplate, TransactionType, Category, Transaction } from '../types';
import { Repeat, Trash2, Zap, LayoutGrid, Info, Edit2, X } from 'lucide-react';
import TransactionForm from './TransactionForm';

interface TemplatesProps {
  templates: RecurringTemplate[];
  onPost: (t: RecurringTemplate) => void;
  onDelete: (id: number) => void;
  onUpdate: (t: RecurringTemplate) => void;
  transactions: Transaction[];
  categories: Category[];
}

const Templates: React.FC<TemplatesProps> = ({ templates, onPost, onDelete, onUpdate, transactions, categories }) => {
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);

  const handleEditClick = (tmp: RecurringTemplate) => {
    setEditingTemplate(tmp);
  };

  const handleUpdateTemplate = (t: Transaction) => {
    if (!editingTemplate) return;
    const updatedTemplate: RecurringTemplate = {
      id: editingTemplate.id,
      name: t.vendor || t.category,
      amount: t.amount,
      category: t.category,
      subCategory: t.subCategory,
      vendor: t.vendor,
      description: t.description,
      type: t.type
    };
    onUpdate(updatedTemplate);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Edit2 size={18} /></div>
                <h3 className="font-black text-gray-800 uppercase tracking-tight text-sm">Edit Template</h3>
              </div>
              <button onClick={() => setEditingTemplate(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={20} /></button>
            </div>
            <div className="p-6">
              {/* Note: Passing a fake date because TransactionForm expects it */}
              <TransactionForm 
                categories={categories} 
                transactions={transactions} 
                onAddTransaction={() => {}} 
                onUpdateTransaction={handleUpdateTemplate}
                onAddCategory={() => {}} 
                editingTransaction={{
                  ...editingTemplate,
                  date: new Date().toISOString().split('T')[0] // Dummy date
                }} 
                onCancelEdit={() => setEditingTemplate(null)} 
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-indigo-600 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Recurring Templates</h2>
          <p className="text-indigo-100 text-sm leading-relaxed">
            Quickly add monthly bills, subscriptions, or fixed income. Click "Post" to record a new transaction with today's date using these saved details.
          </p>
        </div>
        <Repeat size={120} className="absolute -right-8 -bottom-8 text-indigo-500 opacity-20 rotate-12" />
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
          <Info size={40} className="text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">No templates saved yet.</p>
          <p className="text-xs text-gray-400">Save a transaction as a template from the list view to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(tmp => (
            <div key={tmp.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tmp.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{tmp.vendor || tmp.category}</h3>
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
                {tmp.description && <p className="text-xs text-gray-400 mt-1 italic">"{tmp.description}"</p>}
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