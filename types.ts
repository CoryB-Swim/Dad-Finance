
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  BOTH = 'BOTH'
}

export type Frequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceSchedule {
  frequency: Frequency;
  dayOfWeek?: number; // 0-6 (Sun-Sat)
  dayOfMonth?: number; // 1-31
  weekOfMonth?: number; // 1, 2, 3, 4, 5 (5 means last)
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
  fromTemplate?: boolean;
  reconciled?: boolean;
  clearedAt?: string;
}

export interface StatementRecord {
  id?: number;
  paymentMethod: string;
  statementDate: string;
  startingBalance: number;
  endingBalance: number;
  transactionIds: number[];
  createdAt: string;
  balanceMode?: 'asset' | 'liability';
}

export interface DraftStatement {
  id?: number;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  targetBalance: number;
  transactionIds: number[];
  updatedAt: string;
  balanceMode?: 'asset' | 'liability';
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
  schedule?: RecurrenceSchedule;
  lastPostedDate?: string;
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

export type View = 'dashboard' | 'list' | 'categories' | 'merchants' | 'payments' | 'backups' | 'templates' | 'reconciliation';

export const INITIAL_CATEGORIES: { name: string; type: TransactionType; subCategories?: string[] }[] = [];
