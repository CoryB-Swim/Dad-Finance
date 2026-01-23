import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, 
  ListOrdered, 
  RefreshCcw,
  CheckCircle2,
  Tags,
  Store,
  Database,
  Cloud,
  Repeat,
  Upload,
  Download,
  CreditCard,
  CloudCheck,
  CloudAlert,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { 
  initDB, 
  getAllTransactions, 
  addTransaction, 
  updateTransaction,
  bulkUpdateTransactions,
  deleteTransaction, 
  deleteTransactions,
  getAllCategories, 
  addCategory,
  updateCategory,
  deleteCategory,
  mergeCategories,
  moveSubCategory,
  importAllData,
  getAllMerchants,
  addMerchant,
  updateMerchant,
  deleteMerchant,
  mergeMerchants,
  getAllTemplates,
  addTemplate,
  deleteTemplate,
  updateTemplate,
  getAllPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getAllStatements,
  addStatement,
  deleteStatement,
  getAllDrafts,
  saveDraft,
  deleteDraft
} from './services/db';
import { 
  initGoogleAuth, 
  requestAccessToken, 
  isAuthorized, 
  syncToDrive, 
  getFromDrive,
  isDriveEnabledInStorage
} from './services/googleDrive';
import { Transaction, Category, Merchant, RecurringTemplate, PaymentMethod, View, TransactionType, StatementRecord, DraftStatement } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import Management from './components/Management';
import Templates from './components/Templates';
import Reconciliation from './components/Reconciliation';

const LOCAL_UPDATE_KEY = 'fintrack_last_local_update';

const getLocalDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [statements, setStatements] = useState<StatementRecord[]>([]);
  const [drafts, setDrafts] = useState<DraftStatement[]>([]);
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info' | 'error', canUndo?: boolean} | null>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  
  const [initialListFilter, setInitialListFilter] = useState<{ value: string, type: any } | null>(null);
  const [targetMerchantName, setTargetMerchantName] = useState<string | null>(null);

  const [undoBuffer, setUndoBuffer] = useState<any | null>(null);

  const legacyFileInputRef = useRef<HTMLInputElement>(null);
  const syncTimeoutRef = useRef<number | null>(null);

  const refreshData = useCallback(async (targetDb?: IDBDatabase) => {
    const database = targetDb || db;
    if (!database) return;
    try {
      const [txs, cats, vends, tmps, pmeths, stmts, dfts] = await Promise.all([
        getAllTransactions(database),
        getAllCategories(database),
        getAllMerchants(database),
        getAllTemplates(database),
        getAllPaymentMethods(database),
        getAllStatements(database),
        getAllDrafts(database)
      ]);
      setTransactions(txs);
      setCategories(cats);
      setMerchants(vends);
      setTemplates(tmps);
      setPaymentMethods(pmeths);
      setStatements(stmts);
      setDrafts(dfts);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  }, [db]);

  const captureSnapshot = async () => {
    if (!db) return null;
    return {
      transactions: await getAllTransactions(db),
      categories: await getAllCategories(db),
      merchants: await getAllMerchants(db),
      paymentMethods: await getAllPaymentMethods(db),
      templates: await getAllTemplates(db),
      statements: await getAllStatements(db),
      drafts: await getAllDrafts(db)
    };
  };

  const handleUndo = async () => {
    if (!undoBuffer || !db) return;
    try {
      await importAllData(db, undoBuffer);
      await refreshData();
      setUndoBuffer(null);
      showNotification('Action reverted');
      markLocalChange();
    } catch (err) {
      showNotification('Undo failed', 'error');
    }
  };

  const performSync = async (activeDb?: IDBDatabase, silent = false) => {
    const database = activeDb || db;
    if (!database) return;
    if (!isAuthorized()) return;
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const cloudData = await getFromDrive();
      const localLastUpdate = localStorage.getItem(LOCAL_UPDATE_KEY) || '0';
      let shouldPush = true;
      if (cloudData && cloudData.lastUpdated) {
        const cloudTime = new Date(cloudData.lastUpdated).getTime();
        const localTime = new Date(localLastUpdate).getTime();
        if (cloudTime > localTime || (!silent && cloudTime >= localTime)) {
          await importAllData(database, cloudData);
          await refreshData(database);
          localStorage.setItem(LOCAL_UPDATE_KEY, cloudData.lastUpdated);
          shouldPush = false; 
          if (!silent) showNotification('Cloud data restored');
        }
      }
      if (shouldPush) {
        const [txs, cats, vends, pmeths, tmps, stmts, dfts] = await Promise.all([
          getAllTransactions(database),
          getAllCategories(database),
          getAllMerchants(database),
          getAllPaymentMethods(database),
          getAllTemplates(database),
          getAllStatements(database),
          getAllDrafts(database)
        ]);
        const currentTimestamp = new Date().toISOString();
        await syncToDrive({
          transactions: txs,
          categories: cats,
          merchants: vends,
          paymentMethods: pmeths,
          templates: tmps,
          statements: stmts,
          drafts: dfts,
          lastUpdated: currentTimestamp
        } as any);
        localStorage.setItem(LOCAL_UPDATE_KEY, currentTimestamp);
      }
      setIsDriveConnected(true);
      setSyncStatus('success');
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      if (!silent) showNotification('Drive Sync Complete');
    } catch (err: any) {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const setup = async () => {
      try {
        const database = await initDB();
        setDb(database);
        await refreshData(database);
        await initGoogleAuth(() => {
          setIsDriveConnected(true);
          performSync(database, true);
        });
        if (isDriveEnabledInStorage()) {
          requestAccessToken(); 
        }
      } catch (err) {
        console.error('Failed to init app', err);
      } finally {
        setIsLoading(false);
      }
    };
    setup();
  }, []);

  const markLocalChange = () => {
    localStorage.setItem(LOCAL_UPDATE_KEY, new Date().toISOString());
    triggerAutoSync();
  };

  const triggerAutoSync = () => {
    if (!isAuthorized()) return;
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    setSyncStatus('syncing');
    syncTimeoutRef.current = window.setTimeout(() => {
      performSync(undefined, true);
    }, 1500);
  };

  const handleManualSync = async () => {
    if (!isAuthorized()) {
      requestAccessToken();
      return;
    }
    await performSync();
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success', canUndo: boolean = false) => {
    setNotification({ message, type, canUndo });
    setTimeout(() => setNotification(null), type === 'error' ? 8000 : 5000);
  };

  const handleExportData = async () => {
    if (!db) return;
    try {
      const data = { transactions, categories, merchants, paymentMethods, templates, statements, drafts, exportDate: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dad-finance-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showNotification('Data exported');
    } catch (err) {
      showNotification('Export failed', 'error');
    }
  };

  const parseLegacyDate = (dateVal: any): string => {
    if (!dateVal) return getLocalDateString();
    if (typeof dateVal === 'number') {
      try {
        const date = XLSX.SSF.parse_date_code(dateVal);
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      } catch (e) {
        return getLocalDateString();
      }
    }
    const dateStr = String(dateVal).trim();
    const nativeDate = new Date(dateStr);
    if (!isNaN(nativeDate.getTime())) return nativeDate.toISOString().split('T')[0];
    return getLocalDateString();
  };

  const handleLegacyImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db) return;
    try {
      const snapshot = await captureSnapshot();
      setUndoBuffer(snapshot);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true });
      if (jsonData.length === 0) return;
      const newCatsMap = new Map<string, Set<string>>();
      const newMerchantsSet = new Set<string>();
      let importedCount = 0;
      const tx = db.transaction(['transactions'], 'readwrite');
      const store = tx.objectStore('transactions');
      for (const row of jsonData) {
        const keys = Object.keys(row);
        const dateKey = keys.find(k => k.toUpperCase().includes('DATE'));
        const vendorKey = keys.find(k => k.toUpperCase().includes('VENDOR') || k.toUpperCase().includes('MERCHANT'));
        const amountKey = keys.find(k => k.toUpperCase().includes('AMOU'));
        if (!dateKey || !amountKey) continue;
        const amount = parseFloat(String(row[amountKey]).replace(/[$,\s]/g, '')) || 0;
        const categoryFull = String(row['Category'] || 'Other');
        const [catName, subName] = categoryFull.includes(':') ? categoryFull.split(':').map(s => s.trim()) : [categoryFull, ''];
        if (catName) {
          if (!newCatsMap.has(catName)) newCatsMap.set(catName, new Set());
          if (subName) newCatsMap.get(catName)!.add(subName);
        }
        const merchantName = String(row[vendorKey] || '').trim();
        if (merchantName) newMerchantsSet.add(merchantName);
        const item: Transaction = {
          date: parseLegacyDate(row[dateKey]),
          merchant: merchantName || 'Undefined',
          amount: Math.abs(amount),
          type: amount > 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
          category: catName || 'Other',
          subCategory: subName || undefined,
          description: ''
        };
        store.add(item);
        importedCount++;
      }
      tx.oncomplete = async () => {
        for (const [catName, subs] of newCatsMap.entries()) {
          const existing = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          if (!existing) await addCategory(db, { name: catName, type: TransactionType.BOTH, subCategories: Array.from(subs) });
          else await updateCategory(db, { ...existing, subCategories: Array.from(new Set([...(existing.subCategories || []), ...Array.from(subs)])) });
        }
        for (const vName of newMerchantsSet) {
          const existing = merchants.find(m => m.name.toLowerCase() === vName.toLowerCase());
          if (!existing) await addMerchant(db, { name: vName });
        }
        await refreshData();
        showNotification(`Imported ${importedCount} transactions.`, 'success', true);
        markLocalChange();
      };
    } catch (err) { showNotification('Excel import failed.', 'error'); }
  };

  const handleImportData = async (file: File) => {
    if (!db) return;
    try {
      const snapshot = await captureSnapshot();
      setUndoBuffer(snapshot);
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(db, data);
      await refreshData();
      showNotification('Data restored', 'success', true);
      markLocalChange();
    } catch (err) { showNotification('Restore failed', 'error'); }
  };

  const handleAddTransaction = async (t: Transaction) => {
    if (!db) return;
    await addTransaction(db, t);
    await refreshData();
    showNotification('Transaction added');
    markLocalChange();
  };

  const handleUpdateTransaction = async (t: Transaction) => {
    if (!db) return;
    await updateTransaction(db, t);
    await refreshData();
    showNotification('Transaction updated');
    markLocalChange();
  };

  const handleBulkUpdateTransactions = async (updates: Transaction[]) => {
    if (!db || updates.length === 0) return;
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await bulkUpdateTransactions(db, updates);
    await refreshData();
    showNotification(`${updates.length} items updated`, 'success', true);
    markLocalChange();
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!db) return;
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await deleteTransaction(db, id);
    await refreshData();
    showNotification('Transaction deleted', 'success', true);
    markLocalChange();
  };

  const handleDeleteMultipleTransactions = async (ids: number[]) => {
    if (!db || ids.length === 0) return;
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await deleteTransactions(db, ids);
    await refreshData();
    showNotification(`${ids.length} transactions deleted`, 'success', true);
    markLocalChange();
  };

  const handleAddCategory = (c: Category) => addCategory(db!, c).then(() => { refreshData(); markLocalChange(); });
  
  const handleUpdateCategory = async (newCat: Category) => {
    if (!db) return;
    const oldCat = categories.find(c => c.id === newCat.id);
    if (!oldCat) return;
    await updateCategory(db, newCat);
    if (oldCat.name !== newCat.name) {
      const txsToUpdate = transactions.filter(t => t.category === oldCat.name);
      if (txsToUpdate.length > 0) {
        await bulkUpdateTransactions(db, txsToUpdate.map(t => ({ ...t, category: newCat.name })));
      }
    }
    await refreshData();
    showNotification('Category updated');
    markLocalChange();
  };

  const handleDeleteCategory = async (id: number) => {
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await deleteCategory(db!, id);
    await refreshData(); 
    showNotification('Category deleted', 'success', true);
    markLocalChange();
  };
  
  const handleMergeCategories = async (sourceNames: string[], targetCategory: Category, sourceIds: number[]) => {
    if (!db) return;
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await mergeCategories(db, sourceNames, targetCategory, sourceIds);
    await refreshData();
    showNotification('Categories merged successfully', 'success', true);
    markLocalChange();
  };

  const handleMoveSubCategory = async (subName: string, sourceCatId: number, targetCatName: string) => {
    if (!db) return;
    const sourceCat = categories.find(c => c.id === sourceCatId);
    const targetCat = categories.find(c => c.name === targetCatName);
    if (!sourceCat || !targetCat) return;

    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await moveSubCategory(db, subName, sourceCat, targetCat);
    await refreshData();
    showNotification(`Moved "${subName}" to ${targetCat.name}`, 'success', true);
    markLocalChange();
  };

  const handleDeleteSubCategory = async (catId: number, subName: string) => {
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      await updateCategory(db!, { ...cat, subCategories: (cat.subCategories || []).filter(s => s !== subName) });
      await refreshData();
      markLocalChange();
    }
  };

  const handleRenameSubCategory = async (catId: number, oldName: string, newName: string) => {
    if (!db) return;
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const updatedSubs = (cat.subCategories || []).map(s => s === oldName ? newName : s);
    await updateCategory(db, { ...cat, subCategories: updatedSubs });
    const txsToUpdate = transactions.filter(t => t.category === cat.name && t.subCategory === oldName);
    if (txsToUpdate.length > 0) {
      await bulkUpdateTransactions(db, txsToUpdate.map(t => ({ ...t, subCategory: newName })));
    }
    await refreshData();
    showNotification('Sub-category renamed');
    markLocalChange();
  };

  const handleAddMerchant = (v: Merchant) => addMerchant(db!, v).then(() => { refreshData(); markLocalChange(); });
  
  const handleUpdateMerchant = async (newMerchant: Merchant) => {
    if (!db) return;
    const oldMerchant = merchants.find(m => m.id === newMerchant.id);
    if (!oldMerchant) return;
    await updateMerchant(db, newMerchant);
    if (oldMerchant.name !== newMerchant.name) {
      const txsToUpdate = transactions.filter(t => t.merchant === oldMerchant.name);
      if (txsToUpdate.length > 0) {
        await bulkUpdateTransactions(db, txsToUpdate.map(t => ({ ...t, merchant: newMerchant.name })));
      }
    }
    await refreshData();
    showNotification('Merchant updated');
    markLocalChange();
  };

  const handleDeleteMerchant = async (id: number) => {
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await deleteMerchant(db!, id);
    await refreshData();
    showNotification('Merchant deleted', 'success', true);
    markLocalChange();
  };
  
  const handleMergeMerchants = async (sourceNames: string[], targetName: string, sourceIds: number[]) => {
    if (!db) return;
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await mergeMerchants(db, sourceNames, targetName, sourceIds);
    await refreshData();
    showNotification('Merchants merged successfully', 'success', true);
    markLocalChange();
  };

  const handleAddPaymentMethod = (p: PaymentMethod) => addPaymentMethod(db!, p).then(() => { refreshData(); markLocalChange(); });
  const handleUpdatePaymentMethod = (p: PaymentMethod) => updatePaymentMethod(db!, p).then(() => { refreshData(); markLocalChange(); });
  const handleDeletePaymentMethod = (id: number) => deletePaymentMethod(db!, id).then(() => { refreshData(); markLocalChange(); });

  const handleAddTemplate = (t: RecurringTemplate) => {
    addTemplate(db!, t).then(() => {
      refreshData();
      showNotification('Template created');
      markLocalChange();
    });
  };

  const handleSaveAsTemplate = (t: Transaction) => {
    const tmp: RecurringTemplate = {
      name: t.merchant || t.category,
      amount: t.amount,
      category: t.category,
      subCategory: t.subCategory,
      merchant: t.merchant || 'Undefined',
      paymentMethod: t.paymentMethod,
      description: t.description || '',
      type: t.type,
      schedule: { frequency: 'none' }
    };
    addTemplate(db!, tmp).then(() => {
      refreshData();
      showNotification('Saved to Recurring');
      markLocalChange();
    });
  };

  const handlePostTemplate = async (tmp: RecurringTemplate) => {
    if (!db) return;
    const today = getLocalDateString();
    const tx: Transaction = {
      amount: tmp.amount, date: today, category: tmp.category, subCategory: tmp.subCategory, merchant: tmp.merchant || 'Undefined',
      paymentMethod: tmp.paymentMethod, description: tmp.description, type: tmp.type, fromTemplate: true
    };
    await addTransaction(db, tx);
    await updateTemplate(db, { ...tmp, lastPostedDate: today });
    await refreshData();
    showNotification('Transaction posted');
    markLocalChange();
  };

  const handleDeleteTemplate = (id: number) => deleteTemplate(db!, id).then(() => { refreshData(); markLocalChange(); });
  const handleUpdateTemplate = (t: RecurringTemplate) => updateTemplate(db!, t).then(() => { refreshData(); markLocalChange(); });

  const handleReconcile = async (statement: StatementRecord, draftId?: number) => {
    if (!db) return;
    const txIds = new Set(statement.transactionIds);
    const updatedTxs = transactions.map(t => {
      if (t.id && txIds.has(t.id)) return { ...t, reconciled: true, clearedAt: statement.statementDate };
      return t;
    });
    await bulkUpdateTransactions(db, updatedTxs);
    await addStatement(db, statement);
    if (draftId !== undefined) await deleteDraft(db, draftId);
    await refreshData();
    showNotification('Statement reconciled');
    markLocalChange();
  };

  const handleSaveDraft = async (draft: DraftStatement) => {
    if (!db) return;
    await saveDraft(db, draft);
    await refreshData();
    showNotification('Progress saved');
    markLocalChange();
  };

  const handleDeleteDraft = async (id: number) => {
    if (!db) return;
    await deleteDraft(db, id);
    await refreshData();
    showNotification('Draft deleted');
    markLocalChange();
  };

  const handleDeleteStatement = async (id: number) => {
    if (!db) return;
    const stmt = statements.find(s => s.id === id);
    if (!stmt) return;
    const txIds = new Set(stmt.transactionIds);
    const updatedTxs = transactions.map(t => {
      if (t.id && txIds.has(t.id)) return { ...t, reconciled: false, clearedAt: undefined };
      return t;
    });
    await bulkUpdateTransactions(db, updatedTxs);
    await deleteStatement(db, id);
    await refreshData();
    showNotification('Reconciliation undone');
    markLocalChange();
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><RefreshCcw className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 p-4 flex flex-col fixed h-full z-10">
        <div className="mb-8 px-4 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg"><LayoutDashboard className="text-white" size={24} /></div>
          <h1 className="text-xl font-bold hidden lg:block uppercase tracking-tighter">Dad Finance</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="list" icon={ListOrdered} label="Transactions" />
          <NavItem view="templates" icon={Repeat} label="Recurring" />
          <NavItem view="categories" icon={Tags} label="Categories" />
          <NavItem view="merchants" icon={Store} label="Merchants" />
          <NavItem view="payments" icon={CreditCard} label="Payment Methods" />
          <NavItem view="reconciliation" icon={ShieldCheck} label="Reconciliation" />
        </nav>
        <div className="border-t pt-4 space-y-2">
           <button onClick={handleManualSync} className={`flex flex-col gap-1 px-4 py-2 rounded-xl w-full text-left transition-all ${syncStatus === 'error' ? 'bg-rose-50' : 'hover:bg-gray-100'}`}>
             <div className="flex items-center gap-3">
               {syncStatus === 'syncing' ? ( <RefreshCcw size={18} className="animate-spin text-blue-500" /> ) 
               : syncStatus === 'error' ? ( <CloudAlert size={18} className="text-rose-500" /> ) 
               : syncStatus === 'success' ? ( <Cloud size={18} className="text-emerald-500" /> ) 
               : ( <Cloud size={18} className={isDriveConnected ? 'text-blue-500' : 'text-gray-400'} /> )}
               <span className={`hidden lg:inline text-[10px] font-black uppercase tracking-tight ${syncStatus === 'error' ? 'text-rose-600' : 'text-gray-500'}`}>
                 {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Failed' : isDriveConnected ? 'Drive Linked' : 'Link Drive'}
               </span>
             </div>
             {lastSyncedAt && !isSyncing && ( <span className="hidden lg:inline text-[8px] font-bold text-gray-300 ml-7 uppercase">Synced {lastSyncedAt}</span> )}
           </button>
           <button onClick={() => setActiveView('backups')} className="flex items-center gap-3 px-4 py-2 rounded-xl w-full text-left text-gray-500 hover:bg-gray-100 transition-all">
             <Database size={18} /> <span className="hidden lg:inline text-xs font-bold">Backups</span>
           </button>
           <div className="relative group/imp">
              <input type="file" accept=".xls,.xlsx,.csv" ref={legacyFileInputRef} onChange={handleLegacyImport} className="hidden" />
              <button onClick={() => legacyFileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-2 rounded-xl w-full text-left text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all">
                <Upload size={18} /> <span className="hidden lg:inline text-xs font-bold">Import Excel</span>
              </button>
           </div>
        </div>
      </aside>

      <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-10">
        {notification && (
          <div className="fixed top-6 right-6 z-[1000]">
            <div className={`px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-right duration-300 ${notification.type === 'error' ? 'bg-rose-600' : notification.type === 'info' ? 'bg-amber-600' : 'bg-emerald-600'}`}>
              <CheckCircle2 size={20} /> 
              <span className="font-medium text-sm font-bold uppercase">{notification.message}</span>
              {notification.canUndo && (
                <button 
                  onClick={handleUndo}
                  className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/40 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                  <RotateCcw size={12} /> Undo
                </button>
              )}
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto">
          {activeView === 'dashboard' && <Dashboard transactions={transactions} categories={categories} />}
          {activeView === 'list' && (
            <TransactionList 
              transactions={transactions} categories={categories} merchants={merchants} paymentMethods={paymentMethods}
              drafts={drafts}
              onDelete={handleDeleteTransaction} onDeleteMultiple={handleDeleteMultipleTransactions}
              onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} 
              onBulkUpdateTransactions={handleBulkUpdateTransactions}
              onAddCategory={handleAddCategory} onUpdateCategory={handleUpdateCategory}
              onAddMerchant={handleAddMerchant} onAddPaymentMethod={handleAddPaymentMethod}
              onSaveAsTemplate={handleSaveAsTemplate} initialFilter={initialListFilter}
              onClearInitialFilter={() => setInitialListFilter(null)}
              onViewMerchantDetail={(name) => { setTargetMerchantName(name); setActiveView('merchants'); }}
            />
          )}
          {activeView === 'reconciliation' && (
            <Reconciliation 
              transactions={transactions} 
              paymentMethods={paymentMethods} 
              statements={statements}
              drafts={drafts}
              onReconcile={handleReconcile}
              onDeleteStatement={handleDeleteStatement}
              onSaveDraft={handleSaveDraft}
              onDeleteDraft={handleDeleteDraft}
            />
          )}
          {activeView === 'templates' && <Templates templates={templates} onPost={handlePostTemplate} onDelete={handleDeleteTemplate} onUpdate={handleUpdateTemplate} onAdd={handleAddTemplate} onAddPaymentMethod={handleAddPaymentMethod} transactions={transactions} categories={categories} merchants={merchants} paymentMethods={paymentMethods} />}
          {(['categories', 'merchants', 'payments', 'backups'].includes(activeView)) && (
            <Management 
              mode={activeView as any} categories={categories} transactions={transactions} 
              onAddCategory={handleAddCategory} onUpdateCategory={handleUpdateCategory} onDeleteCategory={handleDeleteCategory} onDeleteSubCategory={handleDeleteSubCategory} onRenameSubCategory={handleRenameSubCategory}
              onMergeCategories={handleMergeCategories}
              onMoveSubCategory={handleMoveSubCategory}
              merchants={merchants} onAddMerchant={handleAddMerchant} onUpdateMerchant={handleUpdateMerchant} onDeleteMerchant={handleDeleteMerchant} onMergeMerchants={handleMergeMerchants}
              paymentMethods={paymentMethods} onAddPaymentMethod={handleAddPaymentMethod} onUpdatePaymentMethod={handleUpdatePaymentMethod} onDeletePaymentMethod={handleDeletePaymentMethod}
              onExport={handleExportData} onImport={handleImportData}
              onViewMerchantTransactions={(name) => { setInitialListFilter({ value: name, type: 'merchant' }); setActiveView('list'); }}
              targetMerchantName={targetMerchantName} onClearTargetMerchant={() => setTargetMerchantName(null)}
            />
          )}
        </div>
      </main>
    </div>
  );

  function NavItem({ view, icon: Icon, label }: { view: View, icon: any, label: string }) {
    return (
      <button
        onClick={() => setActiveView(view)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left font-bold text-xs uppercase tracking-tight ${
          activeView === view ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-100'
        }`}
      >
        <Icon size={18} />
        <span className="hidden lg:inline">{label}</span>
      </button>
    );
  }
};

export default App;