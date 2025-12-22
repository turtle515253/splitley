import { User, Group, Expense, Activity, Balance } from '@/types';

export const currentUser: User = {
  id: '1',
  name: 'You',
  email: 'you@example.com',
  avatar: undefined,
};

export const users: User[] = [
  currentUser,
  { id: '2', name: 'Alex Johnson', email: 'alex@example.com' },
  { id: '3', name: 'Sarah Miller', email: 'sarah@example.com' },
  { id: '4', name: 'Mike Chen', email: 'mike@example.com' },
  { id: '5', name: 'Emma Davis', email: 'emma@example.com' },
  { id: '6', name: 'Chris Wilson', email: 'chris@example.com' },
];

export const groups: Group[] = [
  {
    id: 'g1',
    name: 'Weekend Trip',
    emoji: '✈️',
    members: [users[0], users[1], users[2], users[3]],
    totalExpenses: 450.00,
    createdAt: new Date('2024-12-15'),
  },
  {
    id: 'g2',
    name: 'Roommates',
    emoji: '🏠',
    members: [users[0], users[4], users[5]],
    totalExpenses: 890.50,
    createdAt: new Date('2024-11-01'),
  },
  {
    id: 'g3',
    name: 'Office Lunch',
    emoji: '🍕',
    members: [users[0], users[1], users[2]],
    totalExpenses: 156.75,
    createdAt: new Date('2024-12-10'),
  },
];

export const expenses: Expense[] = [
  {
    id: 'e1',
    description: 'Dinner at Italian Place',
    amount: 120.00,
    paidBy: users[1],
    splitWith: [users[0], users[1], users[2], users[3]],
    groupId: 'g1',
    category: 'food',
    createdAt: new Date('2024-12-20'),
    splitType: 'equal',
  },
  {
    id: 'e2',
    description: 'Uber to Airport',
    amount: 45.50,
    paidBy: users[0],
    splitWith: [users[0], users[1], users[2]],
    groupId: 'g1',
    category: 'transport',
    createdAt: new Date('2024-12-19'),
    splitType: 'equal',
  },
  {
    id: 'e3',
    description: 'Monthly Electricity',
    amount: 145.00,
    paidBy: users[4],
    splitWith: [users[0], users[4], users[5]],
    groupId: 'g2',
    category: 'utilities',
    createdAt: new Date('2024-12-18'),
    splitType: 'equal',
  },
  {
    id: 'e4',
    description: 'Team Pizza',
    amount: 68.00,
    paidBy: users[0],
    splitWith: [users[0], users[1], users[2]],
    groupId: 'g3',
    category: 'food',
    createdAt: new Date('2024-12-17'),
    splitType: 'equal',
  },
  {
    id: 'e5',
    description: 'Coffee Run',
    amount: 24.50,
    paidBy: users[2],
    splitWith: [users[0], users[2]],
    category: 'food',
    createdAt: new Date('2024-12-16'),
    splitType: 'equal',
  },
];

export const activities: Activity[] = [
  {
    id: 'a1',
    type: 'expense_added',
    description: 'Alex added "Dinner at Italian Place"',
    amount: 120.00,
    user: users[1],
    createdAt: new Date('2024-12-20'),
    groupId: 'g1',
  },
  {
    id: 'a2',
    type: 'expense_added',
    description: 'You added "Uber to Airport"',
    amount: 45.50,
    user: users[0],
    createdAt: new Date('2024-12-19'),
    groupId: 'g1',
  },
  {
    id: 'a3',
    type: 'payment_made',
    description: 'Mike paid you',
    amount: 25.00,
    user: users[3],
    createdAt: new Date('2024-12-18'),
  },
  {
    id: 'a4',
    type: 'expense_added',
    description: 'Emma added "Monthly Electricity"',
    amount: 145.00,
    user: users[4],
    createdAt: new Date('2024-12-18'),
    groupId: 'g2',
  },
  {
    id: 'a5',
    type: 'group_created',
    description: 'You created "Office Lunch"',
    user: users[0],
    createdAt: new Date('2024-12-10'),
    groupId: 'g3',
  },
];

export const balances: Balance[] = [
  { userId: '2', user: users[1], amount: -30.00 }, // You owe Alex
  { userId: '3', user: users[2], amount: 12.25 }, // Sarah owes you
  { userId: '4', user: users[3], amount: 22.67 }, // Mike owes you
  { userId: '5', user: users[4], amount: -48.33 }, // You owe Emma
  { userId: '6', user: users[5], amount: 0 }, // Settled with Chris
];

export const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    food: '🍔',
    transport: '🚗',
    entertainment: '🎬',
    shopping: '🛍️',
    utilities: '💡',
    rent: '🏠',
    travel: '✈️',
    other: '📦',
  };
  return icons[category] || '📦';
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(amount));
};

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
