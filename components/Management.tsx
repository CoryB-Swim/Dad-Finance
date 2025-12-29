
import React, { useMemo, useState, useRef } from 'react';
import { Transaction, Category, Vendor, TransactionType } from '../types';
import { 
  Trash2, 
  Check, 
  X, 
  Plus, 
  PlusCircle,
  Globe,
  MapPin,
  ExternalLink,
  Edit2,
  Database,
  Download,
  Upload,
  Info
} from 'lucide-react';

interface ManagementProps {
  mode: 'categories' | 'vendors' | 'backups';
  categories: Category[];
  transactions: Transaction[];
  onAddCategory: (c: Category) => void;
  onUpdateCategory: (c: Category) => void;
  onDeleteCategory: (id: number) => void;
  vendors: Vendor[];
  onAddVendor: (v: Vendor) => void;
  onUpdateVendor: (v: Vendor) => void;
  onDeleteVendor: (id: number) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

type CatSortKey = 'name' | 'type';
type VendorSortKey = 'name' | 'count';

const Management: React.FC<ManagementProps> = ({ 
  mode,
  categories, 
  transactions, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory,
  vendors,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
  onExport,
  onImport
}) => {
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [catSort, setCatSort] = useState<{ key: CatSortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [vendorSort, setVendorSort] = useState<{ key: VendorSortKey; direction: 'asc' | 'desc' }>({ key: 'count', direction: 'desc' });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [editWebsite, setEditWebsite] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [addingSubTo, setAddingSubTo] = useState<number | null>(null);
  const [newSubName, setNewSubName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merged vendor data (persistent + discovered counts)
  const vendorData = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(t => { if (t.vendor) counts[t.vendor.toLowerCase()] = (counts[t.vendor.toLowerCase()] || 0) + 1; });
    
    return vendors.map(v => ({
      ...v,
      count: counts[v.name.toLowerCase()] || 0
    }));
  }, [vendors, transactions]);

  const filteredAndSortedCategories = useMemo(() => {
    let result = categoryTypeFilter === 'ALL' 
      ? [...categories] 
      : categories.filter(c => c.type === categoryTypeFilter || c.type === TransactionType.BOTH);

    result.sort((a, b) => {
      let valA = a[catSort.key] || '';
      let valB = b[catSort.key] || '';
      const multiplier = catSort.direction === 'asc' ? 1 : -1;
      return valA.toString().localeCompare(valB.toString()) * multiplier;
    });

    return result;
  }, [categories, categoryTypeFilter, catSort]);

  const sortedVendors = useMemo(() => {
    let result = [...vendorData];
    result.sort((a, b) => {
      const multiplier = vendorSort.direction === 'asc' ? 1 : -1;
      if (vendorSort.key === 'name') {
        return a.name.localeCompare(b.name) * multiplier;
      } else {
        return (a.count - b.count) * multiplier;
      }
    });
    return result;
  }, [vendorData, vendorSort]);

  const handleStartEditCategory = (cat: Category) => {
    if (cat.id) {
      setEditingId(cat.id);
      setEditName(cat.name);
      setEditType(cat.type);
    }
  };

  const handleStartEditVendor = (v: Vendor) => {
    if (v.id) {
      setEditingId(v.id);
      setEditName(v.name);
      setEditWebsite(v.website || '');
      setEditLocation(v.location || '');
      setEditNotes(v.notes || '');
    }
  };

  const handleSaveEditCategory = (cat: Category) => {
    if (editName.trim()) onUpdateCategory({ ...cat, name: editName.trim(), type: editType });
    setEditingId(null);
  };

  const handleSaveEditVendor = (v: Vendor) => {
    if (editName.trim()) {
      onUpdateVendor({ 
        ...v, 
        name: editName.trim(), 
        website: editWebsite.trim(), 
        location: editLocation.trim(), 
        notes: editNotes.trim() 
      });
    }
    setEditingId(null);
  };

  const handleAddSubCategory = (cat: Category) => {
    if (!newSubName.trim()) return;
    const currentSubs = cat.subCategories || [];
    if (!currentSubs.includes(newSubName.trim())) {
      onUpdateCategory({ ...cat, subCategories: [...currentSubs, newSubName.trim()] });
    }
    setNewSubName('');
    setAddingSubTo(null);
  };

  const handleRemoveSubCategory = (cat: Category, sub: string) => {
    const newSubs = (cat.subCategories || []).filter(s => s !== sub);
    onUpdateCategory({ ...cat, subCategories: newSubs });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="min-h-[400px]">
        {mode === 'categories' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex gap-1 p-1 bg-white rounded-lg border border-gray-100 shadow-sm">
                  {['ALL', TransactionType.EXPENSE, TransactionType.INCOME].map(t => (
                    <button 
                      key={t}
                      onClick={() => setCategoryTypeFilter(t as any)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${categoryTypeFilter === t ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <button onClick={() => setCatSort(p => ({ key: 'name', direction: p.direction === 'asc' ? 'desc' : 'asc' }))} className="text-[10px] uppercase font-black tracking-widest text-gray-400 hover:text-gray-600">Sort Name</button>
              </div>
              <button onClick={() => onAddCategory({ name: 'New Category', type: TransactionType.EXPENSE })} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                <PlusCircle size={18} /> New Category
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedCategories.map(cat => (
                <div key={cat.id} className={`bg-white rounded-2xl border-l-4 p-5 shadow-sm hover:shadow-md transition-all group ${cat.type === TransactionType.INCOME ? 'border-emerald-500' : cat.type === TransactionType.BOTH ? 'border-blue-500' : 'border-rose-500'}`}>
                  <div className="flex justify-between items-start mb-4">
                    {editingId === cat.id ? (
                      <div className="flex-1 space-y-2 pr-2">
                        <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-2 py-1 border-b-2 border-blue-600 outline-none font-bold text-lg bg-white text-gray-900" />
                        <select value={editType} onChange={(e) => setEditType(e.target.value as TransactionType)} className="w-full text-xs font-bold uppercase tracking-wider py-1 outline-none bg-transparent text-gray-600">
                          <option value={TransactionType.EXPENSE}>Expense Only</option>
                          <option value={TransactionType.INCOME}>Income Only</option>
                          <option value={TransactionType.BOTH}>Both</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEditCategory(cat)} className="text-emerald-600"><Check size={20}/></button>
                          <button onClick={() => setEditingId(null)} className="text-rose-500"><X size={20}/></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 cursor-pointer" onClick={() => handleStartEditCategory(cat)}>
                        <h3 className="font-black text-gray-900 text-lg group-hover:text-blue-600">{cat.name}</h3>
                        <p className="text-[10px] font-black uppercase text-gray-400">{cat.type === TransactionType.BOTH ? 'Income / Expense' : cat.type}</p>
                      </div>
                    )}
                    <button onClick={() => cat.id && onDeleteCategory(cat.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500"><Trash2 size={16} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(cat.subCategories || []).map(sub => (
                      <span key={sub} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-100 group/tag">
                        {sub}
                        <button onClick={() => handleRemoveSubCategory(cat, sub)} className="opacity-0 group-hover/tag:opacity-100 text-gray-400 hover:text-rose-500"><X size={12} /></button>
                      </span>
                    ))}
                    {addingSubTo === cat.id ? (
                      <input autoFocus className="px-2 py-1 text-xs border border-blue-200 rounded outline-none" placeholder="Sub-name..." value={newSubName} onChange={(e) => setNewSubName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubCategory(cat)} onBlur={() => !newSubName && setAddingSubTo(null)} />
                    ) : (
                      <button onClick={() => setAddingSubTo(cat.id || null)} className="px-2 py-1 border border-dashed text-gray-400 rounded-lg text-xs font-bold hover:text-blue-600"><Plus size={12} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'vendors' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                 <button onClick={() => setVendorSort(p => ({ key: 'name', direction: p.direction === 'asc' ? 'desc' : 'asc' }))} className="text-[10px] uppercase font-black tracking-widest text-gray-400 hover:text-gray-600">Sort Name</button>
                 <button onClick={() => setVendorSort(p => ({ key: 'count', direction: p.direction === 'asc' ? 'desc' : 'asc' }))} className="text-[10px] uppercase font-black tracking-widest text-gray-400 hover:text-gray-600">Sort Frequency</button>
              </div>
              <button onClick={() => onAddVendor({ name: 'New Vendor' })} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                <PlusCircle size={18} /> New Vendor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedVendors.map(vendor => (
                <div key={vendor.id} className="bg-white rounded-2xl border-l-4 border-indigo-500 p-5 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    {editingId === vendor.id ? (
                      <div className="flex-1 space-y-3 pr-2">
                        <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Vendor Name" className="w-full px-2 py-1 border-b-2 border-indigo-600 outline-none font-bold text-lg bg-white text-gray-900" />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Globe size={12} className="absolute left-2 top-2.5 text-gray-400" />
                            <input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} placeholder="Website" className="w-full pl-7 pr-2 py-2 text-xs border border-gray-100 rounded-lg outline-none bg-gray-50 text-gray-900" />
                          </div>
                          <div className="relative">
                            <MapPin size={12} className="absolute left-2 top-2.5 text-gray-400" />
                            <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" className="w-full pl-7 pr-2 py-2 text-xs border border-gray-100 rounded-lg outline-none bg-gray-50 text-gray-900" />
                          </div>
                        </div>
                        <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Additional info/notes..." className="w-full p-2 text-xs border border-gray-100 rounded-lg outline-none bg-gray-50 h-20 text-gray-900" />
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEditVendor(vendor)} className="text-emerald-600"><Check size={20}/></button>
                          <button onClick={() => setEditingId(null)} className="text-rose-500"><X size={20}/></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-gray-900 text-lg">{vendor.name}</h3>
                          <button onClick={() => handleStartEditVendor(vendor)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-indigo-600 transition-all"><Edit2 size={14}/></button>
                        </div>
                        <p className="text-[10px] font-black uppercase text-gray-400">{vendor.count} Transactions</p>
                      </div>
                    )}
                    <button onClick={() => vendor.id && onDeleteVendor(vendor.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500"><Trash2 size={16} /></button>
                  </div>
                  
                  {editingId !== vendor.id && (
                    <div className="space-y-2 mt-4">
                      {vendor.website && (
                        <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline font-medium">
                          <Globe size={14} /> {vendor.website.replace(/^https?:\/\//, '')} <ExternalLink size={10} />
                        </a>
                      )}
                      {vendor.location && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                          <MapPin size={14} /> {vendor.location}
                        </div>
                      )}
                      {vendor.notes && <p className="text-[11px] text-gray-400 italic line-clamp-2 mt-2">{vendor.notes}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'backups' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-400">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Data Management</h3>
                  <p className="text-sm text-gray-500">Securely export your financial data or restore from a previous backup.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={onExport}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                >
                  <Download size={20} />
                  Export to JSON
                </button>
                
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-dashed border-gray-200 text-gray-600 rounded-xl font-bold hover:border-amber-400 hover:text-amber-600 transition-all active:scale-95"
                  >
                    <Upload size={20} />
                    Import from JSON
                  </button>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 leading-relaxed">
                  <p className="font-bold mb-1">Security & Local Storage</p>
                  Your records stay in your browser (IndexedDB). Exports are readable JSON files; keep them safe as they contain sensitive financial info.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Management;
