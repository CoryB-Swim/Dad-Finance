
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  BOTH = 'BOTH'
}

export interface Transaction {
  id?: number;
  amount: number;
  date: string;
  category: string;
  subCategory?: string;
  merchant?: string;
  paymentMethod?: string;
  description: string;
  type: TransactionType;
}

export interface RecurringTemplate {
  id?: number;
  name: string;
  amount: number;
  category: string;
  subCategory?: string;
  merchant?: string;
  paymentMethod?: string;
  description: string;
  type: TransactionType;
}

export interface Category {
  id?: number;
  name: string;
  color?: string;
  type: TransactionType;
  subCategories?: string[];
}

export interface Merchant {
  id?: number;
  name: string;
  website?: string;
  location?: string;
  phone?: string;
  notes?: string;
  color?: string;
}

export interface PaymentMethod {
  id?: number;
  name: string;
  color?: string;
  icon?: string;
}

export type View = 'dashboard' | 'list' | 'categories' | 'merchants' | 'payments' | 'backups' | 'templates';

export const INITIAL_CATEGORIES: { name: string; type: TransactionType; subCategories?: string[] }[] = [];
