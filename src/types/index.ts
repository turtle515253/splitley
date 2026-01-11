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
  // Entertainment
  | 'games'
  | 'movies'
  | 'music'
  | 'entertainment_other'
  | 'sports'
  // Food and drink
  | 'dining_out'
  | 'groceries'
  | 'liquor'
  | 'tea_coffee'
  | 'soft_drinks'
  | 'food_other'
  // Home
  | 'electronics'
  | 'furniture'
  | 'household_supplies'
  | 'maintenance'
  | 'mortgage'
  | 'home_other'
  | 'pets'
  | 'rent'
  | 'services'
  // Life
  | 'childcare'
  | 'clothing'
  | 'education'
  | 'gifts'
  | 'insurance'
  | 'medical'
  | 'life_other'
  | 'taxes'
  // Transportation
  | 'bicycle'
  | 'bus_train'
  | 'car'
  | 'gas_fuel'
  | 'hotel'
  | 'transport_other'
  | 'parking'
  | 'plane'
  | 'taxi'
  // Utilities
  | 'cleaning'
  | 'electricity'
  | 'heat_gas'
  | 'utilities_other'
  | 'trash'
  | 'tv_phone_internet'
  | 'water'
  // Uncategorized
  | 'general';

export interface Activity {
  id: string;
  type: 'expense_added' | 'expense_deleted' | 'payment_made' | 'group_created' | 'member_added';
  description: string;
  amount?: number;
  user: User;
  createdAt: Date;
  groupId?: string;
}
