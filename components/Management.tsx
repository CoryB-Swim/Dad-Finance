import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Tag,
  GitMerge,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  ArrowRightLeft
} from 'lucide-react';

interface HeaderProps {
  title: string;
  icon: any;
  onAdd?: () => void;
  addLabel?: string;
  buttonColor?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  selectionCount?: number;
  onMerge?: () => void;
}

const ManagementHeader = ({ 
  title, 
  icon: Icon, 
  onAdd, 
  addLabel, 
  buttonColor,
  searchValue, 
  onSearchChange, 
  searchPlaceholder,
  selectionCount = 0,
  onMerge
}: HeaderProps) => (
  <div className="flex flex-col gap-6 mb-8">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 text-blue-600">
          <Icon size={20} />
        </div>
        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{title}</h3>
      </div>
      <div className="flex items-center gap-3">
        {selectionCount > 1 && onMerge && (
          <button 
            onClick={onMerge}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <GitMerge size={16} /> Merge {selectionCount} Selected
          </button>
        )}
        {onAdd && (
          <button 
            onClick={onAdd}
            style={{ backgroundColor: buttonColor }}
            className="text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> {addLabel}
          </button>
        )}
      </div>
    </div>

    {onSearchChange && (
      <div className="flex flex-col md:flex-row gap-4">
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
      </div>
    )}
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
  onMergeCategories?: (sourceNames: string[], targetCategory: Category, sourceIds: number[]) => void;
  onMoveSubCategory?: (subName: string, sourceCatId: number, targetCatName: string) => void;
  merchants: Merchant[];
  onAddMerchant: (v: Merchant) => void;
  onUpdateMerchant: (v: Merchant) => void;
  onDeleteMerchant: (id: number) => void;
  onMergeMerchants?: (sourceNames: string[], targetName: string, sourceIds: number[]) => void;
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
  onMergeCategories,
  onMoveSubCategory,
  merchants,
  onAddMerchant,
  onUpdateMerchant,
  onDeleteMerchant,
  onMergeMerchants,
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
  const [mergingItem, setMergingItem] = useState<{ ids: number[], targetId?: number, type: 'merchant' | 'category' } | null>(null);
  const [isConfirmingMerge, setIsConfirmingMerge] = useState(false);

  // Move Sub-category state
  const [movingSubInfo, setMovingSubInfo] = useState<{ catId: number, subName: string } | null>(null);
  const [targetMoveCatName, setTargetMoveCatName] = useState('');

  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [editType, setEditType] = useState<TransactionType>(TransactionType.BOTH);
  const [editLocation, setEditLocation] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editPhone, setEditPhone] = useState('');
  
  const [newSubName, setNewSubName] = useState('');
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [renamingSub, setRenamingSub] = useState<{ originalName: string, currentName: string } | null>(null);

  const [searchValue, setSearchValue] = useState('');
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeViewingData = useMemo(() => {
    if (!viewingItem) return null;
    if (viewingItem.type === 'category') return categories.find(c => c.id === viewingItem.id);
    if (viewingItem.type === 'merchant') return merchants.find(m => m.id === viewingItem.id);
    if (viewingItem.type === 'payment') return paymentMethods.find(p => p.id === viewingItem.id);
    return null;
  }, [viewingItem, categories, merchants, paymentMethods]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSearchValue('');
  }, [mode]);

  const categoryStatsMap = useMemo(() => {
    const stats: Record<string, number> = {};
    categories.forEach(cat => {
      const catTxs = transactions.filter(t => t.category.toLowerCase() === cat.name.toLowerCase());
      stats[cat.name.toLowerCase()] = catTxs.reduce((sum, t) => sum + t.amount, 0);
    });
    return stats;
  }, [categories, transactions]);

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

  const filteredAndSortedItems = useMemo(() => {
    let baseItems: any[] = [];
    if (mode === 'categories') baseItems = categories;
    else if (mode === 'merchants') baseItems = merchants;
    else if (mode === 'payments') baseItems = paymentMethods;
    else return [];

    let result = baseItems;
    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      result = baseItems.filter(item => item.name.toLowerCase().includes(query));
    }
    return [...result].sort((a, b) => {
      let valA: any, valB: any;
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (sortKey === 'name') { valA = nameA; valB = nameB; }
      else if (sortKey === 'spend' || sortKey === 'volume') {
        if (mode === 'categories') { valA = categoryStatsMap[nameA] || 0; valB = categoryStatsMap[nameB] || 0; }
        else if (mode === 'merchants') { valA = merchantStatsMap[nameA]?.total || 0; valB = merchantStatsMap[nameB]?.total || 0; }
        else { valA = paymentStatsMap[nameA]?.total || 0; valB = paymentStatsMap[nameB]?.total || 0; }
      } else if (sortKey === 'count') {
        if (mode === 'categories') { valA = a.subCategories?.length || 0; valB = b.subCategories?.length || 0; }
        else if (mode === 'merchants') { valA = merchantStatsMap[nameA]?.count || 0; valB = merchantStatsMap[nameB]?.count || 0; }
        else { valA = paymentStatsMap[nameA]?.count || 0; valB = paymentStatsMap[nameB]?.count || 0; }
      } else if (sortKey === 'type') { valA = a.type || ''; valB = b.type || ''; }
      else if (sortKey === 'lastVisit') { valA = merchantStatsMap[nameA]?.lastDate || ''; valB = merchantStatsMap[nameB]?.lastDate || ''; }
      
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
      setEditName(''); setEditType(TransactionType.EXPENSE);
    } else if (mode === 'merchants') {
      setEditingItem({ type: 'merchant', data: { name: '' } });
      setEditName(''); setEditLocation(''); setEditWebsite(''); setEditPhone('');
    } else if (mode === 'payments') {
      setEditingItem({ type: 'payment', data: { name: '', color: '#3B82F6' } });
      setEditName(''); setEditColor('#3B82F6');
    }
  };

  const openEdit = (type: 'category' | 'merchant' | 'payment', item: any) => {
    setEditingItem({ type, data: item });
    setEditName(item.name);
    if (type === 'payment' || type === 'category') setEditColor(item.color || '#3B82F6');
    if (type === 'category') setEditType(item.type);
    if (type === 'merchant') {
      setEditLocation(item.location || ''); setEditWebsite(item.website || ''); setEditPhone(item.phone || '');
    }
  };

  const handleSave = () => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    const isNew = editingItem?.data.id === undefined;
    if (editingItem?.type === 'category') {
      if (isNew) onAddCategory({ name: trimmedName, color: editColor, type: editType, subCategories: [] });
      else onUpdateCategory({ ...editingItem.data, name: trimmedName, color: editColor, type: editType });
    } else if (editingItem?.type === 'merchant') {
      if (isNew) onAddMerchant({ name: trimmedName, location: editLocation.trim(), website: editWebsite.trim(), phone: editPhone.trim() });
      else onUpdateMerchant({ ...editingItem.data, name: trimmedName, location: editLocation.trim(), website: editWebsite.trim(), phone: editPhone.trim() });
    } else if (editingItem?.type === 'payment') {
      if (isNew) onAddPaymentMethod({ name: trimmedName, color: editColor });
      else onUpdatePaymentMethod({ ...editingItem.data, name: trimmedName, color: editColor });
    } else if (editingItem?.type === 'subCategory' && editingItem.catId) {
      onRenameSubCategory(editingItem.catId, editingItem.data, trimmedName);
    }
    setEditingItem(null);
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirmMerge = () => {
    if (!mergingItem || !mergingItem.targetId) return;
    if (mergingItem.type === 'merchant' && onMergeMerchants) {
      const targetMerchant = merchants.find(m => m.id === mergingItem.targetId);
      if (!targetMerchant) return;
      const sourceMerchants = merchants.filter(m => mergingItem.ids.includes(m.id!) && m.id !== targetMerchant.id);
      onMergeMerchants(sourceMerchants.map(m => m.name), targetMerchant.name, sourceMerchants.map(m => m.id!));
    } else if (mergingItem.type === 'category' && onMergeCategories) {
      const targetCategory = categories.find(c => c.id === mergingItem.targetId);
      if (!targetCategory) return;
      const sourceCategories = categories.filter(c => mergingItem.ids.includes(c.id!) && c.id !== targetCategory.id);
      const combinedSubs = new Set(targetCategory.subCategories || []);
      sourceCategories.forEach(c => c.subCategories?.forEach(s => combinedSubs.add(s)));
      const updatedTarget = { ...targetCategory, subCategories: Array.from(combinedSubs) };
      onMergeCategories(sourceCategories.map(c => c.name), updatedTarget, sourceCategories.map(c => c.id!));
    }
    setMergingItem(null);
    setIsConfirmingMerge(false);
    setSelectedIds(new Set());
  };

  const handleMoveSubCategoryExecute = () => {
    if (!movingSubInfo || !targetMoveCatName || !onMoveSubCategory) return;
    onMoveSubCategory(movingSubInfo.subName, movingSubInfo.catId, targetMoveCatName);
    setMovingSubInfo(null);
    setTargetMoveCatName('');
  };

  const handleAddSub = () => {
    const trimmed = newSubName.trim();
    if (!trimmed || viewingItem?.type !== 'category') return;
    const cat = categories.find(c => c.id === viewingItem.id);
    if (!cat) return;
    const subs = cat.subCategories || [];
    if (subs.includes(trimmed)) { setNewSubName(''); setIsAddingSub(false); return; }
    onUpdateCategory({ ...cat, subCategories: [...subs, trimmed] });
    setNewSubName(''); setIsAddingSub(false);
  };

  const handleFinishRenameSub = () => {
    if (!renamingSub || !viewingItem?.id) return;
    const trimmed = renamingSub.currentName.trim();
    if (trimmed && trimmed !== renamingSub.originalName) onRenameSubCategory(viewingItem.id, renamingSub.originalName, trimmed);
    setRenamingSub(null);
  };

  const targetEntity = useMemo(() => {
    if (!mergingItem || !mergingItem.targetId) return null;
    return (mergingItem.type === 'merchant' ? merchants : categories).find(m => m.id === mergingItem.targetId);
  }, [mergingItem, merchants, categories]);

  const sourceEntities = useMemo(() => {
    if (!mergingItem || !mergingItem.targetId) return [];
    return (mergingItem.type === 'merchant' ? merchants : categories).filter(m => mergingItem.ids.includes(m.id!) && m.id !== mergingItem.targetId);
  }, [mergingItem, merchants, categories]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Move Sub-category Dialog */}
      {movingSubInfo && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 bg-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl"><ArrowRightLeft size={20} /></div>
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Move Sub-category</h3>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Relocate "{movingSubInfo.subName}" to another parent</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Category</label>
                <select 
                  value={targetMoveCatName}
                  onChange={(e) => setTargetMoveCatName(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer appearance-none"
                >
                  <option value="">Choose Parent Category...</option>
                  {categories.filter(c => c.id !== movingSubInfo.catId).map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-blue-700 uppercase leading-relaxed">
                  This will re-assign all associated transactions to the new parent category and update category metadata automatically.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={handleMoveSubCategoryExecute}
                  disabled={!targetMoveCatName}
                  className={`w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all ${
                    targetMoveCatName ? 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Execute Move
                </button>
                <button onClick={() => setMovingSubInfo(null)} className="w-full h-12 text-gray-500 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal logic here... */}
      {mergingItem && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden">
            {isConfirmingMerge ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-8 border-b border-gray-50 bg-rose-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-600 text-white rounded-xl"><ShieldAlert size={20} /></div>
                    <h3 className="text-xl font-black text-rose-900 uppercase tracking-tight">Final Verification</h3>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Remove</p>
                      <div className="flex flex-wrap gap-1">
                        {sourceEntities.map(m => (
                          <span key={m.id} className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{m.name}</span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="text-gray-200" />
                    <div className="flex-1 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Keep</p>
                      <p className="text-sm font-black text-indigo-900 uppercase">{targetEntity?.name}</p>
                    </div>
                  </div>
                </div>
                <div className="p-8 border-t border-gray-50 flex gap-4">
                  <button onClick={() => setIsConfirmingMerge(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px]">Back</button>
                  <button onClick={handleConfirmMerge} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px]">Execute</button>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="p-8 border-b border-gray-50 bg-indigo-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl"><GitMerge size={20} /></div>
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Merge {mergingItem.type}s</h3>
                  </div>
                </div>
                <div className="p-8 max-h-[50vh] overflow-y-auto space-y-3">
                  {(mergingItem.type === 'merchant' ? merchants : categories).filter(m => mergingItem.ids.includes(m.id!)).map(m => (
                    <button 
                      key={m.id}
                      onClick={() => setMergingItem({ ...mergingItem, targetId: m.id })}
                      className={`w-full p-5 rounded-2xl text-left border-2 transition-all flex items-center justify-between ${
                        mergingItem.targetId === m.id ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-gray-100'
                      }`}
                    >
                      <p className={`text-sm font-black uppercase ${mergingItem.targetId === m.id ? 'text-indigo-600' : 'text-gray-900'}`}>{m.name}</p>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${mergingItem.targetId === m.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200'}`}>
                        {mergingItem.targetId === m.id && <Check size={14} />}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-8 border-t border-gray-50 flex gap-4">
                  <button onClick={() => setMergingItem(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
                  <button disabled={!mergingItem.targetId} onClick={() => setIsConfirmingMerge(true)} className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] ${mergingItem.targetId ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>Proceed</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editing Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                {editingItem.data.id ? 'Edit' : 'Create'} {editingItem.type}
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Name</label>
                <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-100" />
              </div>
              {editingItem.type === 'category' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Flow Type</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl h-11">
                    <button onClick={() => setEditType(TransactionType.EXPENSE)} className={`flex-1 rounded-lg text-[10px] font-black uppercase ${editType === TransactionType.EXPENSE ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-400'}`}>Expense</button>
                    <button onClick={() => setEditType(TransactionType.INCOME)} className={`flex-1 rounded-lg text-[10px] font-black uppercase ${editType === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Income</button>
                    <button onClick={() => setEditType(TransactionType.BOTH)} className={`flex-1 rounded-lg text-[10px] font-black uppercase ${editType === TransactionType.BOTH ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Both</button>
                  </div>
                </div>
              )}
              {(editingItem.type === 'category' || editingItem.type === 'payment') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Visual Marker</label>
                  <div className="flex gap-2">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#000000'].map(c => (
                      <button key={c} onClick={() => setEditColor(c)} className={`w-8 h-8 rounded-full border-2 transition-all ${editColor === c ? 'border-gray-800 scale-110 shadow-lg' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
              {editingItem.type === 'merchant' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location</label>
                    <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none" placeholder="City, State or Address" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Website</label>
                    <input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none" placeholder="https://..." />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-3 pt-4">
                <button onClick={handleSave} className="w-full h-12 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100">Save Changes</button>
                <button onClick={() => setEditingItem(null)} className="w-full h-12 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Item Modal */}
      {viewingItem && activeViewingData && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4" onClick={() => setViewingItem(null)}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className={`p-6 flex items-center justify-between border-b border-gray-100 ${
              viewingItem.type === 'category' ? 'bg-purple-50' : viewingItem.type === 'merchant' ? 'bg-teal-50' : 'bg-blue-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-white shadow-sm ${
                  viewingItem.type === 'category' ? 'text-purple-600' : viewingItem.type === 'merchant' ? 'text-teal-600' : 'text-blue-600'
                }`}>
                  <Info size={20} />
                </div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">{viewingItem.type} profile</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { openEdit(viewingItem.type, activeViewingData); setViewingItem(null); }} className="p-2 text-gray-400 hover:text-blue-600 transition-all"><Edit2 size={18} /></button>
                <button onClick={() => setViewingItem(null)} className="p-2 text-gray-400 hover:text-rose-600 transition-all"><X size={20} /></button>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Entry Name</p>
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{activeViewingData.name}</h2>
              </div>

              {viewingItem.type === 'category' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Flow</p>
                      <p className="text-sm font-black text-blue-600 uppercase">{(activeViewingData as Category).type}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Volume</p>
                      <p className="text-sm font-black text-gray-900">${(categoryStatsMap[activeViewingData.name.toLowerCase()] || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sub-Categories</p>
                      <button onClick={() => setIsAddingSub(true)} className="text-[10px] font-black text-blue-600 uppercase">Add New</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(activeViewingData as Category).subCategories?.map(s => (
                        <span key={s} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold text-gray-700 flex items-center gap-2">
                          {s}
                          <div className="flex items-center gap-1.5 ml-1 border-l border-gray-200 pl-2">
                            <button 
                              onClick={() => activeViewingData.id && setMovingSubInfo({ catId: activeViewingData.id, subName: s })} 
                              className="text-gray-400 hover:text-blue-500 transition-colors"
                              title="Move to another category"
                            >
                              <ArrowRightLeft size={12} />
                            </button>
                            <button onClick={() => activeViewingData.id && onDeleteSubCategory(activeViewingData.id, s)} className="text-gray-400 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                          </div>
                        </span>
                      ))}
                      {isAddingSub && (
                        <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-xl px-2 py-1 shadow-sm">
                          <input autoFocus value={newSubName} onChange={(e) => setNewSubName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSub()} className="text-[11px] font-bold outline-none w-24" placeholder="..." />
                          <button onClick={handleAddSub} className="text-emerald-600"><Check size={14}/></button>
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
                      <p className="text-sm font-black text-gray-900">{merchantStatsMap[activeViewingData.name.toLowerCase()]?.count || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                      <p className="text-sm font-black text-emerald-600">${(merchantStatsMap[activeViewingData.name.toLowerCase()]?.total || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm text-gray-600"><MapPin size={16} className="text-blue-500" /> {(activeViewingData as Merchant).location || 'No location set'}</div>
                  </div>
                  <button onClick={() => onViewMerchantTransactions?.(activeViewingData.name)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                    <ListOrdered size={16} /> View History
                  </button>
                </div>
              )}

              {viewingItem.type === 'payment' && (
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: (activeViewingData as PaymentMethod).color || '#3B82F6' }}>
                    <CreditCard size={24} />
                  </div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Cleared</p>
                  <h4 className="text-2xl font-black text-gray-900">${(paymentStatsMap[activeViewingData.name.toLowerCase()]?.total || 0).toLocaleString()}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{paymentStatsMap[activeViewingData.name.toLowerCase()]?.count || 0} Transactions</p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4">
                <button onClick={() => { setDeletingItem({ type: viewingItem.type, id: activeViewingData.id!, name: activeViewingData.name }); setViewingItem(null); }} className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all">Delete {viewingItem.type}</button>
                <button onClick={() => setViewingItem(null)} className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all">Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Mode Views */}
      {mode === 'categories' && (
        <div className="space-y-4">
          <ManagementHeader title="Categories" icon={Tags} addLabel="ADD NEW" buttonColor="#7C3AED" onAdd={handleAddNew} searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search categories..." selectionCount={selectedIds.size} onMerge={() => setMergingItem({ ids: Array.from(selectedIds), type: 'category' })} />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">#</th>
                  <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('name')}>Category <SortIndicator columnKey="name" /></th>
                  <th className="px-6 py-4">Flow</th>
                  <th className="px-6 py-4">Subs</th>
                  <th className="px-6 py-4 text-right cursor-pointer" onClick={() => handleSort('spend')}>Volume <SortIndicator columnKey="spend" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAndSortedItems.map(cat => {
                  const spend = categoryStatsMap[cat.name.toLowerCase()] || 0;
                  const isSelected = selectedIds.has(cat.id!);
                  return (
                    <tr key={cat.id} className={`hover:bg-blue-50/20 group transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/40' : ''}`} onClick={() => setViewingItem({ type: 'category', id: cat.id! })}>
                      <td className="px-6 py-4" onClick={(e) => { e.stopPropagation(); toggleSelect(cat.id!); }}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200'}`}>{isSelected && <Check size={12} />}</div>
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900 uppercase text-xs">{cat.name}</td>
                      <td className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">{cat.type || 'EXPENSE'}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-gray-400">{cat.subCategories?.length || 0}</td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">${spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'merchants' && (
        <div className="space-y-4">
          <ManagementHeader title="Payees & Merchants" icon={Store} addLabel="ADD NEW" buttonColor="#0D9488" onAdd={handleAddNew} searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search merchants..." selectionCount={selectedIds.size} onMerge={() => setMergingItem({ ids: Array.from(selectedIds), type: 'merchant' })} />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">#</th>
                  <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('name')}>Payee Name <SortIndicator columnKey="name" /></th>
                  <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('count')}>Visits <SortIndicator columnKey="count" /></th>
                  <th className="px-6 py-4 text-right cursor-pointer" onClick={() => handleSort('spend')}>Spend <SortIndicator columnKey="spend" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAndSortedItems.map(m => {
                  const stats = merchantStatsMap[m.name.toLowerCase()] || { total: 0, count: 0 };
                  const isSelected = selectedIds.has(m.id!);
                  return (
                    <tr key={m.id} className={`hover:bg-blue-50/20 group transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/40' : ''}`} onClick={() => setViewingItem({ type: 'merchant', id: m.id! })}>
                      <td className="px-6 py-4" onClick={(e) => { e.stopPropagation(); toggleSelect(m.id!); }}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200'}`}>{isSelected && <Check size={12} />}</div>
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900 uppercase text-xs">{m.name}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-gray-400">{stats.count} Visits</td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">${stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'payments' && (
        <div className="space-y-4">
          <ManagementHeader title="Payment Methods" icon={CreditCard} addLabel="ADD NEW" buttonColor="#2563EB" onAdd={handleAddNew} searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search accounts..." />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Account Name</th>
                  <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('count')}>Activity <SortIndicator columnKey="count" /></th>
                  <th className="px-6 py-4 text-right cursor-pointer" onClick={() => handleSort('spend')}>Total Cleared <SortIndicator columnKey="spend" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAndSortedItems.map(p => {
                  const stats = paymentStatsMap[p.name.toLowerCase()] || { total: 0, count: 0 };
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewingItem({ type: 'payment', id: p.id! })}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black uppercase" style={{ backgroundColor: p.color || '#3B82F6' }}>
                            <CreditCard size={14} />
                          </div>
                          <span className="font-black text-gray-900 uppercase text-xs">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-gray-400">{stats.count} Items</td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">${stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'backups' && (
        <div className="space-y-6">
          <ManagementHeader title="Data Management" icon={Database} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><Download size={28} /></div>
              <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">Export Repository</h4>
              <p className="text-sm text-gray-400 leading-relaxed">Download a complete snapshot of your ledger, categories, and settings as a JSON file. This can be used for local backups or migrating data.</p>
              <button onClick={onExport} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"><Download size={16} /> Save JSON Export</button>
            </div>
            
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><Upload size={28} /></div>
              <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">Restore Snapshot</h4>
              <p className="text-sm text-gray-400 leading-relaxed">Upload a previously exported JSON file to restore your entire database. <span className="text-rose-500 font-bold">WARNING: This will overwrite all current local data.</span></p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onImport(file);
                  e.target.value = '';
                }
              }} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"><Upload size={16} /> Upload & Restore</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Management;