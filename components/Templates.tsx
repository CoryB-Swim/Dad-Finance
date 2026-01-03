
import React, { useState, useMemo } from 'react';
import { RecurringTemplate, TransactionType, Category, Transaction, PaymentMethod, Merchant, Frequency } from '../types';
import { 
  Repeat, 
  Trash2, 
  Zap, 
  Edit2, 
  X, 
  PlusCircle, 
  Search,
  SortAsc,
  SortDesc,
  Clock,
  Layers,
  Store,
  Calendar,
  AlertCircle,
  Info,
  CreditCard,
  Tag,
  FileText,
  Plus
} from 'lucide-react';
import TransactionForm from './TransactionForm';

// Define the missing TemplateSortKey type
type TemplateSortKey = 'name' | 'amount' | 'category' | 'schedule' | 'nextDate' | 'status';

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

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKS_LABEL = ["1st", "2nd", "3rd", "4th", "Last"];

const getHumanSchedule = (tmp: RecurringTemplate) => {
  const s = tmp.schedule;
  if (!s || s.frequency === 'none') return "Manual Only";
  if (s.frequency === 'daily') return "Daily";
  if (s.frequency === 'weekly') return `Weekly (${DAYS_OF_WEEK[s.dayOfWeek ?? 0]})`;
  if (s.frequency === 'monthly') {
    if (s.dayOfMonth) return `Monthly (${s.dayOfMonth}th)`;
    if (s.weekOfMonth) return `Monthly (${WEEKS_LABEL[s.weekOfMonth - 1]} ${DAYS_OF_WEEK[s.dayOfWeek ?? 0]})`;
  }
  if (s.frequency === 'yearly') return "Yearly";
  return s.frequency;
};

/**
 * Calculates the next occurrence date based on the schedule and last posted date.
 */
const calculateNextDate = (tmp: RecurringTemplate): string | null => {
  if (!tmp.schedule || tmp.schedule.frequency === 'none') return null;

  const s = tmp.schedule;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = tmp.lastPostedDate ? new Date(tmp.lastPostedDate) : new Date(today);
  next.setHours(0, 0, 0, 0);
  
  if (tmp.lastPostedDate) {
    next.setDate(next.getDate() + 1);
  }

  if (s.frequency === 'daily') {
    return next.toISOString().split('T')[0];
  } 
  
  if (s.frequency === 'weekly') {
    while (next.getDay() !== s.dayOfWeek) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString().split('T')[0];
  } 
  
  if (s.frequency === 'monthly') {
    if (s.dayOfMonth) {
      let targetDate = new Date(next);
      targetDate.setDate(s.dayOfMonth);
      if (targetDate < next) {
        targetDate.setMonth(targetDate.getMonth() + 1, s.dayOfMonth);
      }
      if (targetDate.getDate() !== s.dayOfMonth) {
        targetDate.setDate(0); 
      }
      return targetDate.toISOString().split('T')[0];
    } 
    
    if (s.weekOfMonth && s.dayOfWeek !== undefined) {
      const findInMonth = (date: Date, week: number, day: number) => {
        let d = new Date(date.getFullYear(), date.getMonth(), 1);
        let count = 0;
        while (d.getMonth() === date.getMonth()) {
          if (d.getDay() === day) {
            count++;
            if (count === week) return d;
          }
          d.setDate(d.getDate() + 1);
        }
        if (week === 5) {
          d.setDate(d.getDate() - 1);
          while (d.getDay() !== day) d.setDate(d.getDate() - 1);
          return d;
        }
        return null;
      };

      let result = findInMonth(next, s.weekOfMonth, s.dayOfWeek);
      if (!result || result < next) {
        let nextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 1);
        result = findInMonth(nextMonth, s.weekOfMonth, s.dayOfWeek);
      }
      return result ? result.toISOString().split('T')[0] : null;
    }
  } 
  
  if (s.frequency === 'yearly') {
    if (tmp.lastPostedDate) {
      next = new Date(tmp.lastPostedDate);
      next.setFullYear(next.getFullYear() + 1);
    }
    return next.toISOString().split('T')[0];
  }

  return null;
};

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
  const [viewingTemplate, setViewingTemplate] = useState<RecurringTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<RecurringTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: TemplateSortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const getStatusInfo = (tmp: RecurringTemplate) => {
    const nextDateStr = calculateNextDate(tmp);
    if (!nextDateStr) return { isDue: false, nextDate: null };
    
    const next = new Date(nextDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      isDue: today >= next,
      nextDate: nextDateStr
    };
  };

  const handleSort = (key: TemplateSortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedTemplates = useMemo(() => {
    let result = templates;
    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      result = templates.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.category.toLowerCase().includes(query) || 
        (t.description || '').toLowerCase().includes(query)
      );
    }

    return [...result].sort((a, b) => {
      let valA: any, valB: any;

      if (sortConfig.key === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortConfig.key === 'amount') {
        valA = a.amount;
        valB = b.amount;
      } else if (sortConfig.key === 'category') {
        valA = a.category.toLowerCase();
        valB = b.category.toLowerCase();
      } else if (sortConfig.key === 'schedule') {
        valA = getHumanSchedule(a).toLowerCase();
        valB = getHumanSchedule(b).toLowerCase();
      } else if (sortConfig.key === 'nextDate' || sortConfig.key === 'status') {
        const infoA = getStatusInfo(a);
        const infoB = getStatusInfo(b);
        if (sortConfig.key === 'status') {
          valA = infoA.isDue ? 1 : 0;
          valB = infoB.isDue ? 1 : 0;
        } else {
          valA = infoA.nextDate || '9999-99-99';
          valB = infoB.nextDate || '9999-99-99';
        }
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [templates, searchValue, sortConfig]);

  const SortIndicator = ({ columnKey }: { columnKey: TemplateSortKey }) => {
    if (sortConfig.key !== columnKey) return <SortAsc size={10} className="ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? <SortAsc size={10} className="ml-1 text-blue-600" /> : <SortDesc size={10} className="ml-1 text-blue-600" />;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md"><Repeat size={18} /></div>
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Recurrence Ledger</h3>
        </div>
        <button 
          onClick={() => setIsCreating(true)} 
          style={{ backgroundColor: '#4F46E5' }}
          className="text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> ADD NEW
        </button>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Filter recurring items..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
        </div>
      </div>

      {/* Viewing Template Modal */}
      {viewingTemplate && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4" onClick={() => setViewingTemplate(null)}>
          <div className="bg-white w-full max-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className={`p-6 flex items-center justify-between border-b border-gray-100 ${viewingTemplate.type === TransactionType.INCOME ? 'bg-emerald-50/50' : 'bg-rose-50/50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${viewingTemplate.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  <Repeat size={20} />
                </div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Pattern Details</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setEditingTemplate(viewingTemplate); setViewingTemplate(null); }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => setViewingTemplate(null)}
                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pattern Amount</p>
                <h2 className={`text-4xl font-black ${viewingTemplate.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-gray-900'}`}>
                  ${viewingTemplate.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <div className="mt-2 flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                  <Clock size={14} /> {getHumanSchedule(viewingTemplate)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Store size={10} className="text-blue-500" /> Payee</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{viewingTemplate.merchant || 'Undefined'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Tag size={10} className="text-emerald-500" /> Category</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{viewingTemplate.category}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Calendar size={10} className="text-indigo-500" /> Next Post</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                    {calculateNextDate(viewingTemplate) || 'Manual Only'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><CreditCard size={10} className="text-rose-500" /> Method</p>
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{viewingTemplate.paymentMethod || 'N/A'}</p>
                </div>
              </div>

              {viewingTemplate.description && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><FileText size={10} /> Notes</p>
                  <p className="text-xs font-semibold text-gray-600 leading-relaxed italic">"{viewingTemplate.description}"</p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-3">
                  <button 
                    onClick={() => { onPost(viewingTemplate!); setViewingTemplate(null); }}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                  >
                    <Zap size={14} /> Post to Ledger
                  </button>
                  <button 
                    onClick={() => { setDeletingTemplate(viewingTemplate!); setViewingTemplate(null); }}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-rose-700 transition-all active:scale-[0.98]"
                  >
                    <Trash2 size={14} /> Delete Pattern
                  </button>
                </div>
                <button 
                  onClick={() => setViewingTemplate(null)}
                  className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all active:scale-[0.98]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingTemplate && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-sm rounded-2xl p-6 text-center border border-gray-100 shadow-2xl">
            <AlertCircle size={40} className="mx-auto text-rose-500 mb-4" />
            <h3 className="text-xl font-black uppercase mb-2">Delete Pattern?</h3>
            <p className="text-sm text-gray-500 mb-6">Recurring transactions will no longer be tracked.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingTemplate(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button onClick={() => { deletingTemplate.id && onDelete(deletingTemplate.id); setDeletingTemplate(null); }} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100">Delete</button>
            </div>
          </div>
        </div>
      )}

      {(editingTemplate || isCreating) && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-gray-800 uppercase tracking-tight text-[10px]">{isCreating ? 'Create New Pattern' : 'Edit Pattern'}</h3>
              <button onClick={() => { setEditingTemplate(null); setIsCreating(false); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full"><X size={18} /></button>
            </div>
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <TransactionForm 
                categories={categories} 
                paymentMethods={paymentMethods}
                transactions={transactions}
                merchants={merchants}
                onAddTransaction={(t) => { onAdd(t); setIsCreating(false); }} 
                onUpdateTransaction={(t) => { onUpdate(t); setEditingTemplate(null); }}
                onAddCategory={() => {}} 
                onAddPaymentMethod={onAddPaymentMethod}
                isTemplateMode={true}
                editingTransaction={editingTemplate} 
                onCancelEdit={() => { setEditingTemplate(null); setIsCreating(false); }} 
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Merchant / Template <SortIndicator columnKey="name" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('category')}>
                  <div className="flex items-center">Category <SortIndicator columnKey="category" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('schedule')}>
                  <div className="flex items-center">Schedule <SortIndicator columnKey="schedule" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('nextDate')}>
                  <div className="flex items-center">Next Date <SortIndicator columnKey="nextDate" /></div>
                </th>
                <th className="px-6 py-4 w-28 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center">Status <SortIndicator columnKey="status" /></div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-end">Amount <SortIndicator columnKey="amount" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAndSortedTemplates.map(tmp => {
                const { isDue, nextDate } = getStatusInfo(tmp);
                return (
                  <tr 
                    key={tmp.id} 
                    className={`group hover:bg-blue-50/30 transition-colors cursor-pointer ${isDue ? 'bg-amber-50/20' : ''}`}
                    onClick={() => setViewingTemplate(tmp)}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`${tmp.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tmp.merchant ? <Store size={14} /> : <Layers size={14} />}
                        </div>
                        <span className="font-black text-gray-900 text-xs uppercase tracking-tight">{tmp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{tmp.category}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                        <Clock size={12} className="text-gray-300" /> {getHumanSchedule(tmp)}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {nextDate ? (
                        <span className={`px-2 py-1 rounded text-[10px] font-black tracking-tighter ${isDue ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                          {nextDate}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-300 uppercase">Manual</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {isDue ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                          <span className="text-[8px] font-black text-amber-600 uppercase">Due Now</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-gray-200 rounded-full"></span>
                          <span className="text-[8px] font-black text-gray-300 uppercase">Upcoming</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className={`text-sm font-black ${tmp.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-gray-900'}`}>
                        ${tmp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredAndSortedTemplates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <Repeat size={40} />
                      <p className="text-xs font-black uppercase tracking-widest">No Patterns Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Templates;
