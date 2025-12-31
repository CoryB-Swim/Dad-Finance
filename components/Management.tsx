
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Category, Merchant, PaymentMethod, TransactionType } from '../types';
import { 
  Trash2, 
  X, 
  PlusCircle,
  Edit2,
  Database,
  Download,
  Upload,
  AlertCircle,
  CreditCard,
  Tags,
  Store,
  Search,
  Globe,
  MapPin,
  TrendingUp,
  Hash,
  Calculator,
  ExternalLink,
  ListOrdered,
  SortAsc,
  SortDesc,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';

interface HeaderProps {
  title: string;
  icon: any;
  onAdd: () => void;
  addLabel: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  sortKey?: string;
  onSortKeyChange?: (val: any) => void;
  sortOrder?: 'asc' | 'desc';
  onSortOrderChange?: (val: 'asc' | 'desc') => void;
  sortOptions?: { value: string; label: string }[];
}

const Header = ({ 
  title, 
  icon: Icon, 
  onAdd, 
  addLabel, 
  searchValue, 
  onSearchChange, 
  searchPlaceholder,
  sortKey,
  onSortKeyChange,
  sortOrder,
  onSortOrderChange,
  sortOptions
}: HeaderProps) => (
  <div className="flex flex-col gap-6 mb-8">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

    <div className="flex flex-col md:flex-row gap-4">
      {onSearchChange && (
        <div className="relative group flex-1 max-w-md">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
            <Search size={16} />
          </div>
          <input 
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-11 pr-10 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all placeholder-gray-300"
          />
          {searchValue && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {sortOptions && onSortKeyChange && onSortOrderChange && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-48">
            <select
              value={sortKey}
              onChange={(e) => onSortKeyChange(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-500 hover:text-blue-600 transition-all active:scale-95"
          >
            {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
          </button>
        </div>
      )}
    </div>
  </div>
);

interface ManagementProps {
  mode: 'categories' | 'merchants' | 'payments' | 'backups';
  categories: Category[];
  transactions: Transaction[];
  onAddCategory: (c: Category) => void;
  onUpdateCategory: (c: Category) => void;
  onDeleteCategory: (id: number) => void;
  onDeleteSubCategory: (catId: number, subName: string) => void;
  onRenameSubCategory: (catId: number, oldName: string, newName: string) => void;
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
  onViewMerchantTransactions?: (merchantName: string) => void;
  targetMerchantName?: string | null;
  onClearTargetMerchant?: () => void;
}

const Management: React.FC<ManagementProps> = ({ 
  mode,
  categories, 
  transactions,
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory,
  onDeleteSubCategory,
  onRenameSubCategory,
  merchants,
  onAddMerchant,
  onUpdateMerchant,
  onDeleteMerchant,
  paymentMethods,
  onAddPaymentMethod,
  onUpdatePaymentMethod,
  onDeletePaymentMethod,
  onExport,
  onImport,
  onViewMerchantTransactions,
  targetMerchantName,
  onClearTargetMerchant
}) => {
  // Shared edit states
  const [editingItem, setEditingItem] = useState<{ type: 'category' | 'merchant' | 'payment' | 'subCategory', data: any, catId?: number } | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [editType, setEditType] = useState<TransactionType>(TransactionType.BOTH);
  const [editLocation, setEditLocation] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  
  const [deletingItem, setDeletingItem] = useState<{ type: 'category' | 'merchant' | 'payment', data: any } | null>(null);

  // Search and Sort states
  const [categorySearch, setCategorySearch] = useState('');
  const [categorySortKey, setCategorySortKey] = useState<'name' | 'type' | 'subCount'>('name');
  const [categorySortOrder, setCategorySortOrder] = useState<'asc' | 'desc'>('asc');

  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantSortKey, setMerchantSortKey] = useState<'name' | 'spend' | 'visits' | 'recent'>('name');
  const [merchantSortOrder, setMerchantSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pre-calculate merchant stats for sorting
  const merchantStatsMap = useMemo(() => {
    const stats: Record<string, { total: number; count: number; lastDate: string | null; lastAmount: number | null; lastType: TransactionType | null }> = {};
    merchants.forEach(m => {
      const merchantTxs = transactions.filter(t => t.merchant?.toLowerCase() === m.name.toLowerCase());
      const total = merchantTxs.reduce((sum, t) => sum + t.amount, 0);
      const count = merchantTxs.length;
      
      const sortedTxs = [...merchantTxs].sort((a, b) => b.date.localeCompare(a.date));
      const lastTx = sortedTxs[0];

      stats[m.name.toLowerCase()] = {
        total,
        count,
        lastDate: lastTx ? lastTx.date : null,
        lastAmount: lastTx ? lastTx.amount : null,
        lastType: lastTx ? lastTx.type : null
      };
    });
    return stats;
  }, [merchants, transactions]);

  // Auto-open merchant if requested from external navigation
  useEffect(() => {
    if (mode === 'merchants' && targetMerchantName) {
      const m = merchants.find(item => item.name.toLowerCase() === targetMerchantName.toLowerCase());
      if (m) {
        setSelectedMerchant(m);
      }
      onClearTargetMerchant?.();
    }
  }, [mode, targetMerchantName, merchants, onClearTargetMerchant]);

  const sortedCategories = useMemo(() => {
    let filtered = categories;
    if (categorySearch.trim()) {
      const query = categorySearch.toLowerCase();
      filtered = categories.filter(cat => 
        cat.name.toLowerCase().includes(query) || 
        (cat.subCategories && cat.subCategories.some(s => s.toLowerCase().includes(query)))
      );
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (categorySortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (categorySortKey === 'type') {
        comparison = a.type.localeCompare(b.type);
      } else if (categorySortKey === 'subCount') {
        comparison = (a.subCategories?.length || 0) - (b.subCategories?.length || 0);
      }
      return categorySortOrder === 'asc' ? comparison : -comparison;
    });
  }, [categories, categorySearch, categorySortKey, categorySortOrder]);

  const sortedMerchants = useMemo(() => {
    let filtered = merchants;
    if (merchantSearch.trim()) {
      const query = merchantSearch.toLowerCase();
      filtered = merchants.filter(m => m.name.toLowerCase().includes(query));
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      const statsA = merchantStatsMap[a.name.toLowerCase()] || { total: 0, count: 0, lastDate: '' };
      const statsB = merchantStatsMap[b.name.toLowerCase()] || { total: 0, count: 0, lastDate: '' };

      if (merchantSortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (merchantSortKey === 'spend') {
        comparison = statsA.total - statsB.total;
      } else if (merchantSortKey === 'visits') {
        comparison = statsA.count - statsB.count;
      } else if (merchantSortKey === 'recent') {
        comparison = (statsA.lastDate || '').localeCompare(statsB.lastDate || '');
      }
      return merchantSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [merchants, merchantSearch, merchantSortKey, merchantSortOrder, merchantStatsMap]);

  // The rest of the computed detail stats for the MODAL ONLY
  const merchantStats = useMemo(() => {
    if (!selectedMerchant) return null;
    return merchantStatsMap[selectedMerchant.name.toLowerCase()];
  }, [selectedMerchant, merchantStatsMap]);

  const openEdit = (type: 'category' | 'merchant' | 'payment', item: any) => {
    setEditingItem({ type, data: item });
    setEditName(item.name);
    if (type === 'payment' || type === 'category') setEditColor(item.color || '#3B82F6');
    if (type === 'category') setEditType(item.type);
    if (type === 'merchant') {
      setEditLocation(item.location || '');
      setEditWebsite(item.website || '');
    }
  };

  const openEditSubCategory = (catId: number, subName: string) => {
    setEditingItem({ type: 'subCategory', data: subName, catId });
    setEditName(subName);
  };

  const handleSave = () => {
    if (!editingItem || !editName.trim()) return;

    if (editingItem.type === 'category') {
      onUpdateCategory({ ...editingItem.data, name: editName.trim(), color: editColor, type: editType });
    } else if (editingItem.type === 'merchant') {
      const updated = { ...editingItem.data, name: editName.trim(), location: editLocation.trim(), website: editWebsite.trim() };
      onUpdateMerchant(updated);
      if (selectedMerchant?.id === updated.id) setSelectedMerchant(updated);
    } else if (editingItem.type === 'payment') {
      onUpdatePaymentMethod({ ...editingItem.data, name: editName.trim(), color: editColor });
    } else if (editingItem.type === 'subCategory' && editingItem.catId) {
      onRenameSubCategory(editingItem.catId, editingItem.data, editName.trim());
    }
    setEditingItem(null);
  };

  const confirmDelete = () => {
    if (!deletingItem || !deletingItem.data.id) return;
    if (deletingItem.type === 'category') onDeleteCategory(deletingItem.data.id);
    else if (deletingItem.type === 'merchant') {
      onDeleteMerchant(deletingItem.data.id);
      setSelectedMerchant(null);
    }
    else if (deletingItem.type === 'payment') onDeletePaymentMethod(deletingItem.data.id);
    setDeletingItem(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 uppercase tracking-tight text-xs flex items-center gap-2">
                <Edit2 size={14} /> Edit {editingItem.type === 'subCategory' ? 'Sub-Category' : editingItem.type}
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

              {editingItem.type === 'merchant' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Location</label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input 
                        placeholder="e.g. New York, NY"
                        value={editLocation} 
                        onChange={(e) => setEditLocation(e.target.value)} 
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Website</label>
                    <div className="relative">
                      <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input 
                        placeholder="e.g. https://example.com"
                        value={editWebsite} 
                        onChange={(e) => setEditWebsite(e.target.value)} 
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                      />
                    </div>
                  </div>
                </>
              )}

              {(editingItem.type === 'payment') && (
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

      {/* Merchant Detail Modal */}
      {selectedMerchant && !editingItem && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="relative bg-gradient-to-br from-indigo-600 to-blue-700 p-8 text-white">
              <button onClick={() => setSelectedMerchant(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                  <Store size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight leading-none">{selectedMerchant.name}</h2>
                  <div className="flex gap-4 mt-2">
                    {selectedMerchant.website && (
                      <a href={selectedMerchant.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-100 hover:text-white transition-colors">
                        <Globe size={12} /> Website <ExternalLink size={10} />
                      </a>
                    )}
                    {selectedMerchant.location && (
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-100">
                        <MapPin size={12} /> {selectedMerchant.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <TrendingUp size={18} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Spend</p>
                  <h4 className="font-black text-gray-900">${merchantStats?.total.toLocaleString()}</h4>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <Hash size={18} className="mx-auto text-blue-500 mb-2" />
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Visits</p>
                  <h4 className="font-black text-gray-900">{merchantStats?.count}</h4>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <Calculator size={18} className="mx-auto text-indigo-500 mb-2" />
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Average</p>
                  <h4 className="font-black text-gray-900">${merchantStats?.count ? (merchantStats.total / merchantStats.count).toFixed(0) : 0}</h4>
                </div>
              </div>

              {merchantStats?.lastDate && (
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50/50 rounded-xl border border-blue-100 mb-8">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Last Activity</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-blue-600 block">{merchantStats.lastDate}</span>
                    <span className={`text-[10px] font-black uppercase ${merchantStats.lastType === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {merchantStats.lastType === TransactionType.INCOME ? '+' : '-'}${merchantStats.lastAmount?.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => onViewMerchantTransactions?.(selectedMerchant.name)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                >
                  <ListOrdered size={16} /> View Transactions
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => openEdit('merchant', selectedMerchant)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} /> Edit Details
                  </button>
                  <button 
                    onClick={() => setDeletingItem({ type: 'merchant', data: selectedMerchant })}
                    className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingItem && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-sm rounded-2xl p-8 text-center border border-gray-100 shadow-2xl">
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
          <Header 
            title="Expense & Income Categories" 
            icon={Tags} 
            addLabel="New Category" 
            onAdd={() => onAddCategory({ name: 'New Category', type: TransactionType.EXPENSE })}
            searchValue={categorySearch}
            onSearchChange={setCategorySearch}
            searchPlaceholder="Search category or sub-category..."
            sortKey={categorySortKey}
            onSortKeyChange={setCategorySortKey}
            sortOrder={categorySortOrder}
            onSortOrderChange={setCategorySortOrder}
            sortOptions={[
              { value: 'name', label: 'Name' },
              { value: 'type', label: 'Type' },
              { value: 'subCount', label: 'Sub-Categories' }
            ]}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCategories.map(cat => (
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
                        <div className="flex items-center opacity-0 group-hover/sub:opacity-100 transition-opacity">
                          <button onClick={() => cat.id && openEditSubCategory(cat.id, s)} className="p-0.5 text-gray-300 hover:text-blue-500"><Edit2 size={10}/></button>
                          <button onClick={() => cat.id && onDeleteSubCategory(cat.id, s)} className="p-0.5 text-gray-300 hover:text-rose-500"><X size={10}/></button>
                        </div>
                      </span>
                    )) : (
                      <span className="text-[10px] text-gray-300 italic">No sub-categories defined</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {sortedCategories.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                 <Tags size={40} className="mx-auto text-gray-200 mb-4" />
                 <p className="text-gray-400 font-medium">No categories matching your search.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'merchants' && (
        <div className="space-y-6">
          <Header 
            title="Payees & Merchants" 
            icon={Store} 
            addLabel="New Payee" 
            onAdd={() => onAddMerchant({ name: 'New Merchant' })}
            searchValue={merchantSearch}
            onSearchChange={setMerchantSearch}
            searchPlaceholder="Filter payees..."
            sortKey={merchantSortKey}
            onSortKeyChange={setMerchantSortKey as any}
            sortOrder={merchantSortOrder}
            onSortOrderChange={setMerchantSortOrder}
            sortOptions={[
              { value: 'name', label: 'Name' },
              { value: 'spend', label: 'Total Spend' },
              { value: 'visits', label: 'Visits' },
              { value: 'recent', label: 'Recently Used' }
            ]}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedMerchants.map(m => {
              const stats = merchantStatsMap[m.name.toLowerCase()] || { total: 0, count: 0, lastDate: null, lastAmount: null, lastType: null };
              return (
                <button 
                  key={m.id} 
                  onClick={() => setSelectedMerchant(m)}
                  className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm group hover:shadow-xl hover:border-blue-200 transition-all text-left flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Store size={20} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {stats.count > 0 && (
                        <span className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black uppercase rounded-full border border-gray-100 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          {stats.count} Visits
                        </span>
                      )}
                      {stats.lastAmount !== null && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${stats.lastType === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                          Last: {stats.lastType === TransactionType.INCOME ? '+' : '-'}${stats.lastAmount.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight mb-2 group-hover:text-blue-600 transition-colors">{m.name}</h4>
                  {(m.location || m.website) ? (
                    <div className="mt-auto pt-4 border-t border-gray-50 space-y-2">
                       {m.location && (
                         <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold">
                           <MapPin size={12} /> {m.location}
                         </div>
                       )}
                       {m.website && (
                         <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold">
                           <Globe size={12} /> {m.website.replace(/^https?:\/\//, '').split('/')[0]}
                         </div>
                       )}
                    </div>
                  ) : (
                    <p className="mt-auto text-[10px] text-gray-300 font-bold uppercase tracking-widest pt-4 border-t border-gray-50 italic">No extra info</p>
                  )}
                </button>
              );
            })}
          </div>
          {sortedMerchants.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
               <Store size={40} className="mx-auto text-gray-200 mb-4" />
               <p className="text-gray-400 font-medium">{merchantSearch ? 'No payees matching your search.' : 'No payees recorded yet.'}</p>
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
