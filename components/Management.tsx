
import React, { useState } from 'react';
import { Transaction, Category, Merchant, PaymentMethod, TransactionType } from '../types';
import { 
  Trash2, 
  X, 
  PlusCircle,
  Edit2,
  Database,
  Download,
  Upload,
  Save,
  AlertCircle,
  CreditCard,
  Tags,
  Store,
  ChevronRight
} from 'lucide-react';

interface ManagementProps {
  mode: 'categories' | 'merchants' | 'payments' | 'backups';
  categories: Category[];
  transactions: Transaction[];
  onAddCategory: (c: Category) => void;
  onUpdateCategory: (c: Category) => void;
  onDeleteCategory: (id: number) => void;
  onDeleteSubCategory: (catId: number, subName: string) => void;
  merchants: Merchant[];
  onAddMerchant: (v: Merchant) => void;
  onUpdateMerchant: (v: Merchant) => void;
  onDeleteMerchant: (id: number) => void;
  paymentMethods: PaymentMethod[];
  onAddPaymentMethod: (p: PaymentMethod) => void;
  onUpdatePaymentMethod: (p: PaymentMethod) => void;
  onDeletePaymentMethod: (id: number) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

const Management: React.FC<ManagementProps> = ({ 
  mode,
  categories, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory,
  onDeleteSubCategory,
  merchants,
  onAddMerchant,
  onUpdateMerchant,
  onDeleteMerchant,
  paymentMethods,
  onAddPaymentMethod,
  onUpdatePaymentMethod,
  onDeletePaymentMethod,
  onExport,
  onImport
}) => {
  // Shared edit states
  const [editingItem, setEditingItem] = useState<{ type: 'category' | 'merchant' | 'payment', data: any } | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [editType, setEditType] = useState<TransactionType>(TransactionType.BOTH);
  const [deletingItem, setDeletingItem] = useState<{ type: 'category' | 'merchant' | 'payment', data: any } | null>(null);

  const openEdit = (type: 'category' | 'merchant' | 'payment', item: any) => {
    setEditingItem({ type, data: item });
    setEditName(item.name);
    if (type === 'payment' || type === 'category') setEditColor(item.color || '#3B82F6');
    if (type === 'category') setEditType(item.type);
  };

  const handleSave = () => {
    if (!editingItem || !editName.trim()) return;

    if (editingItem.type === 'category') {
      onUpdateCategory({ ...editingItem.data, name: editName.trim(), color: editColor, type: editType });
    } else if (editingItem.type === 'merchant') {
      onUpdateMerchant({ ...editingItem.data, name: editName.trim() });
    } else if (editingItem.type === 'payment') {
      onUpdatePaymentMethod({ ...editingItem.data, name: editName.trim(), color: editColor });
    }
    setEditingItem(null);
  };

  const confirmDelete = () => {
    if (!deletingItem || !deletingItem.data.id) return;
    if (deletingItem.type === 'category') onDeleteCategory(deletingItem.data.id);
    else if (deletingItem.type === 'merchant') onDeleteMerchant(deletingItem.data.id);
    else if (deletingItem.type === 'payment') onDeletePaymentMethod(deletingItem.data.id);
    setDeletingItem(null);
  };

  const Header = ({ title, icon: Icon, onAdd, addLabel }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 text-blue-600">
          <Icon size={20} />
        </div>
        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{title}</h3>
      </div>
      <button 
        onClick={onAdd}
        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <PlusCircle size={16} /> {addLabel}
      </button>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 uppercase tracking-tight text-xs flex items-center gap-2">
                <Edit2 size={14} /> Edit {editingItem.type}
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Label Name</label>
                <input 
                  autoFocus 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                />
              </div>

              {editingItem.type === 'category' && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Type</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    {[TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.BOTH].map(t => (
                      <button
                        key={t}
                        onClick={() => setEditType(t)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${editType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(editingItem.type === 'payment' || editingItem.type === 'category') && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Theme Color</label>
                  <div className="flex gap-4 items-center">
                    <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent" />
                    <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg font-mono text-xs text-gray-500 uppercase">{editColor}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-3 font-black uppercase text-[10px] tracking-widest text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-50">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingItem && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-8 text-center border border-gray-100 shadow-2xl">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black uppercase mb-2">Delete {deletingItem.type}?</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-gray-800">"{deletingItem.data.name}"</span>? 
              {deletingItem.type === 'category' ? " Transactions in this category will be moved to 'Other'." : " This action cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingItem(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      {mode === 'categories' && (
        <div className="space-y-6">
          <Header title="Expense & Income Categories" icon={Tags} addLabel="New Category" onAdd={() => onAddCategory({ name: 'New Category', type: TransactionType.EXPENSE })} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white rounded-2xl border-l-4 p-6 shadow-sm group hover:shadow-md transition-all" style={{ borderLeftColor: cat.color || '#3B82F6' }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-gray-900 text-lg leading-tight">{cat.name}</h4>
                    <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest">{cat.type}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit('category', cat)} className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={14}/></button>
                    <button onClick={() => setDeletingItem({ type: 'category', data: cat })} className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Sub-categories</span>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[24px]">
                    {cat.subCategories && cat.subCategories.length > 0 ? cat.subCategories.map(s => (
                      <span key={s} className="pl-2 pr-1 py-1 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-500 border border-gray-100 flex items-center gap-1 group/sub">
                        {s}
                        <button onClick={() => cat.id && onDeleteSubCategory(cat.id, s)} className="p-0.5 text-gray-300 hover:text-rose-500 opacity-0 group-hover/sub:opacity-100 transition-opacity"><X size={10}/></button>
                      </span>
                    )) : (
                      <span className="text-[10px] text-gray-300 italic">No sub-categories defined</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'merchants' && (
        <div className="space-y-6">
          <Header title="Payees & Merchants" icon={Store} addLabel="New Payee" onAdd={() => onAddMerchant({ name: 'New Merchant' })} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {merchants.map(m => (
              <div key={m.id} className="bg-white rounded-xl border p-4 shadow-sm group hover:shadow-md transition-all flex items-center justify-between">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                    <Store size={14} />
                  </div>
                  <h4 className="font-bold text-gray-900 truncate pr-2">{m.name}</h4>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit('merchant', m)} className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={12}/></button>
                  <button onClick={() => setDeletingItem({ type: 'merchant', data: m })} className="p-1.5 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={12}/></button>
                </div>
              </div>
            ))}
          </div>
          {merchants.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
               <Store size={40} className="mx-auto text-gray-200 mb-4" />
               <p className="text-gray-400 font-medium">No payees recorded yet.</p>
            </div>
          )}
        </div>
      )}

      {mode === 'payments' && (
        <div className="space-y-6">
          <Header title="Payment Methods" icon={CreditCard} addLabel="New Method" onAdd={() => onAddPaymentMethod({ name: 'New Payment Method', color: '#3B82F6' })} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paymentMethods.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border-l-4 p-5 shadow-sm group relative hover:shadow-md transition-all" style={{ borderLeftColor: p.color || '#E5E7EB' }}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:text-blue-500 transition-colors">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 leading-tight">{p.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || '#E5E7EB' }}></div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.color}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit('payment', p)} className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => setDeletingItem({ type: 'payment', data: p })} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'backups' && (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-xl max-w-2xl text-center mx-auto mt-10">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Database size={40} />
          </div>
          <h3 className="text-2xl font-black uppercase mb-3 tracking-tight">System Backup & Recovery</h3>
          <p className="text-gray-500 text-sm mb-10 leading-relaxed px-10">
            Export your entire financial history including categories, payees, and transactions as a secure JSON file. Use the import function to restore data on a new device.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={onExport} className="py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-gray-200">
              <Download size={18}/> Export Dataset
            </button>
            <button onClick={() => document.getElementById('import-file')?.click()} className="py-4 border-2 border-dashed border-gray-200 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:border-blue-300 hover:text-blue-600 transition-all text-gray-500">
              <Upload size={18}/> Restore Dataset
            </button>
            <input id="import-file" type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-gray-300 uppercase font-black text-[9px] tracking-tighter">
            <AlertCircle size={12} /> Privacy: All data remains local to your browser
          </div>
        </div>
      )}
    </div>
  );
};

export default Management;
