
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
  ChevronRight,
  Plus,
  Check,
  Target,
  Sigma
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
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [editType, setEditType] = useState<TransactionType>(TransactionType.BOTH);
  const [editLocation, setEditLocation] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  
  const [deletingItem, setDeletingItem] = useState<{ type: 'category' | 'merchant' | 'payment', data: any } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isAddingSubTo, setIsAddingSubTo] = useState<number | null>(null);
  const [newSubName, setNewSubName] = useState('');

  // Search and Sort states
  const [categorySearch, setCategorySearch] = useState('');
  const [categorySortKey, setCategorySortKey] = useState<'name' | 'type' | 'subCount' | 'spend'>('name');
  const [categorySortOrder, setCategorySortOrder] = useState<'asc' | 'desc'>('asc');

  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantSortKey, setMerchantSortKey] = useState<'name' | 'spend' | 'visits' | 'recent'>('name');
  const [merchantSortOrder, setMerchantSortOrder] = useState<'asc' | 'desc'>('asc');

  // STATS CALCULATIONS
  const categoryStatsMap = useMemo(() => {
    const stats: Record<string, number> = {};
    categories.forEach(cat => {
      const catTxs = transactions.filter(t => t.category.toLowerCase() === cat.name.toLowerCase());
      stats[cat.name.toLowerCase()] = catTxs.reduce((sum, t) => sum + t.amount, 0);
    });
    return stats;
  }, [categories, transactions]);

  const totalCategoriesSum = useMemo(() => Object.values(categoryStatsMap).reduce((sum, val) => sum + val, 0), [categoryStatsMap]);

  const merchantStatsMap = useMemo(() => {
    const stats: Record<string, { total: number; count: number; lastDate: string | null; lastAmount: number | null; lastType: TransactionType | null; categories: string[] }> = {};
    merchants.forEach(m => {
      const mNameLower = m.name.toLowerCase();
      const merchantTxs = transactions.filter(t => t.merchant?.toLowerCase() === mNameLower);
      const total = merchantTxs.reduce((sum, t) => sum + t.amount, 0);
      const count = merchantTxs.length;
      
      const sortedTxs = [...merchantTxs].sort((a, b) => b.date.localeCompare(a.date));
      const lastTx = sortedTxs[0];

      // Collect all unique categories used at this merchant
      const catSet = new Set<string>();
      merchantTxs.forEach(t => { if(t.category) catSet.add(t.category); });
      const relatedCategories = Array.from(catSet).sort();

      stats[mNameLower] = {
        total,
        count,
        lastDate: lastTx ? lastTx.date : null,
        lastAmount: lastTx ? lastTx.amount : null,
        lastType: lastTx ? lastTx.type : null,
        categories: relatedCategories.length > 0 ? relatedCategories : ['Uncategorized']
      };
    });
    return stats;
  }, [merchants, transactions]);

  const totalMerchantsSum = useMemo(() => Object.values(merchantStatsMap).reduce((sum, val) => sum + val.total, 0), [merchantStatsMap]);

  const paymentStatsMap = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};
    paymentMethods.forEach(p => {
      const pNameLower = p.name.toLowerCase();
      const pTxs = transactions.filter(t => t.paymentMethod?.toLowerCase() === pNameLower);
      stats[pNameLower] = {
        total: pTxs.reduce((sum, t) => sum + t.amount, 0),
        count: pTxs.length
      };
    });
    return stats;
  }, [paymentMethods, transactions]);

  const totalPaymentsSum = useMemo(() => Object.values(paymentStatsMap).reduce((sum, val) => sum + val.total, 0), [paymentStatsMap]);

  // AUTO-OPEN MERCHANT if navigated from List
  useEffect(() => {
    if (mode === 'merchants' && targetMerchantName) {
      const m = merchants.find(item => item.name.toLowerCase() === targetMerchantName.toLowerCase());
      if (m) setExpandedId(m.id || null);
      onClearTargetMerchant?.();
    }
  }, [mode, targetMerchantName, merchants, onClearTargetMerchant]);

  // SORTING LOGIC
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
      let comp = 0;
      if (categorySortKey === 'name') comp = a.name.localeCompare(b.name);
      else if (categorySortKey === 'type') comp = (a.type || '').localeCompare(b.type || '');
      else if (categorySortKey === 'subCount') comp = (a.subCategories?.length || 0) - (b.subCategories?.length || 0);
      else if (categorySortKey === 'spend') comp = (categoryStatsMap[a.name.toLowerCase()] || 0) - (categoryStatsMap[b.name.toLowerCase()] || 0);
      return categorySortOrder === 'asc' ? comp : -comp;
    });
  }, [categories, categorySearch, categorySortKey, categorySortOrder, categoryStatsMap]);

  const sortedMerchants = useMemo(() => {
    let filtered = merchants;
    if (merchantSearch.trim()) {
      const query = merchantSearch.toLowerCase();
      filtered = merchants.filter(m => m.name.toLowerCase().includes(query));
    }
    return [...filtered].sort((a, b) => {
      let comp = 0;
      const statsA = merchantStatsMap[a.name.toLowerCase()] || { total: 0, count: 0, lastDate: '', categories: [] };
      const statsB = merchantStatsMap[b.name.toLowerCase()] || { total: 0, count: 0, lastDate: '', categories: [] };
      if (merchantSortKey === 'name') comp = a.name.localeCompare(b.name);
      else if (merchantSortKey === 'spend') comp = statsA.total - statsB.total;
      else if (merchantSortKey === 'visits') comp = statsA.count - statsB.count;
      else if (merchantSortKey === 'recent') comp = (statsA.lastDate || '').localeCompare(statsB.lastDate || '');
      return merchantSortOrder === 'asc' ? comp : -comp;
    });
  }, [merchants, merchantSearch, merchantSortKey, merchantSortOrder, merchantStatsMap]);

  // HANDLERS
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
    if (editingItem.type === 'category') onUpdateCategory({ ...editingItem.data, name: editName.trim(), color: editColor, type: editType });
    else if (editingItem.type === 'merchant') onUpdateMerchant({ ...editingItem.data, name: editName.trim(), location: editLocation.trim(), website: editWebsite.trim() });
    else if (editingItem.type === 'payment') onUpdatePaymentMethod({ ...editingItem.data, name: editName.trim(), color: editColor });
    else if (editingItem.type === 'subCategory' && editingItem.catId) onRenameSubCategory(editingItem.catId, editingItem.data, editName.trim());
    setEditingItem(null);
  };

  const confirmDelete = () => {
    if (!deletingItem || !deletingItem.data.id) return;
    // Fix: Using deletingItem instead of non-existent deletingId
    if (deletingItem.type === 'category') onDeleteCategory(deletingItem.data.id);
    else if (deletingItem.type === 'merchant') onDeleteMerchant(deletingItem.data.id);
    else if (deletingItem.type === 'payment') onDeletePaymentMethod(deletingItem.data.id);
    setDeletingItem(null);
  };

  const handleAddInlineSub = (cat: Category) => {
    if (!newSubName.trim() || !cat.id) return;
    const subs = cat.subCategories || [];
    if (subs.includes(newSubName.trim())) { setIsAddingSubTo(null); setNewSubName(''); return; }
    onUpdateCategory({ ...cat, subCategories: [...subs, newSubName.trim()] });
    setNewSubName('');
    setIsAddingSubTo(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Universal Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
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
                <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
              </div>

              {editingItem.type === 'category' && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Type</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    {[TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.BOTH].map(t => (
                      <button key={t} onClick={() => setEditType(t)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${editType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>
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
                      <input placeholder="e.g. New York, NY" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Website</label>
                    <div className="relative">
                      <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input placeholder="e.g. https://example.com" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                    </div>
                  </div>
                </>
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-sm rounded-2xl p-8 text-center border border-gray-100 shadow-2xl">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black uppercase mb-2 text-gray-900">Delete {deletingItem.type}?</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-gray-800">"{deletingItem.data.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingItem(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORIES VIEW */}
      {mode === 'categories' && (
        <div className="space-y-4">
          <Header title="Categories" icon={Tags} addLabel="New Category" onAdd={() => onAddCategory({ name: 'New Category', type: TransactionType.EXPENSE })}
            searchValue={categorySearch} onSearchChange={setCategorySearch} sortKey={categorySortKey} onSortKeyChange={setCategorySortKey as any}
            sortOrder={categorySortOrder} onSortOrderChange={setCategorySortOrder}
            sortOptions={[{ value: 'name', label: 'Name' }, { value: 'spend', label: 'Percentage (%)' }, { value: 'type', label: 'Type' }, { value: 'subCount', label: 'Sub-Categories' }]}
          />
          <div className="flex flex-col gap-3">
            {sortedCategories.map(cat => {
              const isExp = expandedId === cat.id;
              const spend = categoryStatsMap[cat.name.toLowerCase()] || 0;
              const perc = totalCategoriesSum > 0 ? (spend / totalCategoriesSum) * 100 : 0;
              return (
                <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200">
                  <div onClick={() => setExpandedId(isExp ? null : cat.id || null)} className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors ${isExp ? 'bg-gray-50/30' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-black text-gray-900 text-sm uppercase tracking-tight truncate">{cat.name}</h4>
                        <div className="flex gap-1">
                          {(cat.type === TransactionType.EXPENSE || cat.type === TransactionType.BOTH) && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-rose-50 text-rose-500">Expense</span>}
                          {(cat.type === TransactionType.INCOME || cat.type === TransactionType.BOTH) && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-50 text-emerald-600">Income</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-widest">
                        <Layers size={10} /> {cat.subCategories?.length || 0} Sub-categories
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Percentage of Total</p>
                      <p className="text-sm font-black text-gray-900">{perc.toFixed(1)}%</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openEdit('category', cat); }} className="p-2 text-gray-400 hover:text-blue-600 rounded-xl"><Edit2 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeletingItem({ type: 'category', data: cat }); }} className="p-2 text-gray-400 hover:text-rose-600 rounded-xl"><Trash2 size={14} /></button>
                      <div className="ml-2 text-gray-300">{isExp ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>
                    </div>
                  </div>
                  {isExp && (
                    <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Defined Sub-categories</span></div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {cat.subCategories?.map(s => (
                          <div key={s} className="group/sub flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-200">
                            <span className="text-[11px] font-bold text-gray-700">{s}</span>
                            <div className="flex items-center gap-1 border-l pl-2 border-gray-100 opacity-0 group-hover/sub:opacity-100">
                              <button onClick={() => cat.id && openEditSubCategory(cat.id, s)} className="p-1 text-gray-400 hover:text-blue-500"><Edit2 size={10} /></button>
                              <button onClick={() => cat.id && onDeleteSubCategory(cat.id, s)} className="p-1 text-gray-400 hover:text-rose-500"><X size={10} /></button>
                            </div>
                          </div>
                        ))}
                        {isAddingSubTo === cat.id ? (
                          <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-xl px-2 py-1 shadow-md">
                            <input autoFocus value={newSubName} onChange={(e) => setNewSubName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddInlineSub(cat)} className="text-[11px] font-bold outline-none w-24" placeholder="Name..." />
                            <button onClick={() => handleAddInlineSub(cat)} className="p-1 text-blue-500"><Check size={12} /></button>
                            <button onClick={() => setIsAddingSubTo(null)} className="p-1 text-gray-400"><X size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => { setIsAddingSubTo(cat.id || null); setNewSubName(''); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"><Plus size={12} /> New Sub</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MERCHANTS VIEW */}
      {mode === 'merchants' && (
        <div className="space-y-4">
          <Header title="Payees & Merchants" icon={Store} addLabel="New Payee" onAdd={() => onAddMerchant({ name: 'New Merchant' })}
            searchValue={merchantSearch} onSearchChange={setMerchantSearch} sortKey={merchantSortKey} onSortKeyChange={setMerchantSortKey as any}
            sortOrder={merchantSortOrder} onSortOrderChange={setMerchantSortOrder}
            sortOptions={[{ value: 'name', label: 'Name' }, { value: 'spend', label: 'Percentage (%)' }, { value: 'visits', label: 'Visits' }, { value: 'recent', label: 'Recently Used' }]}
          />
          <div className="flex flex-col gap-3">
            {sortedMerchants.map(m => {
              const isExp = expandedId === m.id;
              const stats = merchantStatsMap[m.name.toLowerCase()] || { total: 0, count: 0, lastDate: null, categories: [] };
              const perc = totalMerchantsSum > 0 ? (stats.total / totalMerchantsSum) * 100 : 0;
              return (
                <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200">
                  <div onClick={() => setExpandedId(isExp ? null : m.id || null)} className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors ${isExp ? 'bg-gray-50/30' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-gray-900 text-sm uppercase tracking-tight truncate mb-0.5">{m.name}</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {stats.categories.map(catName => (
                          <span key={catName} className="text-[9px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-widest">
                            <Target size={8} className="text-blue-500" /> {catName}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Percentage of Total Spend</p>
                      <p className="text-sm font-black text-gray-900">{perc.toFixed(1)}%</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openEdit('merchant', m); }} className="p-2 text-gray-400 hover:text-blue-600 rounded-xl"><Edit2 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeletingItem({ type: 'merchant', data: m }); }} className="p-2 text-gray-400 hover:text-rose-600 rounded-xl"><Trash2 size={14} /></button>
                      <div className="ml-2 text-gray-300">{isExp ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>
                    </div>
                  </div>
                  {isExp && (
                    <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Visit Count</p>
                           <h5 className="font-black text-gray-900 flex items-center gap-2"><Hash size={12} className="text-blue-500" /> {stats.count}</h5>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Average Spend</p>
                           <h5 className="font-black text-gray-900">${stats.count > 0 ? (stats.total / stats.count).toFixed(0) : 0}</h5>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Location</p>
                           <h5 className="font-black text-gray-900 truncate flex items-center gap-2"><MapPin size={12} className="text-rose-500" /> {m.location || 'Unknown'}</h5>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Website</p>
                           {m.website ? (
                             <a href={m.website} target="_blank" rel="noreferrer" className="font-black text-blue-600 hover:underline truncate flex items-center gap-2"><Globe size={12} /> Visit Site</a>
                           ) : <h5 className="font-bold text-gray-300">N/A</h5>}
                        </div>
                      </div>
                      <button onClick={() => onViewMerchantTransactions?.(m.name)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">
                        <ListOrdered size={14} /> View Merchant Transactions
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PAYMENT METHODS VIEW */}
      {mode === 'payments' && (
        <div className="space-y-4">
          <Header title="Payment Methods" icon={CreditCard} addLabel="New Method" onAdd={() => onAddPaymentMethod({ name: 'New Payment Method', color: '#3B82F6' })} />
          <div className="flex flex-col gap-3">
            {paymentMethods.map(p => {
              const isExp = expandedId === p.id;
              const stats = paymentStatsMap[p.name.toLowerCase()] || { total: 0, count: 0 };
              const perc = totalPaymentsSum > 0 ? (stats.total / totalPaymentsSum) * 100 : 0;
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200">
                  <div onClick={() => setExpandedId(isExp ? null : p.id || null)} className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors ${isExp ? 'bg-gray-50/30' : ''}`}>
                    <div className="flex-1 min-w-0 flex items-center gap-4">
                      <div>
                        <h4 className="font-black text-gray-900 text-sm uppercase tracking-tight truncate mb-0.5">{p.name}</h4>
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-widest">
                          <CreditCard size={10} className="text-gray-400" /> Linked with {stats.count} transactions
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Percentage of Total Volume</p>
                      <p className="text-sm font-black text-gray-900">{perc.toFixed(1)}%</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openEdit('payment', p); }} className="p-2 text-gray-400 hover:text-blue-600 rounded-xl"><Edit2 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeletingItem({ type: 'payment', data: p }); }} className="p-2 text-gray-400 hover:text-rose-600 rounded-xl"><Trash2 size={14} /></button>
                      <div className="ml-2 text-gray-300">{isExp ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>
                    </div>
                  </div>
                  {isExp && (
                    <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                         <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Records</p>
                            <h5 className="font-black text-gray-900 flex items-center gap-2"><Hash size={12} className="text-blue-500" /> {stats.count}</h5>
                         </div>
                         <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Volume</p>
                            <h5 className="font-black text-gray-900 flex items-center gap-2"><Sigma size={12} className="text-emerald-500" /> ${stats.total.toLocaleString()}</h5>
                         </div>
                         <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Average Tx</p>
                            <h5 className="font-black text-gray-900 flex items-center gap-2"><Calculator size={12} className="text-indigo-500" /> ${stats.count > 0 ? (stats.total / stats.count).toFixed(2) : '0.00'}</h5>
                         </div>
                         <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Method ID</p>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                              <h5 className="font-mono text-[10px] font-bold text-gray-400 uppercase">{p.color}</h5>
                            </div>
                         </div>
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BACKUPS VIEW */}
      {mode === 'backups' && (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-xl max-w-2xl text-center mx-auto mt-10">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Database size={40} />
          </div>
          <h3 className="text-2xl font-black uppercase mb-3 tracking-tight text-gray-900">System Backup & Recovery</h3>
          <p className="text-gray-500 text-sm mb-10 leading-relaxed px-10">
            Export your history as a secure JSON file. Restoration will overwrite your current local database.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={onExport} className="py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all">
              <Download size={18}/> Export Dataset
            </button>
            <button onClick={() => document.getElementById('import-file')?.click()} className="py-4 border-2 border-dashed border-gray-200 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:border-blue-300 hover:text-blue-600 transition-all text-gray-500">
              <Upload size={18}/> Restore Dataset
            </button>
            <input id="import-file" type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Management;

const Layers = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);
