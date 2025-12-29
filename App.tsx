
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, 
  ListOrdered, 
  PieChart, 
  RefreshCcw,
  CheckCircle2,
  Tags,
  Store,
  Database,
  Cloud,
  Repeat,
  Upload,
  Download,
  CreditCard
} from 'lucide-react';
import { 
  initDB, 
  getAllTransactions, 
  addTransaction, 
  updateTransaction,
  deleteTransaction, 
  getAllCategories, 
  addCategory,
  updateCategory,
  deleteCategory,
  importAllData,
  getAllMerchants,
  addMerchant,
  updateMerchant,
  deleteMerchant,
  getAllTemplates,
  addTemplate,
  deleteTemplate,
  updateTemplate,
  getAllPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod
} from './services/db';
import { 
  initGoogleAuth, 
  requestAccessToken, 
  isAuthorized, 
  syncToDrive, 
  getFromDrive
} from './services/googleDrive';
import { Transaction, Category, Merchant, RecurringTemplate, PaymentMethod, View, TransactionType } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import Reports from './components/Reports';
import Management from './components/Management';
import Templates from './components/Templates';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);

  const legacyFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const setup = async () => {
      try {
        const database = await initDB();
        setDb(database);
        
        const [txs, cats, vends, tmps, pmeths] = await Promise.all([
          getAllTransactions(database),
          getAllCategories(database),
          getAllMerchants(database),
          getAllTemplates(database),
          getAllPaymentMethods(database)
        ]);
        setTransactions(txs);
        setCategories(cats);
        setMerchants(vends);
        setTemplates(tmps);
        setPaymentMethods(pmeths);
        
        await initGoogleAuth();
      } catch (err) {
        console.error('Failed to init DB', err);
      } finally {
        setIsLoading(false);
      }
    };
    setup();
  }, []);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const refreshData = useCallback(async () => {
    if (!db) return;
    try {
      const [txs, cats, vends, tmps, pmeths] = await Promise.all([
        getAllTransactions(db),
        getAllCategories(db),
        getAllMerchants(db),
        getAllTemplates(db),
        getAllPaymentMethods(db)
      ]);
      setTransactions(txs);
      setCategories(cats);
      setMerchants(vends);
      setTemplates(tmps);
      setPaymentMethods(pmeths);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  }, [db]);

  const handleManualSync = async () => {
    if (!isAuthorized()) {
      requestAccessToken();
      setTimeout(() => setIsDriveConnected(isAuthorized()), 2000);
      return;
    }

    setIsSyncing(true);
    try {
      const cloudData = await getFromDrive();
      if (cloudData) {
        if (window.confirm('Cloud data found for this account. Would you like to merge it with your local data?')) {
          await importAllData(db!, cloudData);
          await refreshData();
        }
      }

      const [txs, cats, vends, pmeths] = await Promise.all([
        getAllTransactions(db!),
        getAllCategories(db!),
        getAllMerchants(db!),
        getAllPaymentMethods(db!)
      ]);

      await syncToDrive({
        transactions: txs,
        categories: cats,
        merchants: vends,
        paymentMethods: pmeths,
        lastUpdated: new Date().toISOString()
      } as any);
      
      setIsDriveConnected(true);
      showNotification('Synced with Google Drive');
    } catch (err) {
      console.error(err);
      showNotification('Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportData = async () => {
    if (!db) return;
    try {
      const data = { transactions, categories, merchants, paymentMethods, exportDate: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fintrack-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showNotification('Data exported');
    } catch (err) {
      showNotification('Export failed', 'error');
    }
  };

  const parseLegacyDate = (dateVal: any) => {
    if (typeof dateVal === 'number') {
      const date = XLSX.SSF.parse_date_code(dateVal);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    const dateStr = String(dateVal || '');
    const months: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    let clean = dateStr.trim().replace(/\s+/g, '-');
    let parts = clean.split(/[-/]/);
    if (parts.length !== 3) {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
    }
    let d = parts[0].padStart(2, '0');
    let m = parts[1];
    let y = parts[2];
    if (isNaN(parseInt(m))) {
      const monthKey = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase().substring(0, 2);
      const found = Object.keys(months).find(k => k.startsWith(monthKey));
      m = found ? months[found] : '01';
    } else {
      m = m.padStart(2, '0');
    }
    if (y.length === 2) y = '20' + y;
    return `${y}-${m}-${d}`;
  };

  const handleLegacyImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames.find(n => n.includes("INPUT Expense")) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true });

      if (jsonData.length === 0) {
        showNotification('No data found in sheet.', 'error');
        return;
      }

      const newCatsMap = new Map<string, Set<string>>();
      const newMerchantsSet = new Set<string>();
      let importedCount = 0;

      const tx = db.transaction(['transactions'], 'readwrite');
      const store = tx.objectStore('transactions');

      for (const row of jsonData) {
        const keys = Object.keys(row);
        const dateKey = keys.find(k => k.toUpperCase().includes('DATE'));
        const vendorKey = keys.find(k => k.toUpperCase().includes('VENDOR') || k.toUpperCase().includes('ITEM'));
        const amountKey = keys.find(k => k.toUpperCase().includes('AMOU'));
        const categoryKey = keys.find(k => k.toUpperCase().includes('CAT'));
        const notesKey = keys.find(k => k.toUpperCase().includes('NOTE') || k.toUpperCase().includes('DESC'));
        const typeKey = keys.find(k => k.toUpperCase().includes('TYPE'));

        if (!dateKey || !amountKey) continue;

        const rawAmount = String(row[amountKey]);
        const amount = parseFloat(rawAmount.replace(/[$,\s]/g, '')) || 0;
        const categoryFull = String(row[categoryKey] || 'Other');
        const [catName, subName] = categoryFull.includes(':') 
          ? categoryFull.split(':').map(s => s.trim()) 
          : [categoryFull, ''];

        if (catName) {
          if (!newCatsMap.has(catName)) newCatsMap.set(catName, new Set());
          if (subName) newCatsMap.get(catName)!.add(subName);
        }
        const merchantName = String(row[vendorKey] || '').trim();
        if (merchantName) newMerchantsSet.add(merchantName);

        const type = (row[typeKey]?.toUpperCase() === 'INCOME' || (amount > 0 && catName === 'Salary')) 
          ? TransactionType.INCOME 
          : TransactionType.EXPENSE;

        const item: Transaction = {
          date: parseLegacyDate(row[dateKey]),
          merchant: merchantName || 'Unknown',
          amount: Math.abs(amount),
          type: type,
          category: catName || 'Other',
          subCategory: subName || undefined,
          description: String(row[notesKey] || '')
        };

        store.add(item);
        importedCount++;
      }

      tx.oncomplete = async () => {
        for (const [catName, subs] of newCatsMap.entries()) {
          const existing = categories.find(c => c.name === catName);
          if (!existing) {
            await addCategory(db, { name: catName, type: TransactionType.BOTH, subCategories: Array.from(subs) });
          } else {
            const combinedSubs = Array.from(new Set([...(existing.subCategories || []), ...Array.from(subs)]));
            await updateCategory(db, { ...existing, subCategories: combinedSubs });
          }
        }

        for (const vName of newMerchantsSet) {
          const existing = merchants.find(m => m.name.toLowerCase() === vName.toLowerCase());
          if (!existing) await addMerchant(db, { name: vName });
        }

        await refreshData();
        showNotification(`Imported ${importedCount} transactions.`);
      };

    } catch (err) {
      console.error(err);
      showNotification('Import failed', 'error');
    }
    if (legacyFileInputRef.current) legacyFileInputRef.current.value = '';
  };

  const handleImportData = async (file: File) => {
    if (!db) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(db, data);
      await refreshData();
      showNotification('Data restored');
    } catch (err) {
      showNotification('Restore failed', 'error');
    }
  };

  // Transaction CRUD
  const handleAddTransaction = async (t: Transaction) => {
    if (!db) return;
    await addTransaction(db, t);
    await refreshData();
    showNotification('Transaction added');
  };

  const handleUpdateTransaction = async (t: Transaction) => {
    if (!db) return;
    await updateTransaction(db, t);
    await refreshData();
    showNotification('Transaction updated');
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!db) return;
    await deleteTransaction(db, id);
    await refreshData();
    showNotification('Transaction deleted');
  };

  // Categories / Merchants / Payments handlers
  const handleAddCategory = (c: Category) => addCategory(db!, c).then(refreshData);
  const handleUpdateCategory = (c: Category) => updateCategory(db!, c).then(refreshData);
  const handleDeleteCategory = (id: number) => deleteCategory(db!, id).then(refreshData);
  const handleDeleteSubCategory = async (catId: number, subName: string) => {
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      await updateCategory(db!, { ...cat, subCategories: (cat.subCategories || []).filter(s => s !== subName) });
      refreshData();
    }
  };

  const handleAddMerchant = (v: Merchant) => addMerchant(db!, v).then(refreshData);
  const handleUpdateMerchant = (v: Merchant) => updateMerchant(db!, v).then(refreshData);
  const handleDeleteMerchant = (id: number) => deleteMerchant(db!, id).then(refreshData);

  const handleAddPaymentMethod = (p: PaymentMethod) => addPaymentMethod(db!, p).then(refreshData);
  const handleUpdatePaymentMethod = (p: PaymentMethod) => updatePaymentMethod(db!, p).then(refreshData);
  const handleDeletePaymentMethod = (id: number) => deletePaymentMethod(db!, id).then(refreshData);

  // Templates
  const handleSaveAsTemplate = (t: Transaction) => {
    const tmp: RecurringTemplate = {
      name: t.merchant || t.category,
      amount: t.amount,
      category: t.category,
      subCategory: t.subCategory,
      merchant: t.merchant,
      paymentMethod: t.paymentMethod,
      description: t.description || '',
      type: t.type
    };
    addTemplate(db!, tmp).then(() => {
      refreshData();
      showNotification('Saved to Recurring');
    });
  };

  const handlePostTemplate = (tmp: RecurringTemplate) => {
    const tx: Transaction = {
      amount: tmp.amount,
      date: new Date().toISOString().split('T')[0],
      category: tmp.category,
      subCategory: tmp.subCategory,
      merchant: tmp.merchant,
      paymentMethod: tmp.paymentMethod,
      description: tmp.description,
      type: tmp.type
    };
    addTransaction(db!, tx).then(() => {
      refreshData();
      showNotification('Transaction posted');
    });
  };

  const handleDeleteTemplate = (id: number) => deleteTemplate(db!, id).then(refreshData);
  const handleUpdateTemplate = (t: RecurringTemplate) => updateTemplate(db!, t).then(refreshData);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><RefreshCcw className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 p-4 flex flex-col fixed h-full z-10">
        <div className="mb-8 px-4 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg"><LayoutDashboard className="text-white" size={24} /></div>
          <h1 className="text-xl font-bold hidden lg:block uppercase tracking-tighter">FinTrack</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="list" icon={ListOrdered} label="Transactions" />
          <NavItem view="templates" icon={Repeat} label="Recurring" />
          <NavItem view="reports" icon={PieChart} label="Analytics" />
          <NavItem view="categories" icon={Tags} label="Categories" />
          <NavItem view="merchants" icon={Store} label="Merchants" />
          <NavItem view="payments" icon={CreditCard} label="Payment Methods" />
        </nav>
        <div className="border-t pt-4 space-y-2">
           <button onClick={handleManualSync} className="flex items-center gap-3 px-4 py-2 rounded-xl w-full text-left text-gray-500 hover:bg-gray-100 transition-all">
             {isSyncing ? <RefreshCcw size={18} className="animate-spin" /> : <Cloud size={18} />}
             <span className="hidden lg:inline text-xs font-bold">{isDriveConnected ? 'Drive Connected' : 'Sync Drive'}</span>
           </button>
           <button onClick={() => setActiveView('backups')} className="flex items-center gap-3 px-4 py-2 rounded-xl w-full text-left text-gray-500 hover:bg-gray-100 transition-all">
             <Database size={18} />
             <span className="hidden lg:inline text-xs font-bold">Backups</span>
           </button>
           <div className="relative group/imp">
              <input type="file" accept=".xls,.xlsx,.csv" ref={legacyFileInputRef} onChange={handleLegacyImport} className="hidden" />
              <button onClick={() => legacyFileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-2 rounded-xl w-full text-left text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all">
                <Upload size={18} />
                <span className="hidden lg:inline text-xs font-bold">Import Excel</span>
              </button>
           </div>
        </div>
      </aside>

      <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-10">
        {notification && (
          <div className="fixed top-6 right-6 z-50">
            <div className={`px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-right duration-300 ${notification.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
              <CheckCircle2 size={20} />
              <span className="font-medium text-sm font-bold uppercase">{notification.message}</span>
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto">
          {activeView === 'dashboard' && <Dashboard transactions={transactions} />}
          {activeView === 'list' && (
            <TransactionList 
              transactions={transactions} 
              categories={categories} 
              merchants={merchants} 
              paymentMethods={paymentMethods}
              onDelete={handleDeleteTransaction} 
              onAddTransaction={handleAddTransaction} 
              onUpdateTransaction={handleUpdateTransaction} 
              onAddCategory={handleAddCategory} 
              onUpdateCategory={handleUpdateCategory}
              onAddMerchant={handleAddMerchant}
              onSaveAsTemplate={handleSaveAsTemplate} 
            />
          )}
          {activeView === 'templates' && <Templates templates={templates} onPost={handlePostTemplate} onDelete={handleDeleteTemplate} onUpdate={handleUpdateTemplate} transactions={transactions} categories={categories} paymentMethods={paymentMethods} />}
          {activeView === 'reports' && <Reports transactions={transactions} categories={categories} />}
          {(['categories', 'merchants', 'payments', 'backups'].includes(activeView)) && (
            <Management 
              mode={activeView as any}
              categories={categories} 
              transactions={transactions} 
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onDeleteSubCategory={handleDeleteSubCategory}
              merchants={merchants}
              onAddMerchant={handleAddMerchant}
              onUpdateMerchant={handleUpdateMerchant}
              onDeleteMerchant={handleDeleteMerchant}
              paymentMethods={paymentMethods}
              onAddPaymentMethod={handleAddPaymentMethod}
              onUpdatePaymentMethod={handleUpdatePaymentMethod}
              onDeletePaymentMethod={handleDeletePaymentMethod}
              onExport={handleExportData}
              onImport={handleImportData}
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
