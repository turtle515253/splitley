export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  members: User[];
  totalExpenses: number;
  createdAt: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: User;
  splitWith: User[];
  groupId?: string;
  category: ExpenseCategory;
  createdAt: Date;
  splitType: 'equal' | 'exact' | 'percentage';
}

export interface Balance {
  userId: string;
  user: User;
  amount: number; // positive = they owe you, negative = you owe them
}

export type ExpenseCategory = 
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'shopping'
  | 'utilities'
  | 'rent'
  | 'travel'
  | 'other';

export interface Activity {
  id: string;
  type: 'expense_added' | 'expense_deleted' | 'payment_made' | 'group_created' | 'member_added';
  description: string;
  amount?: number;
  user: User;
  createdAt: Date;
  groupId?: string;
}
