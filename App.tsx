
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
  CloudOff,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  Shield,
  Zap,
  Info,
  X
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

/**
 * Robust date helpers to avoid UTC/Local shifts that cause infinite loops.
 */
const formatDateLocal = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseDateLocal = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getLocalDateString = () => formatDateLocal(new Date());

/**
 * Shared utility for recurrence calculation.
 * Uses local time strictly to prevent the infinite loops common with UTC string conversions.
 */
const calculateNextDate = (tmp: RecurringTemplate): string | null => {
  if (!tmp.schedule || tmp.schedule.frequency === 'none') return null;

  const s = tmp.schedule;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = tmp.lastPostedDate ? parseDateLocal(tmp.lastPostedDate) : new Date(today);
  next.setHours(0, 0, 0, 0);
  
  if (tmp.lastPostedDate) {
    next.setDate(next.getDate() + 1);
  }

  if (s.frequency === 'daily') {
    return formatDateLocal(next);
  } 
  
  if (s.frequency === 'weekly') {
    while (next.getDay() !== s.dayOfWeek) {
      next.setDate(next.getDate() + 1);
    }
    return formatDateLocal(next);
  } 
  
  if (s.frequency === 'monthly') {
    if (s.dayOfMonth) {
      let targetDate = new Date(next.getFullYear(), next.getMonth(), s.dayOfMonth);
      if (targetDate < next) {
        targetDate.setMonth(targetDate.getMonth() + 1, s.dayOfMonth);
      }
      return formatDateLocal(targetDate);
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
        if (week === 5) { // Last week logic
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
      return result ? formatDateLocal(result) : null;
    }
  } 
  
  if (s.frequency === 'yearly') {
    if (tmp.lastPostedDate) {
      next = parseDateLocal(tmp.lastPostedDate);
      next.setFullYear(next.getFullYear() + 1);
    }
    return formatDateLocal(next);
  }

  return null;
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
  const [showCloudGuard, setShowCloudGuard] = useState(false);
  
  const [dueTemplates, setDueTemplates] = useState<RecurringTemplate[]>([]);
  
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

      // Check for due items after templates are loaded
      checkForDueItems(tmps);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  }, [db]);

  const checkForDueItems = (tmps: RecurringTemplate[]) => {
    const today = getLocalDateString();
    const due = tmps.filter(t => {
      const next = calculateNextDate(t);
      return next && next <= today;
    });
    setDueTemplates(due);
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
        const currentTimestamp = new Date().toISOString();
        await syncToDrive({
          transactions,
          categories,
          merchants,
          paymentMethods,
          templates,
          statements,
          drafts,
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
          setShowCloudGuard(false);
          performSync(database, true);
        });

        if (isDriveEnabledInStorage()) {
          requestAccessToken('none'); 
        } else {
          setShowCloudGuard(true);
        }

        const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden' && isAuthorized()) {
            performSync(database, true);
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);

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
    }, 3000); 
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
    if (!isNaN(nativeDate.getTime())) return formatDateLocal(nativeDate);
    return getLocalDateString();
  };

  const handleAddTransaction = async (t: Transaction) => {
    if (!db) return;
    const newId = await addTransaction(db, t);
    const completeTx = { ...t, id: newId };
    setTransactions(prev => [...prev, completeTx]);
    showNotification('Transaction added');
    markLocalChange();
  };

  const handleUpdateTransaction = async (t: Transaction) => {
    if (!db) return;
    await updateTransaction(db, t);
    setTransactions(prev => prev.map(item => item.id === t.id ? t : item));
    showNotification('Transaction updated');
    markLocalChange();
  };

  const handleBulkUpdateTransactions = async (updates: Transaction[]) => {
    if (!db || updates.length === 0) return;
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await bulkUpdateTransactions(db, updates);
    const updateMap = new Map(updates.map(u => [u.id, u]));
    setTransactions(prev => prev.map(item => item.id && updateMap.has(item.id) ? updateMap.get(item.id)! : item));
    showNotification(`${updates.length} items updated`, 'success', true);
    markLocalChange();
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!db) return;
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await deleteTransaction(db, id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    showNotification('Transaction deleted', 'success', true);
    markLocalChange();
  };

  const handleDeleteMultipleTransactions = async (ids: number[]) => {
    if (!db || ids.length === 0) return;
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await deleteTransactions(db, ids);
    const idSet = new Set(ids);
    setTransactions(prev => prev.filter(t => t.id && !idSet.has(t.id)));
    showNotification(`${ids.length} transactions deleted`, 'success', true);
    markLocalChange();
  };

  const handleAddCategory = (c: Category) => addCategory(db!, c).then(id => { 
    setCategories(prev => [...prev, { ...c, id }]);
    markLocalChange(); 
  });
  
  const handleUpdateCategory = async (newCat: Category) => {
    if (!db) return;
    const oldCat = categories.find(c => c.id === newCat.id);
    if (!oldCat) return;
    await updateCategory(db, newCat);
    setCategories(prev => prev.map(c => c.id === newCat.id ? newCat : c));
    if (oldCat.name !== newCat.name) {
      setTransactions(prev => prev.map(t => t.category === oldCat.name ? { ...t, category: newCat.name } : t));
    }
    showNotification('Category updated');
    markLocalChange();
  };

  const handleDeleteCategory = async (id: number) => {
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await deleteCategory(db!, id);
    setCategories(prev => prev.filter(c => c.id !== id));
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
      const updated = { ...cat, subCategories: (cat.subCategories || []).filter(s => s !== subName) };
      await updateCategory(db!, updated);
      setCategories(prev => prev.map(c => c.id === catId ? updated : c));
      markLocalChange();
    }
  };

  const handleRenameSubCategory = async (catId: number, oldName: string, newName: string) => {
    if (!db) return;
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const updatedSubs = (cat.subCategories || []).map(s => s === oldName ? newName : s);
    const updatedCat = { ...cat, subCategories: updatedSubs };
    await updateCategory(db, updatedCat);
    setCategories(prev => prev.map(c => c.id === catId ? updatedCat : c));
    setTransactions(prev => prev.map(t => (t.category === cat.name && t.subCategory === oldName) ? { ...t, subCategory: newName } : t));
    showNotification('Sub-category renamed');
    markLocalChange();
  };

  const handleAddMerchant = (v: Merchant) => addMerchant(db!, v).then(id => { 
    setMerchants(prev => [...prev, { ...v, id }]);
    markLocalChange(); 
  });
  
  const handleUpdateMerchant = async (newMerchant: Merchant) => {
    if (!db) return;
    const oldMerchant = merchants.find(m => m.id === newMerchant.id);
    if (!oldMerchant) return;
    await updateMerchant(db, newMerchant);
    setMerchants(prev => prev.map(m => m.id === newMerchant.id ? newMerchant : m));
    if (oldMerchant.name !== newMerchant.name) {
      setTransactions(prev => prev.map(t => t.merchant === oldMerchant.name ? { ...t, merchant: newMerchant.name } : t));
    }
    showNotification('Merchant updated');
    markLocalChange();
  };

  const handleDeleteMerchant = async (id: number) => {
    const snapshot = await captureSnapshot();
    setUndoBuffer(snapshot);
    await deleteMerchant(db!, id);
    setMerchants(prev => prev.filter(m => m.id !== id));
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

  const handleAddPaymentMethod = (p: PaymentMethod) => addPaymentMethod(db!, p).then(id => { 
    setPaymentMethods(prev => [...prev, { ...p, id }]);
    markLocalChange(); 
  });
  const handleUpdatePaymentMethod = (p: PaymentMethod) => updatePaymentMethod(db!, p).then(() => {
    setPaymentMethods(prev => prev.map(item => item.id === p.id ? p : item));
    markLocalChange();
  });
  const handleDeletePaymentMethod = (id: number) => deletePaymentMethod(db!, id).then(() => {
    setPaymentMethods(prev => prev.filter(p => p.id !== id));
    markLocalChange();
  });

  const handleAddTemplate = (t: RecurringTemplate) => {
    addTemplate(db!, t).then(id => {
      setTemplates(prev => [...prev, { ...t, id }]);
      showNotification('Template created');
      markLocalChange();
      checkForDueItems([...templates, { ...t, id }]);
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
    addTemplate(db!, tmp).then(id => {
      setTemplates(prev => [...prev, { ...tmp, id }]);
      showNotification('Saved to Recurring');
      markLocalChange();
      checkForDueItems([...templates, { ...tmp, id }]);
    });
  };

  const handlePostTemplate = async (tmp: RecurringTemplate) => {
    if (!db) return;
    const today = getLocalDateString();
    const tx: Transaction = {
      amount: tmp.amount, date: today, category: tmp.category, subCategory: tmp.subCategory, merchant: tmp.merchant || 'Undefined',
      paymentMethod: tmp.paymentMethod, description: tmp.description, type: tmp.type, fromTemplate: true
    };
    const newId = await addTransaction(db, tx);
    const updatedTmp = { ...tmp, lastPostedDate: today };
    await updateTemplate(db, updatedTmp);
    setTransactions(prev => [...prev, { ...tx, id: newId }]);
    setTemplates(prev => prev.map(t => t.id === tmp.id ? updatedTmp : t));
    showNotification('Transaction posted');
    markLocalChange();
    checkForDueItems(templates.map(t => t.id === tmp.id ? updatedTmp : t));
  };

  const handlePostAllDue = async () => {
    if (!db || dueTemplates.length === 0) return;
    
    setIsSyncing(true); 
    const today = getLocalDateString();
    let totalPosted = 0;
    const MAX_ITERATIONS = 500; // Safety guard against logic spin
    
    try {
      const newTransactions: Transaction[] = [];
      const updatedTemplates: RecurringTemplate[] = [...templates];

      for (const dueItem of dueTemplates) {
        let currentTemplate = { ...dueItem };
        let nextDateStr = calculateNextDate(currentTemplate);
        let iterations = 0;
        
        // Loop while nextDate is in the past or today, up to the safety limit
        while (nextDateStr && nextDateStr <= today && iterations < MAX_ITERATIONS) {
          const tx: Transaction = {
            amount: currentTemplate.amount,
            date: nextDateStr,
            category: currentTemplate.category,
            subCategory: currentTemplate.subCategory,
            merchant: currentTemplate.merchant || 'Undefined',
            paymentMethod: currentTemplate.paymentMethod,
            description: currentTemplate.description,
            type: currentTemplate.type,
            fromTemplate: true
          };
          newTransactions.push(tx);
          totalPosted++;
          
          currentTemplate.lastPostedDate = nextDateStr;
          nextDateStr = calculateNextDate(currentTemplate);
          iterations++;
        }
        
        const idx = updatedTemplates.findIndex(t => t.id === currentTemplate.id);
        if (idx !== -1) updatedTemplates[idx] = currentTemplate;
      }

      const txDB = db.transaction(['transactions', 'templates'], 'readwrite');
      const txStore = txDB.objectStore('transactions');
      const tmpStore = txDB.objectStore('templates');
      
      newTransactions.forEach(t => txStore.add(t));
      updatedTemplates.forEach(t => tmpStore.put(t));

      txDB.oncomplete = () => {
        refreshData();
        setDueTemplates([]);
        showNotification(`Auto-posted ${totalPosted} transactions.`, 'success');
        markLocalChange();
        setIsSyncing(false);
      };
    } catch (err) {
      console.error('Bulk post failed', err);
      showNotification('Automatic posting failed', 'error');
      setIsSyncing(false);
    }
  };

  const handleDeleteTemplate = (id: number) => deleteTemplate(db!, id).then(() => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    markLocalChange();
    checkForDueItems(templates.filter(t => t.id !== id));
  });
  const handleUpdateTemplate = (t: RecurringTemplate) => updateTemplate(db!, t).then(() => {
    setTemplates(prev => prev.map(item => item.id === t.id ? t : item));
    markLocalChange();
    checkForDueItems(templates.map(item => item.id === t.id ? t : item));
  });

  const handleReconcile = async (statement: StatementRecord, draftId?: number) => {
    if (!db) return;
    const txIds = new Set(statement.transactionIds);
    await bulkUpdateTransactions(db, transactions.filter(t => t.id && txIds.has(t.id)).map(t => ({ ...t, reconciled: true, clearedAt: statement.statementDate })));
    const newId = await addStatement(db, statement);
    if (draftId !== undefined) {
      await deleteDraft(db, draftId);
      setDrafts(prev => prev.filter(d => d.id !== draftId));
    }
    setStatements(prev => [...prev, { ...statement, id: newId }]);
    setTransactions(prev => prev.map(t => (t.id && txIds.has(t.id)) ? { ...t, reconciled: true, clearedAt: statement.statementDate } : t));
    showNotification('Statement reconciled');
    markLocalChange();
  };

  const handleSaveDraft = async (draft: DraftStatement) => {
    if (!db) return;
    await saveDraft(db, draft);
    setDrafts(prev => {
      const existing = prev.find(d => d.id === draft.id);
      if (existing) return prev.map(d => d.id === draft.id ? draft : d);
      return [...prev, draft];
    });
    showNotification('Progress saved');
    markLocalChange();
  };

  const handleDeleteDraft = async (id: number) => {
    if (!db) return;
    await deleteDraft(db, id);
    setDrafts(prev => prev.filter(d => d.id !== id));
    showNotification('Draft deleted');
    markLocalChange();
  };

  const handleDeleteStatement = async (id: number) => {
    if (!db) return;
    const stmt = statements.find(s => s.id === id);
    if (!stmt) return;
    const txIds = new Set(stmt.transactionIds);
    await bulkUpdateTransactions(db, transactions.filter(t => t.id && txIds.has(t.id)).map(t => ({ ...t, reconciled: false, clearedAt: undefined })));
    await deleteStatement(db, id);
    setStatements(prev => prev.filter(s => s.id !== id));
    setTransactions(prev => prev.map(t => (t.id && txIds.has(t.id)) ? { ...t, reconciled: false, clearedAt: undefined } : t));
    showNotification('Reconciliation undone');
    markLocalChange();
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><RefreshCcw className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {showCloudGuard && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xl z-[2000] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl border border-white/20 p-10 text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Cloud size={48} className="animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4">Secure Cloud Vault</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-10 max-w-sm mx-auto font-medium">
              Link your Google Drive to enable <span className="text-blue-600 font-bold">Automatic Syncing</span> across all your devices. Your data stays private in your own cloud storage.
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleManualSync}
                className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <Cloud size={20} /> Authorize & Link Drive
              </button>
              <button 
                onClick={() => setShowCloudGuard(false)}
                className="w-full py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-600 transition-all"
              >
                Proceed Offline Only
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 p-4 flex flex-col fixed h-full z-10 shadow-sm">
        <div className="mb-8 px-4 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-md"><LayoutDashboard className="text-white" size={24} /></div>
          <h1 className="text-xl font-black hidden lg:block uppercase tracking-tighter">Dad Finance</h1>
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
           <button onClick={handleManualSync} className={`flex flex-col gap-1 px-4 py-3 rounded-2xl w-full text-left transition-all ${syncStatus === 'error' ? 'bg-rose-50' : 'hover:bg-gray-50'}`}>
             <div className="flex items-center gap-3">
               {syncStatus === 'syncing' ? ( <RefreshCcw size={18} className="animate-spin text-blue-500" /> ) 
               : syncStatus === 'error' ? ( <CloudOff size={18} className="text-rose-500" /> ) 
               : syncStatus === 'success' ? ( <Cloud size={18} className="text-emerald-500" /> ) 
               : ( <Cloud size={18} className={isDriveConnected ? 'text-blue-500' : 'text-gray-400'} /> )}
               <span className={`hidden lg:inline text-[10px] font-black uppercase tracking-tight ${syncStatus === 'error' ? 'text-rose-600' : 'text-gray-500'}`}>
                 {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Failed' : isDriveConnected ? 'Drive Active' : 'Link Cloud'}
               </span>
             </div>
             {lastSyncedAt && !isSyncing && ( <span className="hidden lg:inline text-[8px] font-bold text-gray-300 ml-7 uppercase">Checked {lastSyncedAt}</span> )}
           </button>
           <button onClick={() => setActiveView('backups')} className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-left text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all">
             <Database size={18} /> <span className="hidden lg:inline text-xs font-black uppercase tracking-tight">Archives</span>
           </button>
           <div className="relative group/imp">
              <input type="file" accept=".xls,.xlsx,.csv" ref={legacyFileInputRef} onChange={handleLegacyImport} className="hidden" />
              <button onClick={() => legacyFileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-left text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all">
                <Upload size={18} /> <span className="hidden lg:inline text-xs font-black uppercase tracking-tight">Import Excel</span>
              </button>
           </div>
        </div>
      </aside>

      <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-10">
        {notification && (
          <div className="fixed top-6 right-6 z-[1000]">
            <div className={`px-6 py-3 rounded-[20px] shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-right duration-300 ${notification.type === 'error' ? 'bg-rose-600' : notification.type === 'info' ? 'bg-amber-600' : 'bg-emerald-600'}`}>
              <CheckCircle2 size={20} /> 
              <span className="font-medium text-sm font-bold uppercase tracking-tight">{notification.message}</span>
              {notification.canUndo && (
                <button onClick={handleUndo} className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/40 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                  <RotateCcw size={12} /> Undo
                </button>
              )}
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto">
          {dueTemplates.length > 0 && activeView === 'dashboard' && (
            <div className="mb-8 bg-blue-600 text-white p-6 rounded-[32px] shadow-2xl shadow-blue-100 border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-inner">
                  <Zap size={28} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tight leading-tight">{dueTemplates.length} Recurring items are due</h4>
                  <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Pending entries are waiting for your approval to hit the ledger.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={handlePostAllDue}
                  className="flex-1 md:flex-none h-14 px-8 bg-white text-blue-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Zap size={16} /> Post All
                </button>
                <button 
                  onClick={() => setActiveView('templates')}
                  className="flex-1 md:flex-none h-14 px-8 bg-blue-700/50 text-white rounded-2xl font-black uppercase text-xs tracking-widest border border-blue-400/20 hover:bg-blue-800 transition-all flex items-center justify-center gap-2"
                >
                  <ListOrdered size={16} /> Review
                </button>
                <button 
                  onClick={() => setDueTemplates([])}
                  className="p-3 text-white/50 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}

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
              transactions={transactions} paymentMethods={paymentMethods} statements={statements} drafts={drafts}
              onReconcile={handleReconcile} onDeleteStatement={handleDeleteStatement}
              onSaveDraft={handleSaveDraft} onDeleteDraft={handleDeleteDraft}
            />
          )}
          {activeView === 'templates' && <Templates templates={templates} onPost={handlePostTemplate} onDelete={handleDeleteTemplate} onUpdate={handleUpdateTemplate} onAdd={handleAddTemplate} onAddPaymentMethod={handleAddPaymentMethod} transactions={transactions} categories={categories} merchants={merchants} paymentMethods={paymentMethods} />}
          {(['categories', 'merchants', 'payments', 'backups'].includes(activeView)) && (
            <Management 
              mode={activeView as any} categories={categories} transactions={transactions} 
              onAddCategory={handleAddCategory} onUpdateCategory={handleUpdateCategory} onDeleteCategory={handleDeleteCategory} onDeleteSubCategory={handleDeleteSubCategory} onRenameSubCategory={handleRenameSubCategory}
              onMergeCategories={handleMergeCategories} onMoveSubCategory={handleMoveSubCategory}
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
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all w-full text-left font-black text-xs uppercase tracking-tight ${
          activeView === view ? 'bg-blue-600 text-white shadow-xl shadow-blue-100/50' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <Icon size={18} />
        <span className="hidden lg:inline">{label}</span>
      </button>
    );
  }
};

export default App;
