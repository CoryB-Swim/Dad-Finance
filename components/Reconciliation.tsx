
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, PaymentMethod, StatementRecord, TransactionType, DraftStatement } from '../types';
import { 
  ShieldCheck, 
  Calendar, 
  ChevronRight, 
  ArrowRight, 
  CheckCircle2, 
  RotateCcw, 
  Info,
  DollarSign,
  Plus,
  X,
  CreditCard,
  Save,
  Clock,
  Filter,
  Trash2,
  AlertCircle,
  Edit2,
  SortAsc,
  SortDesc,
  Target,
  Activity,
  AlertTriangle,
  ListOrdered,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

interface ReconciliationProps {
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  statements: StatementRecord[];
  drafts: DraftStatement[];
  onReconcile: (statement: StatementRecord, draftId?: number) => void;
  onDeleteStatement: (id: number) => void;
  onSaveDraft: (draft: DraftStatement) => void;
  onDeleteDraft: (id: number) => void;
}

const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type ReconSortKey = 'date' | 'account' | 'openingBal' | 'endingBal' | 'itemsCount' | 'status';

const Reconciliation: React.FC<ReconciliationProps> = ({ 
  transactions, 
  paymentMethods, 
  statements,
  drafts,
  onReconcile,
  onDeleteStatement,
  onSaveDraft,
  onDeleteDraft
}) => {
  // Navigation & UI state
  const [isAdding, setIsAdding] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ id: number, type: 'draft' | 'statement', name: string } | null>(null);
  
  // Filter state for main list
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: ReconSortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  
  // Setup form state
  const [selectedMethod, setSelectedMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [openingBalance, setOpeningBalance] = useState('0');
  const [targetBalance, setTargetBalance] = useState('');
  const [balanceMode, setBalanceMode] = useState<'asset' | 'liability'>('asset');
  
  // Active session state
  const [currentDraftId, setCurrentDraftId] = useState<number | undefined>(undefined);
  const [clearedIds, setClearedIds] = useState<Set<number>>(new Set());

  // Automatically derive starting balance from the last reconciled statement for this method
  const derivedStartingBalance = useMemo(() => {
    if (!selectedMethod) return 0;
    const lastStatement = [...statements]
      .filter(s => s.paymentMethod === selectedMethod)
      .sort((a, b) => b.statementDate.localeCompare(a.statementDate))[0];
    
    if (!lastStatement) return 0;
    
    // If the last statement was a liability, we return the positive absolute value for the user to continue in liability mode
    return lastStatement.balanceMode === 'liability' ? Math.abs(lastStatement.endingBalance) : lastStatement.endingBalance;
  }, [selectedMethod, statements]);

  // Also derive the mode from the last statement for consistency
  useEffect(() => {
    if (selectedMethod && !isSessionActive) {
      const lastStatement = [...statements]
        .filter(s => s.paymentMethod === selectedMethod)
        .sort((a, b) => b.statementDate.localeCompare(a.statementDate))[0];
      
      if (lastStatement?.balanceMode) {
        setBalanceMode(lastStatement.balanceMode);
      } else {
        // Simple heuristic: if the account name contains 'Credit' or 'Card', default to liability
        if (selectedMethod.toLowerCase().includes('credit') || selectedMethod.toLowerCase().includes('card')) {
          setBalanceMode('liability');
        } else {
          setBalanceMode('asset');
        }
      }
      setOpeningBalance(derivedStartingBalance.toString());
    }
  }, [selectedMethod, derivedStartingBalance, isSessionActive, statements]);

  const availableTransactions = useMemo(() => {
    if (!selectedMethod) return [];
    return transactions.filter(t => 
      t.paymentMethod === selectedMethod && 
      (!t.reconciled || (t.id && clearedIds.has(t.id))) && 
      (!startDate || t.date >= startDate) &&
      (!endDate || t.date <= endDate)
    ).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, selectedMethod, startDate, endDate, clearedIds]);

  const clearedSummary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    availableTransactions.forEach(t => {
      if (t.id && clearedIds.has(t.id)) {
        if (t.type === TransactionType.INCOME) income += t.amount;
        else expenses += t.amount;
      }
    });
    return { income, expenses, net: income - expenses };
  }, [availableTransactions, clearedIds]);

  // Logical Balances
  const startBal = parseFloat(openingBalance) || 0;
  const endBal = parseFloat(targetBalance) || 0;
  
  // Effective Balances (Liability is internally negative)
  const effectiveStart = balanceMode === 'liability' ? -startBal : startBal;
  const effectiveEnd = balanceMode === 'liability' ? -endBal : endBal;
  
  const difference = effectiveEnd - (effectiveStart + clearedSummary.net);
  const isBalanced = Math.abs(difference) < 0.005; // Use small epsilon for float precision

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod || targetBalance === '') return;
    setIsSessionActive(true);
    setIsAdding(false);
    setClearedIds(new Set());
    setCurrentDraftId(undefined);
  };

  const handleResumeDraft = (draft: DraftStatement) => {
    setSelectedMethod(draft.paymentMethod);
    setStartDate(draft.startDate);
    setEndDate(draft.endDate);
    setBalanceMode(draft.balanceMode || 'asset');
    // If it was stored as negative but we are in liability mode, show as positive
    setOpeningBalance(draft.balanceMode === 'liability' ? Math.abs(draft.openingBalance).toString() : draft.openingBalance.toString());
    setTargetBalance(draft.balanceMode === 'liability' ? Math.abs(draft.targetBalance).toString() : draft.targetBalance.toString());
    setClearedIds(new Set(draft.transactionIds));
    setCurrentDraftId(draft.id);
    setIsSessionActive(true);
    setIsAdding(false);
  };

  const handleEditStatement = (stmt: StatementRecord) => {
    setSelectedMethod(stmt.paymentMethod);
    setStartDate(''); 
    setEndDate(stmt.statementDate);
    setBalanceMode(stmt.balanceMode || 'asset');
    setOpeningBalance(stmt.balanceMode === 'liability' ? Math.abs(stmt.startingBalance).toString() : stmt.startingBalance.toString());
    setTargetBalance(stmt.balanceMode === 'liability' ? Math.abs(stmt.endingBalance).toString() : stmt.endingBalance.toString());
    setClearedIds(new Set(stmt.transactionIds));
    setCurrentDraftId(undefined); 
    setIsSessionActive(true);
    setIsAdding(false);
  };

  const toggleCleared = (id: number) => {
    const next = new Set(clearedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setClearedIds(next);
  };

  const handleSaveProgress = () => {
    if (!selectedMethod) return;
    const draft: DraftStatement = {
      id: currentDraftId,
      paymentMethod: selectedMethod,
      startDate,
      endDate,
      openingBalance: effectiveStart,
      targetBalance: effectiveEnd,
      transactionIds: Array.from(clearedIds),
      updatedAt: new Date().toISOString(),
      balanceMode
    };
    onSaveDraft(draft);
    setIsSessionActive(false);
    resetForm();
  };

  const handleFinalize = () => {
    if (!isBalanced) return;
    const record: StatementRecord = {
      paymentMethod: selectedMethod,
      statementDate: endDate,
      startingBalance: effectiveStart,
      endingBalance: effectiveEnd,
      transactionIds: Array.from(clearedIds),
      createdAt: new Date().toISOString(),
      balanceMode
    };
    onReconcile(record, currentDraftId);
    setIsSessionActive(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedMethod('');
    setStartDate('');
    setEndDate(getLocalDateString());
    setOpeningBalance('0');
    setTargetBalance('');
    setClearedIds(new Set());
    setCurrentDraftId(undefined);
    setBalanceMode('asset');
  };

  const combinedReconciliations = useMemo(() => {
    const rows = [
      ...drafts.map(d => ({
        id: d.id!,
        date: d.endDate,
        account: d.paymentMethod,
        openingBal: d.openingBalance,
        endingBal: d.targetBalance,
        itemsCount: d.transactionIds.length,
        status: 'Draft' as const,
        type: 'draft' as const,
        balanceMode: d.balanceMode || 'asset',
        raw: d
      })),
      ...statements.map(s => ({
        id: s.id!,
        date: s.statementDate,
        account: s.paymentMethod,
        openingBal: s.startingBalance,
        endingBal: s.endingBalance,
        itemsCount: s.transactionIds.length,
        status: 'Complete' as const,
        type: 'statement' as const,
        balanceMode: s.balanceMode || 'asset',
        raw: s
      }))
    ];

    let result = rows;
    if (methodFilter !== 'ALL') {
      result = result.filter(r => r.account === methodFilter);
    }

    result.sort((a, b) => {
      let valA: any, valB: any;
      if (sortConfig.key === 'date') { valA = a.date; valB = b.date; }
      else if (sortConfig.key === 'account') { valA = a.account.toLowerCase(); valB = b.account.toLowerCase(); }
      else if (sortConfig.key === 'openingBal') { valA = a.openingBal; valB = b.openingBal; }
      else if (sortConfig.key === 'endingBal') { valA = a.endingBal; valB = b.endingBal; }
      else if (sortConfig.key === 'itemsCount') { valA = a.itemsCount; valB = b.itemsCount; }
      else if (sortConfig.key === 'status') { valA = a.status; valB = b.status; }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [statements, drafts, methodFilter, sortConfig]);

  const confirmDelete = () => {
    if (!deletingItem) return;
    if (deletingItem.type === 'draft') {
      onDeleteDraft(deletingItem.id);
    } else {
      onDeleteStatement(deletingItem.id);
    }
    setDeletingItem(null);
  };

  const handleSort = (key: ReconSortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIndicator = ({ columnKey }: { columnKey: ReconSortKey }) => {
    if (sortConfig.key !== columnKey) return <SortAsc size={10} className="ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? <SortAsc size={10} className="ml-1 text-blue-600" /> : <SortDesc size={10} className="ml-1 text-blue-600" />;
  };

  if (isSessionActive) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-500 pb-20">
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-xl sticky top-0 z-40">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-8">
            {/* Account Info Section */}
            <div className="flex items-center gap-5 shrink-0">
              <div className={`w-14 h-14 ${balanceMode === 'liability' ? 'bg-rose-600' : 'bg-blue-600'} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100`}>
                {balanceMode === 'liability' ? <TrendingDown size={28} /> : <TrendingUp size={28} />}
              </div>
              <div>
                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-tight">{selectedMethod}</h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                  <span className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <Calendar size={12} className="text-blue-500" /> {startDate || 'Start'} — {endDate}
                  </span>
                  <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                  <span className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <DollarSign size={12} className={balanceMode === 'liability' ? 'text-rose-500' : 'text-emerald-500'} /> 
                    {balanceMode === 'liability' ? 'Opening Debt' : 'Opening Balance'}: ${startBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Status Metrics */}
            <div className="flex-1 flex flex-wrap items-center justify-center gap-8 bg-gray-50/50 py-4 px-8 rounded-[24px] border border-gray-100/50">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target size={12} className="text-gray-400" />
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">{balanceMode === 'liability' ? 'Target Debt' : 'Target Balance'}</p>
                </div>
                <p className="text-lg font-black text-gray-900 leading-none">
                  ${endBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="w-px h-8 bg-gray-200"></div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity size={12} className="text-gray-400" />
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">Cleared Total</p>
                </div>
                <p className={`text-lg font-black leading-none ${clearedSummary.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${clearedSummary.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="w-px h-8 bg-gray-200"></div>

              <div className={`flex flex-col items-center px-6 py-2 rounded-2xl transition-all duration-300 ${
                isBalanced ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {isBalanced ? <CheckCircle2 size={12} className="text-emerald-600" /> : <AlertTriangle size={12} className="text-rose-600" />}
                  <p className={`text-[9px] font-black uppercase tracking-[0.15em] ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isBalanced ? 'Status: Balanced' : 'Out of Balance'}
                  </p>
                </div>
                <p className={`text-lg font-black leading-none ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isBalanced ? 'OK' : `$${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </p>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center bg-gray-100 p-1 rounded-2xl">
                <button 
                  onClick={handleSaveProgress}
                  className="p-3 text-blue-600 rounded-xl hover:bg-white hover:shadow-sm transition-all active:scale-95 group"
                  title="Save Draft & Exit"
                >
                  <Save size={20} className="group-hover:scale-110 transition-transform" />
                </button>
                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                <button 
                  onClick={() => { setIsSessionActive(false); resetForm(); }}
                  className="p-3 text-gray-500 rounded-xl hover:bg-white hover:shadow-sm transition-all active:scale-95 group"
                  title="Cancel Changes"
                >
                  <X size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>
              <button 
                disabled={!isBalanced}
                onClick={handleFinalize}
                className={`h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 transition-all ${
                  isBalanced 
                    ? 'bg-gray-900 text-white shadow-xl shadow-gray-200 hover:bg-black active:scale-95' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                }`}
              >
                Finalize Statement <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-700 delay-150">
          <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListOrdered size={16} className="text-gray-400" />
              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Match items against bank statement</h5>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-sm"></div>
                <span className="text-[9px] font-black uppercase text-gray-500 tracking-tighter">In / Payment: ${clearedSummary.income.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-rose-500 rounded-full shadow-sm"></div>
                <span className="text-[9px] font-black uppercase text-gray-500 tracking-tighter">Out / Spend: ${clearedSummary.expenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white sticky top-0">
                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="px-8 py-4 w-16 text-center">Clear</th>
                  <th className="px-8 py-4">Date</th>
                  <th className="px-8 py-4">Payee</th>
                  <th className="px-8 py-4">Category</th>
                  <th className="px-8 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {availableTransactions.map(t => {
                  const isCleared = t.id && clearedIds.has(t.id);
                  return (
                    <tr 
                      key={t.id} 
                      onClick={() => t.id && toggleCleared(t.id)}
                      className={`group cursor-pointer transition-all ${isCleared ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-8 py-5">
                        <div className={`mx-auto w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isCleared ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'border-gray-200 group-hover:border-blue-400'
                        }`}>
                          {isCleared && <CheckCircle2 size={14} />}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{t.date}</td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{t.merchant || 'Undefined'}</p>
                        {t.description && <p className="text-[9px] font-bold text-gray-400 uppercase truncate max-w-[200px]">{t.description}</p>}
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[9px] font-black text-gray-500 uppercase tracking-tight border border-gray-200/50">{t.category}</span>
                      </td>
                      <td className={`px-8 py-5 text-right text-sm font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                {availableTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-20">
                        <ShieldCheck size={48} />
                        <p className="text-[10px] font-black uppercase tracking-widest">No matching records found in this range</p>
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
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 text-blue-600">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Statement Reconciliation</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cross-check your records with official bank statements.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> ADD NEW
        </button>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 text-[10px] font-black text-gray-400 uppercase">
          <Filter size={14} /> Filter Results
        </div>
        <select 
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none cursor-pointer"
        >
          <option value="ALL">All Accounts</option>
          {paymentMethods.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                <th className="px-8 py-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                  <div className="flex items-center">Statement Date <SortIndicator columnKey="date" /></div>
                </th>
                <th className="px-8 py-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('account')}>
                  <div className="flex items-center">Account <SortIndicator columnKey="account" /></div>
                </th>
                <th className="px-8 py-4 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('openingBal')}>
                  <div className="flex items-center justify-end">Opening Bal <SortIndicator columnKey="openingBal" /></div>
                </th>
                <th className="px-8 py-4 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('endingBal')}>
                  <div className="flex items-center justify-end">Ending Bal <SortIndicator columnKey="endingBal" /></div>
                </th>
                <th className="px-8 py-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('itemsCount')}>
                  <div className="flex items-center justify-center">Items <SortIndicator columnKey="itemsCount" /></div>
                </th>
                <th className="px-8 py-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center">Status <SortIndicator columnKey="status" /></div>
                </th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {combinedReconciliations.map(r => (
                <tr key={`${r.type}-${r.id}`} className="hover:bg-gray-50 group transition-colors">
                  <td className="px-8 py-5 text-[11px] font-bold text-gray-900 uppercase tracking-tight">
                    {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 ${r.balanceMode === 'liability' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'} rounded-lg text-[10px] font-black uppercase tracking-tight`}>{r.account}</span>
                  </td>
                  <td className="px-8 py-5 text-right text-[11px] font-bold text-gray-400">${Math.abs(r.openingBal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-8 py-5 text-right text-sm font-black text-gray-900">${Math.abs(r.endingBal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-8 py-5 text-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase">{r.itemsCount} Records</span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${
                      r.status === 'Draft' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => r.type === 'draft' ? handleResumeDraft(r.raw as DraftStatement) : handleEditStatement(r.raw as StatementRecord)}
                        className="p-2 rounded-xl transition-all text-blue-600 hover:bg-blue-50"
                        title={r.type === 'draft' ? "Resume Draft" : "Re-open Statement"}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setDeletingItem({ id: r.id, type: r.type, name: r.account })}
                        className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete Reconciliation"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {combinedReconciliations.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <ShieldCheck size={48} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No reconciliation history found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Plus size={18} /></div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Start Reconciliation</h3>
              </div>
              <button onClick={() => { setIsAdding(false); resetForm(); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleStartSession} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account</label>
                <select 
                  required
                  value={selectedMethod} 
                  onChange={e => setSelectedMethod(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer"
                >
                  <option value="">Choose Account...</option>
                  {paymentMethods.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Nature</label>
                <div className="flex bg-gray-100 p-1 rounded-xl h-11">
                  <button 
                    type="button"
                    onClick={() => setBalanceMode('asset')} 
                    className={`flex-1 rounded-lg text-[10px] font-black uppercase transition-all ${balanceMode === 'asset' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                  >
                    Asset / Savings
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBalanceMode('liability')} 
                    className={`flex-1 rounded-lg text-[10px] font-black uppercase transition-all ${balanceMode === 'liability' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}
                  >
                    Liability / Debt
                  </button>
                </div>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest px-2 mt-1">
                  {balanceMode === 'liability' 
                    ? 'Enter debt amounts as positive numbers (e.g. $500.00 for what you owe).' 
                    : 'Enter available balances as positive numbers (e.g. $1,000.00 in your account).'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    {balanceMode === 'liability' ? 'Opening Debt' : 'Opening Bal'}
                  </label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="number" step="0.01" required
                      value={openingBalance}
                      onChange={e => setOpeningBalance(e.target.value)}
                      className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    {balanceMode === 'liability' ? 'Target Debt' : 'Target Bal'}
                  </label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="number" step="0.01" required
                      value={targetBalance}
                      onChange={e => setTargetBalance(e.target.value)}
                      className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</label>
                  <input 
                    type="date" 
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  type="submit"
                  className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  Next Step <ChevronRight size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center border border-gray-100 shadow-2xl">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black uppercase mb-2 text-gray-900">
              {deletingItem.type === 'statement' ? 'Delete Statement Record?' : 'Delete Draft?'}
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to remove the reconciliation for <span className="font-bold text-gray-800">"{deletingItem.name}"</span>? 
              This will not delete the actual transactions.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingItem(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reconciliation;
