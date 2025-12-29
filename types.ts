
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
  vendor?: string;
  description: string;
  type: TransactionType;
}

export interface RecurringTemplate {
  id?: number;
  name: string;
  amount: number;
  category: string;
  subCategory?: string;
  vendor?: string;
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

export interface Vendor {
  id?: number;
  name: string;
  website?: string;
  location?: string;
  notes?: string;
  color?: string;
}

export type View = 'dashboard' | 'list' | 'reports' | 'categories' | 'vendors' | 'backups' | 'templates';

export const INITIAL_CATEGORIES: { name: string; type: TransactionType; subCategories?: string[] }[] = [
  { name: 'Groceries', type: TransactionType.EXPENSE, subCategories: ['Fruit', 'Meat', 'Dairy', 'Snacks'] },
  { name: 'Rent', type: TransactionType.EXPENSE, subCategories: ['Monthly Rent', 'Security Deposit'] },
  { name: 'Salary', type: TransactionType.INCOME, subCategories: ['Primary Job', 'Freelance', 'Contract'] },
  { name: 'Utilities', type: TransactionType.EXPENSE, subCategories: ['Electricity', 'Water', 'Internet', 'Gas'] },
  { name: 'Transportation', type: TransactionType.EXPENSE, subCategories: ['Fuel', 'Public Transit', 'Ride Share', 'Parking'] },
  { name: 'Entertainment', type: TransactionType.EXPENSE, subCategories: ['Movies', 'Games', 'Dining Out', 'Concerts'] },
  { name: 'Healthcare', type: TransactionType.EXPENSE, subCategories: ['Pharmacy', 'Doctor', 'Dental'] },
  { name: 'Shopping', type: TransactionType.EXPENSE, subCategories: ['Clothes', 'Electronics', 'Hobby'] },
  { name: 'Other', type: TransactionType.BOTH, subCategories: ['Misc'] }
];
