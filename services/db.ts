import { Transaction, Category, Vendor, RecurringTemplate, INITIAL_CATEGORIES } from '../types';

const DB_NAME = 'FinTrackDB';
const DB_VERSION = 3; 
const STORE_TRANSACTIONS = 'transactions';
const STORE_CATEGORIES = 'categories';
const STORE_VENDORS = 'vendors';
const STORE_TEMPLATES = 'templates';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_VENDORS)) {
        db.createObjectStore(STORE_VENDORS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
        db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const ensureInitialCategories = async (db: IDBDatabase) => {
  const categories = await getAllCategories(db);
  if (categories.length === 0) {
    for (const cat of INITIAL_CATEGORIES) {
      await addCategory(db, { name: cat.name, type: cat.type, subCategories: cat.subCategories });
    }
  }
};

// Transactions
export const addTransaction = (db: IDBDatabase, transaction: Transaction): Promise<number> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORE_TRANSACTIONS);
    const data = { ...transaction };
    if (data.id === undefined) delete data.id;
    const request = store.add(data);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const deleteTransaction = (db: IDBDatabase, id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
    tx.objectStore(STORE_TRANSACTIONS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllTransactions = (db: IDBDatabase): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTIONS, 'readonly');
    const request = tx.objectStore(STORE_TRANSACTIONS).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Templates
export const addTemplate = (db: IDBDatabase, template: RecurringTemplate): Promise<number> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEMPLATES, 'readwrite');
    const request = tx.objectStore(STORE_TEMPLATES).add(template);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const updateTemplate = (db: IDBDatabase, template: RecurringTemplate): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEMPLATES, 'readwrite');
    tx.objectStore(STORE_TEMPLATES).put(template);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllTemplates = (db: IDBDatabase): Promise<RecurringTemplate[]> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEMPLATES, 'readonly');
    const request = tx.objectStore(STORE_TEMPLATES).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteTemplate = (db: IDBDatabase, id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEMPLATES, 'readwrite');
    tx.objectStore(STORE_TEMPLATES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Categories
export const addCategory = (db: IDBDatabase, category: Category): Promise<number> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    const request = tx.objectStore(STORE_CATEGORIES).add(category);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const updateCategory = (db: IDBDatabase, category: Category): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    tx.objectStore(STORE_CATEGORIES).put(category);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteCategory = (db: IDBDatabase, id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    tx.objectStore(STORE_CATEGORIES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllCategories = (db: IDBDatabase): Promise<Category[]> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORIES, 'readonly');
    const request = tx.objectStore(STORE_CATEGORIES).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Vendors
export const addVendor = (db: IDBDatabase, vendor: Vendor): Promise<number> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENDORS, 'readwrite');
    const request = tx.objectStore(STORE_VENDORS).add(vendor);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const updateVendor = (db: IDBDatabase, vendor: Vendor): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENDORS, 'readwrite');
    tx.objectStore(STORE_VENDORS).put(vendor);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteVendor = (db: IDBDatabase, id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENDORS, 'readwrite');
    tx.objectStore(STORE_VENDORS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllVendors = (db: IDBDatabase): Promise<Vendor[]> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENDORS, 'readonly');
    const request = tx.objectStore(STORE_VENDORS).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const clearAllData = (db: IDBDatabase): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRANSACTIONS, STORE_CATEGORIES, STORE_VENDORS, STORE_TEMPLATES], 'readwrite');
    tx.objectStore(STORE_TRANSACTIONS).clear();
    tx.objectStore(STORE_CATEGORIES).clear();
    tx.objectStore(STORE_VENDORS).clear();
    tx.objectStore(STORE_TEMPLATES).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const importAllData = async (db: IDBDatabase, data: { transactions: Transaction[], categories: Category[], vendors?: Vendor[] }): Promise<void> => {
  await clearAllData(db);
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRANSACTIONS, STORE_CATEGORIES, STORE_VENDORS], 'readwrite');
    const tStore = tx.objectStore(STORE_TRANSACTIONS);
    const cStore = tx.objectStore(STORE_CATEGORIES);
    const vStore = tx.objectStore(STORE_VENDORS);
    
    if (data.transactions) {
      data.transactions.forEach(t => {
        const item = { ...t };
        delete item.id;
        tStore.add(item);
      });
    }

    if (data.categories) {
      data.categories.forEach(c => {
        const item = { ...c };
        delete item.id;
        cStore.add(item);
      });
    }

    if (data.vendors) {
      data.vendors.forEach(v => {
        const item = { ...v };
        delete item.id;
        vStore.add(item);
      });
    }
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted during import'));
  });
};