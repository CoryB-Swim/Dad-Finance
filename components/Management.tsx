
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
  Phone,
  Hash,
  Calculator,
  ExternalLink,
  ListOrdered,
  SortAsc,
  SortDesc,
  ChevronDown,
  Plus,
  Check,
  Target,
  Sigma,
  Info,
  Calendar,
  Layers,
  Tag
} from 'lucide-react';

interface HeaderProps {
  title: string;
  icon: any;
  onAdd: () => void;
  addLabel: string;
  buttonColor: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
}

const ManagementHeader = ({ 
  title, 
  icon: Icon, 
  onAdd, 
  addLabel, 
  buttonColor,
  searchValue, 
  onSearchChange, 
  searchPlaceholder
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
        style={{ backgroundColor: buttonColor }}
        className="text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={16} /> {addLabel}
      </button>
    </div>

    <div className="flex flex-col md:flex-row gap-4">
      {onSearchChange && (
        <div className="relative group flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
            <Search size={16} />
          </div>
          <input 
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-11 pr-10 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all placeholder-gray-300 text-gray-900"
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
  const [editingItem, setEditingItem] = useState<{ type: 'category' | 'merchant' | 'payment' | 'subCategory', data: any, catId?: number } | null>(null);
  const [viewingItem, setViewingItem] = useState<{ type: 'category' | 'merchant' | 'payment', id: number } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'category' | 'merchant' | 'payment', id: number, name: string } | null>(null);

  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [editType, setEditType] = useState<TransactionType>(TransactionType.BOTH);
  const [editLocation, setEditLocation] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editPhone, setEditPhone] = useState('');
  
  const [newSubName, setNewSubName] = useState('');
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [renamingSub, setRenamingSub] = useState<{ originalName: string, currentName: string } | null>(null);

  // Search & Sort States
  const [searchValue, setSearchValue] = useState('');
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const activeViewingData = useMemo(() => {
    if (!viewingItem) return null;
    if (viewingItem.type === 'category') return categories.find(c => c.id === viewingItem.id);
    if (viewingItem.type === 'merchant') return merchants.find(m => m.id === viewingItem.id);
    if (viewingItem.type === 'payment') return paymentMethods.find(p => p.id === viewingItem.id);
    return null;
  }, [viewingItem, categories, merchants, paymentMethods]);

  useEffect(() => {
    if (mode === 'merchants' && targetMerchantName) {
      const m = merchants.find(merch => merch.name.toLowerCase() === targetMerchantName.toLowerCase());
      if (m && m.id) {
        setViewingItem({ type: 'merchant', id: m.id });
        onClearTargetMerchant?.();
      }
    }
  }, [mode, targetMerchantName, merchants, onClearTargetMerchant]);

  const categoryStatsMap = useMemo(() => {
    const stats: Record<string, number> = {};
    categories.forEach(cat => {
      const catTxs = transactions.filter(t => t.category.toLowerCase() === cat.name.toLowerCase());
      stats[cat.name.toLowerCase()] = catTxs.reduce((sum, t) => sum + t.amount, 0);
    });
    return stats;
  }, [categories, transactions]);

  // Fix: Explicitly type parameters in reduce to ensure correct arithmetic operation
  const totalCategoriesSum = useMemo(() => Object.values(categoryStatsMap).reduce((sum: number, val: number) => sum + val, 0), [categoryStatsMap]);

  const merchantStatsMap = useMemo(() => {
    const stats: Record<string, { total: number; count: number; lastDate: string | null }> = {};
    merchants.forEach(m => {
      const mNameLower = m.name.toLowerCase();
      const merchantTxs = transactions.filter(t => t.merchant?.toLowerCase() === mNameLower);
      const total = merchantTxs.reduce((sum, t) => sum + t.amount, 0);
      const count = merchantTxs.length;
      const sortedTxs = [...merchantTxs].sort((a, b) => b.date.localeCompare(a.date));
      stats[mNameLower] = { total, count, lastDate: sortedTxs[0]?.date || null };
    });
    return stats;
  }, [merchants, transactions]);

  // Fix: Explicitly type parameters in reduce
  const totalMerchantsSum = useMemo(() => Object.values(merchantStatsMap).reduce((sum: number, val: any) => sum + val.total, 0), [merchantStatsMap]);

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

  // Fix: Explicitly type accumulator in reduce and typecast val to any for property access
  const totalPaymentsSum = useMemo(() => Object.values(paymentStatsMap).reduce((sum: number, val: any) => sum + val.total, 0), [paymentStatsMap]);

  const filteredAndSortedItems = useMemo(() => {
    let baseItems: any[] = [];
    if (mode === 'categories') baseItems = categories;
    else if (mode === 'merchants') baseItems = merchants;
    else if (mode === 'payments') baseItems = paymentMethods;

    let result = baseItems;
    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      result = baseItems.filter(item => item.name.toLowerCase().includes(query));
    }

    return [...result].sort((a, b) => {
      let valA: any, valB: any;
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      if (sortKey === 'name') {
        valA = nameA; valB = nameB;
      } else if (sortKey === 'spend' || sortKey === 'volume') {
        if (mode === 'categories') { valA = categoryStatsMap[nameA] || 0; valB = categoryStatsMap[nameB] || 0; }
        else if (mode === 'merchants') { valA = (merchantStatsMap[nameA] as any)?.total || 0; valB = (merchantStatsMap[nameB] as any)?.total || 0; }
        // Fix: Cast access to any to handle unknown properties on potentially missing keys
        else { valA = (paymentStatsMap[nameA] as any)?.total || 0; valB = (paymentStatsMap[nameB] as any)?.total || 0; }
      } else if (sortKey === 'count') {
        if (mode === 'categories') { valA = a.subCategories?.length || 0; valB = b.subCategories?.length || 0; }
        else if (mode === 'merchants') { valA = (merchantStatsMap[nameA] as any)?.count || 0; valB = (merchantStatsMap[nameB] as any)?.count || 0; }
        // Fix: Cast access to any to handle unknown properties on potentially missing keys
        else { valA = (paymentStatsMap[nameA] as any)?.count || 0; valB = (paymentStatsMap[nameB] as any)?.count || 0; }
      } else if (sortKey === 'type') {
        valA = a.type || '';
        valB = b.type || '';
      } else if (sortKey === 'lastVisit') {
        valA = (merchantStatsMap[nameA] as any)?.lastDate || '';
        valB = (merchantStatsMap[nameB] as any)?.lastDate || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [mode, categories, merchants, paymentMethods, searchValue, sortKey, sortOrder, categoryStatsMap, merchantStatsMap, paymentStatsMap]);

  const handleSort = (key: string) => {
    setSortOrder(prev => (sortKey === key && prev === 'asc' ? 'desc' : 'asc'));
    setSortKey(key);
  };

  const SortIndicator = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return <SortAsc size={10} className="ml-1 opacity-20" />;
    return sortOrder === 'asc' ? <SortAsc size={10} className="ml-1 text-blue-600" /> : <SortDesc size={10} className="ml-1 text-blue-600" />;
  };

  const handleAddNew = () => {
    if (mode === 'categories') {
      setEditingItem({ type: 'category', data: { name: '', type: TransactionType.EXPENSE, subCategories: [] } });
      setEditName('');
      setEditType(TransactionType.EXPENSE);
    } else if (mode === 'merchants') {
      setEditingItem({ type: 'merchant', data: { name: '' } });
      setEditName('');
      setEditLocation('');
      setEditWebsite('');
      setEditPhone('');
    } else if (mode === 'payments') {
      setEditingItem({ type: 'payment', data: { name: '', color: '#3B82F6' } });
      setEditName('');
      setEditColor('#3B82F6');
    }
  };

  const openEdit = (type: 'category' | 'merchant' | 'payment', item: any) => {
    setEditingItem({ type, data: item });
    setEditName(item.name);
    if (type === 'payment' || type === 'category') setEditColor(item.color || '#3B82F6');
    if (type === 'category') setEditType(item.type);
    if (type === 'merchant') {
      setEditLocation(item.location || '');
      setEditWebsite(item.website || '');
      setEditPhone(item.phone || '');
    }
  };

  const handleSave = () => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    
    const isNew = editingItem?.data.id === undefined;

    if (editingItem?.type === 'category') {
      if (isNew) onAddCategory({ name: trimmedName, color: editColor, type: editType, subCategories: [] });
      else onUpdateCategory({ ...editingItem.data, name: trimmedName, color: editColor, type: editType });
    }
    else if (editingItem?.type === 'merchant') {
      if (isNew) onAddMerchant({ name: trimmedName, location: editLocation.trim(), website: editWebsite.trim(), phone: editPhone.trim() });
      else onUpdateMerchant({ ...editingItem.data, name: trimmedName, location: editLocation.trim(), website: editWebsite.trim(), phone: editPhone.trim() });
    }
    else if (editingItem?.type === 'payment') {
      if (isNew) onAddPaymentMethod({ name: trimmedName, color: editColor });
      else onUpdatePaymentMethod({ ...editingItem.data, name: trimmedName, color: editColor });
    }
    else if (editingItem?.type === 'subCategory' && editingItem.catId) {
      onRenameSubCategory(editingItem.catId, editingItem.data, trimmedName);
    }
    setEditingItem(null);
  };

  const confirmDelete = () => {
    if (!deletingItem || !deletingItem.id) return;
    if (deletingItem.type === 'category') onDeleteCategory(deletingItem.id);
    else if (deletingItem.type === 'merchant') onDeleteMerchant(deletingItem.id);
    else if (deletingItem.type === 'payment') onDeletePaymentMethod(deletingItem.id);
    setDeletingItem(null);
  };

  const handleAddSub = () => {
    const trimmed = newSubName.trim();
    if (!trimmed || viewingItem?.type !== 'category') return;
    
    const cat = categories.find(c => c.id === viewingItem.id);
    if (!cat) return;

    const subs = cat.subCategories || [];
    if (subs.includes(trimmed)) { 
      setNewSubName('');
      setIsAddingSub(false);
      return; 
    }
    
    onUpdateCategory({ ...cat, subCategories: [...subs, trimmed] });
    setNewSubName('');
    setIsAddingSub(false);
  };

  const handleFinishRenameSub = () => {
    if (!renamingSub || !viewingItem?.id) return;
    const trimmed = renamingSub.currentName.trim();
    if (trimmed && trimmed !== renamingSub.originalName) {
      onRenameSubCategory(viewingItem.id, renamingSub.originalName, trimmed);
    }
    setRenamingSub(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Detail Modal */}
      {viewingItem && activeViewingData && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4" onClick={() => setViewingItem(null)}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className={`p-6 flex items-center justify-between border-b border-gray-100 ${
              viewingItem.type === 'category' ? 'bg-purple-50' : 
              viewingItem.type === 'merchant' ? 'bg-teal-50' : 
              'bg-orange-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  viewingItem.type === 'category' ? 'bg-purple-100 text-purple-600' : 
                  viewingItem.type === 'merchant' ? 'bg-teal-100 text-teal-600' : 
                  'bg-orange-100 text-orange-600'
                }`}>
                  <Info size={20} />
                </div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">{viewingItem.type.charAt(0).toUpperCase() + viewingItem.type.slice(1)} Profile</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { openEdit(viewingItem.type, activeViewingData); setViewingItem(null); }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => setViewingItem(null)}
                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-8 space-y-8 text-gray-900">
              <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Entity Name</p>
                <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tight">{activeViewingData.name}</h2>
              </div>

              {viewingItem.type === 'category' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Flow Type</p>
                      <p className="text-sm font-black text-blue-600 uppercase tracking-tight">{(activeViewingData as Category).type || 'BOTH'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Volume</p>
                      <p className="text-sm font-black text-gray-900">${(categoryStatsMap[activeViewingData.name.toLowerCase()] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Layers size={10} /> Sub-Categories</p>
                      {!isAddingSub && (
                        <button 
                          onClick={() => setIsAddingSub(true)} 
                          className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[9px] font-black uppercase transition-all"
                        >
                          <Plus size={12} /> Add New
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(activeViewingData as Category).subCategories?.map((s: string) => (
                        <span key={s} className="group px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold text-gray-700 flex items-center gap-2 hover:bg-white hover:shadow-sm transition-all">
                          {renamingSub?.originalName === s ? (
                            <div className="flex items-center gap-1">
                              <input 
                                autoFocus
                                value={renamingSub.currentName}
                                onChange={(e) => setRenamingSub({ ...renamingSub, currentName: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleFinishRenameSub()}
                                onBlur={handleFinishRenameSub}
                                className="bg-white border border-gray-200 px-2 py-0.5 rounded outline-none text-[11px] font-bold text-blue-600 w-24"
                              />
                              <button onClick={handleFinishRenameSub} className="text-emerald-500"><Check size={12}/></button>
                            </div>
                          ) : (
                            <>
                              {s}
                              <div className="flex items-center gap-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setRenamingSub({ originalName: s, currentName: s }); }} 
                                  className="text-gray-400 hover:text-blue-600"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); activeViewingData.id && onDeleteSubCategory(activeViewingData.id, s); }} 
                                  className="text-gray-400 hover:text-rose-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </span>
                      ))}
                      {(activeViewingData as Category).subCategories?.length === 0 && !isAddingSub && (
                        <p className="text-[10px] font-medium text-gray-300 italic py-2">No sub-categories defined yet.</p>
                      )}
                      {isAddingSub && (
                        <div className="flex items-center gap-1 bg-white border-2 border-blue-100 rounded-xl px-2.5 py-1.5 shadow-md animate-in slide-in-from-left-1">
                          <input 
                            autoFocus 
                            value={newSubName} 
                            onChange={(e) => setNewSubName(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSub()} 
                            onBlur={() => !newSubName.trim() && setIsAddingSub(false)}
                            className="text-[11px] font-bold outline-none w-32 bg-white text-gray-900 placeholder:text-gray-300" 
                            placeholder="Enter name..." 
                          />
                          <button onClick={handleAddSub} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check size={14} /></button>
                          <button onClick={() => { setIsAddingSub(false); setNewSubName(''); }} className="p-1 text-gray-400 hover:bg-gray-50 rounded-lg"><X size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {viewingItem.type === 'merchant' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Visits</p>
                      <p className="text-sm font-black text-gray-900">{(merchantStatsMap[activeViewingData.name.toLowerCase()] as any)?.count || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Seen</p>
                      <p className="text-sm font-black text-gray-900">{(merchantStatsMap[activeViewingData.name.toLowerCase()] as any)?.lastDate || 'Never'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <MapPin size={16} className="text-rose-500" /> {(activeViewingData as Merchant).location || 'No location set'}
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <Phone size={16} className="text-emerald-500" /> {(activeViewingData as Merchant).phone || 'No phone set'}
                    </div>
                    {(activeViewingData as Merchant).website && (
                      <a href={(activeViewingData as Merchant).website} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm font-black text-blue-600 hover:underline">
                        <Globe size={16} /> Website <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <button 
                    onClick={() => { onViewMerchantTransactions?.(activeViewingData.name); setViewingItem(null); }}
                    className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                  >
                    <ListOrdered size={14} /> View History
                  </button>
                </div>
              )}

              {viewingItem.type === 'payment' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Volume</p>
                    <h5 className="text-xl font-black text-emerald-600">${(paymentStatsMap[activeViewingData.name.toLowerCase()]?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h5>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Frequency</p>
                    <h5 className="text-xl font-black text-blue-600">{paymentStatsMap[activeViewingData.name.toLowerCase()]?.count || 0} Transactions</h5>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={() => { setDeletingItem({ type: viewingItem.type, id: activeViewingData.id!, name: activeViewingData.name }); setViewingItem(null); }}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-rose-700 transition-all active:scale-[0.98]"
                >
                  <Trash2 size={14} /> Delete {viewingItem.type}
                </button>
                <button 
                  onClick={() => setViewingItem(null)}
                  className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all active:scale-[0.98]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Edit Modal */}
      {editingItem && editingItem.type !== 'subCategory' && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setEditingItem(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 uppercase tracking-tight text-xs flex items-center gap-2">
                <Edit2 size={14} /> {editingItem.data.id === undefined ? 'Add New' : 'Edit'} {editingItem.type}
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
                  placeholder="Required..."
                  className={`w-full px-4 py-3 bg-white border ${!editName.trim() ? 'border-rose-200' : 'border-gray-200'} rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all`} 
                />
                {!editName.trim() && <p className="text-[9px] font-bold text-rose-400 mt-1.5 ml-1 uppercase">Field is required</p>}
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
                      <input placeholder="e.g. New York, NY" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Contact Phone</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input placeholder="e.g. +1 (555) 000-0000" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">Website</label>
                    <div className="relative">
                      <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input placeholder="e.g. https://example.com" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-3 font-black uppercase text-[10px] tracking-widest text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
              <button 
                onClick={handleSave} 
                disabled={!editName.trim()}
                className={`flex-1 py-3 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-50 transition-all ${!editName.trim() ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingItem && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-8 text-center border border-gray-100 shadow-2xl">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black uppercase mb-2 text-gray-900">Delete {deletingItem.type}?</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-gray-800">"{deletingItem.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingItem(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Views */}
      {mode === 'categories' && (
        <div className="space-y-4">
          <ManagementHeader title="Categories" icon={Tags} addLabel="ADD NEW" buttonColor="#7C3AED" onAdd={handleAddNew}
            searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search categories..."
          />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center">Category Name <SortIndicator columnKey="name" /></div>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('type')}>
                      <div className="flex items-center">Type <SortIndicator columnKey="type" /></div>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('count')}>
                      <div className="flex items-center">Sub-Categories <SortIndicator columnKey="count" /></div>
                    </th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('spend')}>
                      <div className="flex items-center justify-end">Total Volume <SortIndicator columnKey="spend" /></div>
                    </th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('spend')}>
                      <div className="flex items-center justify-end">Percentage (%) <SortIndicator columnKey="spend" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAndSortedItems.map(cat => {
                    const spend = categoryStatsMap[cat.name.toLowerCase()] || 0;
                    const perc = totalCategoriesSum > 0 ? (spend / totalCategoriesSum) * 100 : 0;
                    return (
                      <tr key={cat.id} className="hover:bg-blue-50/20 group transition-colors cursor-pointer" onClick={() => setViewingItem({ type: 'category', id: cat.id! })}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Tag size={14} style={{ color: '#7C3AED' }} />
                            <span className="font-black text-gray-900 uppercase tracking-tight text-xs">{cat.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${cat.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{cat.type || 'EXPENSE'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{cat.subCategories?.length || 0} Units</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-black text-gray-900">${spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded">{perc.toFixed(1)}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {mode === 'merchants' && (
        <div className="space-y-4">
          <ManagementHeader title="Payees & Merchants" icon={Store} addLabel="ADD NEW" buttonColor="#0D9488" onAdd={handleAddNew}
            searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search merchants..."
          />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center">Payee Name <SortIndicator columnKey="name" /></div>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('count')}>
                      <div className="flex items-center">Visit Count <SortIndicator columnKey="count" /></div>
                    </th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('spend')}>
                      <div className="flex items-center justify-end">Total Spend <SortIndicator columnKey="spend" /></div>
                    </th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('spend')}>
                      <div className="flex items-center justify-end">Weight (%) <SortIndicator columnKey="spend" /></div>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('lastVisit')}>
                      <div className="flex items-center">Last Visit <SortIndicator columnKey="lastVisit" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAndSortedItems.map(m => {
                    const stats = (merchantStatsMap[m.name.toLowerCase()] as any) || { total: 0, count: 0, lastDate: null };
                    const perc = totalMerchantsSum > 0 ? (stats.total / totalMerchantsSum) * 100 : 0;
                    return (
                      <tr key={m.id} className="hover:bg-blue-50/20 group transition-colors cursor-pointer" onClick={() => setViewingItem({ type: 'merchant', id: m.id! })}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Store size={14} style={{ color: '#0D9488' }} />
                            <span className="font-black text-gray-900 uppercase tracking-tight text-xs">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stats.count} Visits</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-black text-gray-900">${stats.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded">{perc.toFixed(1)}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{stats.lastDate || '-'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {mode === 'payments' && (
        <div className="space-y-4">
          <ManagementHeader title="Payment Methods" icon={CreditCard} addLabel="ADD NEW" buttonColor="#EA580C" onAdd={handleAddNew}
            searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search payment methods..."
          />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center">Method Name <SortIndicator columnKey="name" /></div>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('count')}>
                      <div className="flex items-center">Transaction Count <SortIndicator columnKey="count" /></div>
                    </th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('spend')}>
                      <div className="flex items-center justify-end">Total Volume <SortIndicator columnKey="spend" /></div>
                    </th>
                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('spend')}>
                      <div className="flex items-center justify-end">Volume Share (%) <SortIndicator columnKey="spend" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAndSortedItems.map(p => {
                    const stats = paymentStatsMap[p.name.toLowerCase()] || { total: 0, count: 0 };
                    const perc = totalPaymentsSum > 0 ? (stats.total / totalPaymentsSum) * 100 : 0;
                    return (
                      <tr key={p.id} className="hover:bg-blue-50/20 group transition-colors cursor-pointer" onClick={() => setViewingItem({ type: 'payment', id: p.id! })}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <CreditCard size={14} style={{ color: '#EA580C' }} />
                            <span className="font-black text-gray-900 uppercase tracking-tight text-xs">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stats.count} Records</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-black text-gray-900">${stats.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded">{perc.toFixed(1)}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
