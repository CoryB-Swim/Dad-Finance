import { Transaction, Category, Merchant, RecurringTemplate, PaymentMethod, StatementRecord, DraftStatement } from '../types';

const DB_NAME = 'FinTrackDB';
const DB_VERSION = 6; 
const STORE_TRANSACTIONS = 'transactions';
const STORE_CATEGORIES = 'categories';
const STORE_MERCHANTS = 'vendors'; 
const STORE_TEMPLATES = 'templates';
const STORE_PAYMENT_METHODS = 'paymentMethods';
const STORE_STATEMENTS = 'reconciliationStatements';
const STORE_DRAFTS = 'reconciliationDrafts';

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
      if (!db.objectStoreNames.contains(STORE_STATEMENTS)) {
        db.createObjectStore(STORE_STATEMENTS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'id', autoIncrement: true });
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
    const store = tx.objectStore(storeName);
    const data = { ...item } as any;
    if (data.id === undefined) delete data.id;
    store.put(data);
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

export const bulkUpdateTransactions = (db: IDBDatabase, txs: Transaction[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORE_TRANSACTIONS);
    txs.forEach(t => store.put(t));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteTransactions = (db: IDBDatabase, ids: number[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORE_TRANSACTIONS);
    ids.forEach(id => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllCategories = (db: IDBDatabase) => getAll<Category>(db, STORE_CATEGORIES);
export const addCategory = (db: IDBDatabase, c: Category) => add(db, STORE_CATEGORIES, c);
export const updateCategory = (db: IDBDatabase, c: Category) => update(db, STORE_CATEGORIES, c);
export const deleteCategory = (db: IDBDatabase, id: number) => remove(db, STORE_CATEGORIES, id);

export const mergeCategories = async (db: IDBDatabase, sourceNames: string[], targetCategory: Category, sourceIdsToDelete: number[]): Promise<void> => {
  const txs = await getAllTransactions(db);
  const toUpdate = txs.filter(t => sourceNames.includes(t.category));
  
  if (toUpdate.length > 0) {
    const updated = toUpdate.map(t => ({ ...t, category: targetCategory.name }));
    await bulkUpdateTransactions(db, updated);
  }

  // Update target category with combined sub-categories
  await updateCategory(db, targetCategory);
  
  const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
  const store = tx.objectStore(STORE_CATEGORIES);
  sourceIdsToDelete.forEach(id => store.delete(id));
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const moveSubCategory = async (db: IDBDatabase, subName: string, sourceCat: Category, targetCat: Category): Promise<void> => {
  const txs = await getAllTransactions(db);
  const toUpdate = txs.filter(t => t.category === sourceCat.name && t.subCategory === subName);
  
  if (toUpdate.length > 0) {
    const updated = toUpdate.map(t => ({ ...t, category: targetCat.name }));
    await bulkUpdateTransactions(db, updated);
  }

  // Update categories metadata
  await updateCategory(db, {
    ...sourceCat,
    subCategories: (sourceCat.subCategories || []).filter(s => s !== subName)
  });
  
  const targetSubs = new Set(targetCat.subCategories || []);
  targetSubs.add(subName);
  await updateCategory(db, {
    ...targetCat,
    subCategories: Array.from(targetSubs)
  });
};

export const getAllMerchants = (db: IDBDatabase) => getAll<Merchant>(db, STORE_MERCHANTS);
export const addMerchant = (db: IDBDatabase, m: Merchant) => add(db, STORE_MERCHANTS, m);
export const updateMerchant = (db: IDBDatabase, m: Merchant) => update(db, STORE_MERCHANTS, m);
export const deleteMerchant = (db: IDBDatabase, id: number) => remove(db, STORE_MERCHANTS, id);

export const mergeMerchants = async (db: IDBDatabase, sourceNames: string[], targetName: string, sourceIdsToDelete: number[]): Promise<void> => {
  const txs = await getAllTransactions(db);
  const toUpdate = txs.filter(t => t.merchant && sourceNames.includes(t.merchant));
  if (toUpdate.length > 0) {
    const updated = toUpdate.map(t => ({ ...t, merchant: targetName }));
    await bulkUpdateTransactions(db, updated);
  }
  const tx = db.transaction(STORE_MERCHANTS, 'readwrite');
  const store = tx.objectStore(STORE_MERCHANTS);
  sourceIdsToDelete.forEach(id => store.delete(id));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllTemplates = (db: IDBDatabase) => getAll<RecurringTemplate>(db, STORE_TEMPLATES);
export const addTemplate = (db: IDBDatabase, t: RecurringTemplate) => add(db, STORE_TEMPLATES, t);
export const updateTemplate = (db: IDBDatabase, t: RecurringTemplate) => update(db, STORE_TEMPLATES, t);
export const deleteTemplate = (db: IDBDatabase, id: number) => remove(db, STORE_TEMPLATES, id);

export const getAllPaymentMethods = (db: IDBDatabase) => getAll<PaymentMethod>(db, STORE_PAYMENT_METHODS);
export const addPaymentMethod = (db: IDBDatabase, p: PaymentMethod) => add(db, STORE_PAYMENT_METHODS, p);
export const updatePaymentMethod = (db: IDBDatabase, p: PaymentMethod) => update(db, STORE_PAYMENT_METHODS, p);
export const deletePaymentMethod = (db: IDBDatabase, id: number) => remove(db, STORE_PAYMENT_METHODS, id);

export const getAllStatements = (db: IDBDatabase) => getAll<StatementRecord>(db, STORE_STATEMENTS);
export const addStatement = (db: IDBDatabase, s: StatementRecord) => add(db, STORE_STATEMENTS, s);
export const deleteStatement = (db: IDBDatabase, id: number) => remove(db, STORE_STATEMENTS, id);

export const getAllDrafts = (db: IDBDatabase) => getAll<DraftStatement>(db, STORE_DRAFTS);
export const saveDraft = (db: IDBDatabase, d: DraftStatement) => update(db, STORE_DRAFTS, d);
export const deleteDraft = (db: IDBDatabase, id: number) => remove(db, STORE_DRAFTS, id);

export const clearAllData = (db: IDBDatabase): Promise<void> => {
  return new Promise((resolve, reject) => {
    const stores = [STORE_TRANSACTIONS, STORE_CATEGORIES, STORE_MERCHANTS, STORE_TEMPLATES, STORE_PAYMENT_METHODS, STORE_STATEMENTS, STORE_DRAFTS];
    const tx = db.transaction(stores, 'readwrite');
    stores.forEach(s => {
      if (db.objectStoreNames.contains(s)) {
        tx.objectStore(s).clear();
      }
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const importAllData = async (db: IDBDatabase, data: any): Promise<void> => {
  await clearAllData(db);
  return new Promise((resolve, reject) => {
    const stores = [STORE_TRANSACTIONS, STORE_CATEGORIES, STORE_MERCHANTS, STORE_PAYMENT_METHODS, STORE_TEMPLATES, STORE_STATEMENTS, STORE_DRAFTS];
    const tx = db.transaction(stores, 'readwrite');
    if (data.transactions) data.transactions.forEach((t: any) => tx.objectStore(STORE_TRANSACTIONS).put(t));
    if (data.categories) data.categories.forEach((c: any) => tx.objectStore(STORE_CATEGORIES).put(c));
    if (data.merchants) data.merchants.forEach((m: any) => tx.objectStore(STORE_MERCHANTS).put(m));
    if (data.paymentMethods) data.paymentMethods.forEach((p: any) => tx.objectStore(STORE_PAYMENT_METHODS).put(p));
    if (data.templates) data.templates.forEach((tmp: any) => tx.objectStore(STORE_TEMPLATES).put(tmp));
    if (data.statements) data.statements.forEach((s: any) => tx.objectStore(STORE_STATEMENTS).put(s));
    if (data.drafts) data.drafts.forEach((d: any) => tx.objectStore(STORE_DRAFTS).put(d));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};