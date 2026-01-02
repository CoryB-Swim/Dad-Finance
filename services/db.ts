
import { Transaction, Category, Merchant, RecurringTemplate, PaymentMethod } from '../types';

const DB_NAME = 'FinTrackDB';
const DB_VERSION = 4; 
const STORE_TRANSACTIONS = 'transactions';
const STORE_CATEGORIES = 'categories';
const STORE_MERCHANTS = 'vendors'; 
const STORE_TEMPLATES = 'templates';
const STORE_PAYMENT_METHODS = 'paymentMethods';

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
      if (!db.objectStoreNames.contains(STORE_MERCHANTS)) {
        db.createObjectStore(STORE_MERCHANTS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
        db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_PAYMENT_METHODS)) {
        db.createObjectStore(STORE_PAYMENT_METHODS, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getAll = <T>(db: IDBDatabase, storeName: string): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const add = <T>(db: IDBDatabase, storeName: string, item: T): Promise<number> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const data = { ...item } as any;
    if (data.id === undefined) delete data.id;
    const request = store.add(data);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

const update = <T>(db: IDBDatabase, storeName: string, item: T): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const remove = (db: IDBDatabase, storeName: string, id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllTransactions = (db: IDBDatabase) => getAll<Transaction>(db, STORE_TRANSACTIONS);
export const addTransaction = (db: IDBDatabase, t: Transaction) => add(db, STORE_TRANSACTIONS, t);
export const updateTransaction = (db: IDBDatabase, t: Transaction) => update(db, STORE_TRANSACTIONS, t);
export const deleteTransaction = (db: IDBDatabase, id: number) => remove(db, STORE_TRANSACTIONS, id);

export const getAllCategories = (db: IDBDatabase) => getAll<Category>(db, STORE_CATEGORIES);
export const addCategory = (db: IDBDatabase, c: Category) => add(db, STORE_CATEGORIES, c);
export const updateCategory = (db: IDBDatabase, c: Category) => update(db, STORE_CATEGORIES, c);
export const deleteCategory = (db: IDBDatabase, id: number) => remove(db, STORE_CATEGORIES, id);

export const getAllMerchants = (db: IDBDatabase) => getAll<Merchant>(db, STORE_MERCHANTS);
export const addMerchant = (db: IDBDatabase, m: Merchant) => add(db, STORE_MERCHANTS, m);
export const updateMerchant = (db: IDBDatabase, m: Merchant) => update(db, STORE_MERCHANTS, m);
export const deleteMerchant = (db: IDBDatabase, id: number) => remove(db, STORE_MERCHANTS, id);

export const getAllTemplates = (db: IDBDatabase) => getAll<RecurringTemplate>(db, STORE_TEMPLATES);
export const addTemplate = (db: IDBDatabase, t: RecurringTemplate) => add(db, STORE_TEMPLATES, t);
export const updateTemplate = (db: IDBDatabase, t: RecurringTemplate) => update(db, STORE_TEMPLATES, t);
export const deleteTemplate = (db: IDBDatabase, id: number) => remove(db, STORE_TEMPLATES, id);

export const getAllPaymentMethods = (db: IDBDatabase) => getAll<PaymentMethod>(db, STORE_PAYMENT_METHODS);
export const addPaymentMethod = (db: IDBDatabase, p: PaymentMethod) => add(db, STORE_PAYMENT_METHODS, p);
export const updatePaymentMethod = (db: IDBDatabase, p: PaymentMethod) => update(db, STORE_PAYMENT_METHODS, p);
export const deletePaymentMethod = (db: IDBDatabase, id: number) => remove(db, STORE_PAYMENT_METHODS, id);

export const clearAllData = (db: IDBDatabase): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRANSACTIONS, STORE_CATEGORIES, STORE_MERCHANTS, STORE_TEMPLATES, STORE_PAYMENT_METHODS], 'readwrite');
    tx.objectStore(STORE_TRANSACTIONS).clear();
    tx.objectStore(STORE_CATEGORIES).clear();
    tx.objectStore(STORE_MERCHANTS).clear();
    tx.objectStore(STORE_TEMPLATES).clear();
    tx.objectStore(STORE_PAYMENT_METHODS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const importAllData = async (db: IDBDatabase, data: any): Promise<void> => {
  await clearAllData(db);
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRANSACTIONS, STORE_CATEGORIES, STORE_MERCHANTS, STORE_PAYMENT_METHODS], 'readwrite');
    
    // We use .put() instead of .add() to ensure IDs are respected during restoration
    if (data.transactions) data.transactions.forEach((t: any) => tx.objectStore(STORE_TRANSACTIONS).put(t));
    if (data.categories) data.categories.forEach((c: any) => tx.objectStore(STORE_CATEGORIES).put(c));
    if (data.merchants) data.merchants.forEach((m: any) => tx.objectStore(STORE_MERCHANTS).put(m));
    if (data.paymentMethods) data.paymentMethods.forEach((p: any) => tx.objectStore(STORE_PAYMENT_METHODS).put(p));
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
