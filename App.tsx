import React, { useState, useEffect, useCallback } from 'react';
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
  Repeat
} from 'lucide-react';
import { 
  initDB, 
  getAllTransactions, 
  addTransaction, 
  deleteTransaction, 
  getAllCategories, 
  addCategory,
  updateCategory,
  deleteCategory,
  ensureInitialCategories,
  importAllData,
  getAllVendors,
  addVendor,
  updateVendor,
  deleteVendor,
  getAllTemplates,
  addTemplate,
  deleteTemplate,
  updateTemplate
} from './services/db';
import { 
  initGoogleAuth, 
  requestAccessToken, 
  isAuthorized, 
  syncToDrive, 
  getFromDrive,
  signOut
} from './services/googleDrive';
import { Transaction, Category, Vendor, RecurringTemplate, View } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import Reports from './components/Reports';
import Management from './components/Management';
import Templates from './components/Templates';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    const setup = async () => {
      try {
        const database = await initDB();
        await ensureInitialCategories(database);
        setDb(database);
        
        const [txs, cats, vends, tmps] = await Promise.all([
          getAllTransactions(database),
          getAllCategories(database),
          getAllVendors(database),
          getAllTemplates(database)
        ]);
        setTransactions(txs);
        setCategories(cats);
        setVendors(vends);
        setTemplates(tmps);
        
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
      const [txs, cats, vends, tmps] = await Promise.all([
        getAllTransactions(db),
        getAllCategories(db),
        getAllVendors(db),
        getAllTemplates(db)
      ]);
      setTransactions(txs);
      setCategories(cats);
      setVendors(vends);
      setTemplates(tmps);
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

      const [txs, cats, vends] = await Promise.all([
        getAllTransactions(db!),
        getAllCategories(db!),
        getAllVendors(db!)
      ]);

      await syncToDrive({
        transactions: txs,
        categories: cats,
        vendors: vends,
        lastUpdated: new Date().toISOString()
      } as any);
      
      setLastSynced(new Date().toLocaleTimeString());
      setIsDriveConnected(true);
      showNotification('Successfully synced with Google Drive');
    } catch (err) {
      console.error(err);
      showNotification('Sync failed. Please check console.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportData = async () => {
    if (!db) return;
    try {
      const data = {
        transactions,
        categories,
        vendors,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fintrack-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showNotification('Data exported successfully');
    } catch (err) {
      showNotification('Export failed', 'error');
    }
  };

  const handleImportData = async (file: File) => {
    if (!db) return;
    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error('File is not a valid JSON format.');
      }
      
      if (!data.transactions || !data.categories) {
        throw new Error('Missing core data (transactions or categories) in the backup file.');
      }

      if (window.confirm('Importing data will replace all your current local records. Are you sure?')) {
        setIsLoading(true);
        try {
          await importAllData(db, data);
          await refreshData();
          setActiveView('dashboard');
          showNotification('Data imported successfully');
        } catch (importErr: any) {
          throw new Error('Database import failed: ' + importErr.message);
        } finally {
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      console.error('Import error:', err);
      alert('Import Error: ' + err.message);
      showNotification(err.message, 'error');
    }
  };

  const handleAddTransaction = async (t: Transaction) => {
    if (!db) return;
    try {
      await addTransaction(db, t);
      if (t.vendor && !vendors.some(v => v.name.toLowerCase() === t.vendor?.toLowerCase())) {
        await addVendor(db, { name: t.vendor });
      }
      await refreshData();
      showNotification('Transaction added successfully');
      if (isDriveConnected) handleManualSync();
    } catch (err) {
      console.error('Error adding transaction:', err);
      showNotification('Failed to save transaction', 'error');
    }
  };

  const handleUpdateTransaction = async (t: Transaction) => {
    if (!db || t.id === undefined) return;
    try {
      const tx = db.transaction('transactions', 'readwrite');
      tx.objectStore('transactions').put(t);
      await refreshData();
      showNotification('Transaction updated');
      if (isDriveConnected) handleManualSync();
    } catch (err) {
      console.error('Error updating transaction:', err);
      showNotification('Failed to update transaction', 'error');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!db) return;
    try {
      await deleteTransaction(db, id);
      await refreshData();
      showNotification('Transaction deleted');
      if (isDriveConnected) handleManualSync();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      showNotification('Failed to delete transaction', 'error');
    }
  };

  const handleSaveAsTemplate = async (t: Transaction) => {
    if (!db) return;
    try {
      const template: RecurringTemplate = {
        name: t.vendor || t.category,
        amount: t.amount,
        category: t.category,
        subCategory: t.subCategory,
        vendor: t.vendor,
        description: t.description,
        type: t.type
      };
      await addTemplate(db, template);
      await refreshData();
      showNotification('Saved as Recurring Template');
    } catch (err) {
      showNotification('Failed to save template', 'error');
    }
  };

  const handleUpdateTemplate = async (t: RecurringTemplate) => {
    if (!db || t.id === undefined) return;
    try {
      await updateTemplate(db, t);
      await refreshData();
      showNotification('Template updated');
    } catch (err) {
      console.error('Error updating template:', err);
      showNotification('Failed to update template', 'error');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!db) return;
    await deleteTemplate(db, id);
    await refreshData();
    showNotification('Template removed');
  };

  const handlePostTemplate = async (template: RecurringTemplate) => {
    const transaction: Transaction = {
      amount: template.amount,
      date: new Date().toISOString().split('T')[0],
      category: template.category,
      subCategory: template.subCategory,
      vendor: template.vendor,
      description: template.description,
      type: template.type
    };
    await handleAddTransaction(transaction);
  };

  const handleAddCategory = async (c: Category) => {
    if (!db) return;
    try {
      await addCategory(db, c);
      await refreshData();
      showNotification(`Category "${c.name}" added`);
      if (isDriveConnected) handleManualSync();
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const handleUpdateCategory = async (c: Category) => {
    if (!db) return;
    try {
      await updateCategory(db, c);
      await refreshData();
      showNotification(`Category updated`);
      if (isDriveConnected) handleManualSync();
    } catch (err) {
      console.error('Error updating category:', err);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!db) return;
    await deleteCategory(db, id);
    await refreshData();
    showNotification('Category deleted');
    if (isDriveConnected) handleManualSync();
  };

  const handleAddVendor = async (v: Vendor) => {
    if (!db) return;
    try {
      await addVendor(db, v);
      await refreshData();
      showNotification(`Vendor "${v.name}" added`);
      if (isDriveConnected) handleManualSync();
    } catch (err) {
      console.error('Error adding vendor:', err);
    }
  };

  const handleUpdateVendor = async (v: Vendor) => {
    if (!db) return;
    try {
      await updateVendor(db, v);
      await refreshData();
      showNotification('Vendor updated');
      if (isDriveConnected) handleManualSync();
    } catch (err) {
      console.error('Error updating vendor:', err);
    }
  };

  const handleDeleteVendor = async (id: number) => {
    if (!db || !window.confirm('Delete this vendor record?')) return;
    try {
      await deleteVendor(db, id);
      await refreshData();
      showNotification('Vendor deleted');
      if (isDriveConnected) handleManualSync();
    } catch (err) {
      console.error('Error deleting vendor:', err);
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: View, icon: any, label: string }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left font-medium ${
        activeView === view ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <Icon size={20} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><RefreshCcw className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 p-4 flex flex-col fixed h-full z-10">
        <div className="mb-8 px-4 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg"><LayoutDashboard className="text-white" size={24} /></div>
          <h1 className="text-xl font-bold hidden lg:block">FinTrack Pro</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="list" icon={ListOrdered} label="Transactions" />
          <NavItem view="templates" icon={Repeat} label="Templates" />
          <NavItem view="reports" icon={PieChart} label="Reports" />
          <NavItem view="categories" icon={Tags} label="Categories" />
          <NavItem view="vendors" icon={Store} label="Vendors" />
        </nav>
        <div className="border-t pt-4 space-y-2">
           <button onClick={handleManualSync} className={`flex items-center gap-3 px-4 py-2 rounded-xl w-full text-left transition-all ${isDriveConnected ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 hover:bg-gray-100'}`}>
             {isSyncing ? <RefreshCcw size={18} className="animate-spin" /> : <Cloud size={18} />}
             <span className="hidden lg:inline text-xs font-bold">{isDriveConnected ? 'Drive Connected' : 'Connect Drive'}</span>
           </button>
           <button onClick={() => setActiveView('backups')} className={`flex items-center gap-3 px-4 py-2 rounded-xl w-full text-left transition-all ${activeView === 'backups' ? 'bg-amber-50 text-amber-600' : 'text-gray-500 hover:bg-gray-100'}`}>
             <Database size={18} />
             <span className="hidden lg:inline text-xs font-bold">Backups</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-10">
        {notification && (
          <div className="fixed top-6 right-6 z-50">
            <div className={`px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-right duration-300 ${notification.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
              <CheckCircle2 size={20} />
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}
        <header className="mb-8"><h2 className="text-3xl font-bold text-gray-900 capitalize">{activeView.replace('-', ' ')}</h2></header>
        <div className="max-w-7xl mx-auto">
          {activeView === 'dashboard' && <Dashboard transactions={transactions} />}
          {activeView === 'list' && <TransactionList transactions={transactions} categories={categories} vendors={vendors} onDelete={handleDeleteTransaction} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onAddCategory={handleAddCategory} onSaveAsTemplate={handleSaveAsTemplate} />}
          {activeView === 'templates' && <Templates templates={templates} onPost={handlePostTemplate} onDelete={handleDeleteTemplate} onUpdate={handleUpdateTemplate} transactions={transactions} categories={categories} />}
          {activeView === 'reports' && <Reports transactions={transactions} />}
          {(activeView === 'categories' || activeView === 'vendors' || activeView === 'backups') && (
            <Management 
              mode={activeView as 'categories' | 'vendors' | 'backups'}
              categories={categories} 
              transactions={transactions} 
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              vendors={vendors}
              onAddVendor={handleAddVendor}
              onUpdateVendor={handleUpdateVendor}
              onDeleteVendor={handleDeleteVendor}
              onExport={handleExportData}
              onImport={handleImportData}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;