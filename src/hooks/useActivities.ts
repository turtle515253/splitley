import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityType = 'expense_added' | 'expense_deleted' | 'payment_made' | 'group_created' | 'member_added';

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  expenseDescription?: string;
  payerName: string;
  amount?: number;
  userShare?: number; // positive = you get back, negative = you owe
  category?: string;
  groupName?: string;
  createdAt: Date;
  expenseId?: string;
  groupId?: string;
}

export function useActivities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['activities', user?.id],
    queryFn: async (): Promise<Activity[]> => {
      if (!user) return [];

      const activities: Activity[] = [];

      // Fetch expenses the user created or is part of (via splits)
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          category,
          created_at,
          paid_by,
          group_id,
          profiles:paid_by (display_name),
          groups:group_id (name),
          expense_splits!fk_expense_splits_expense_id (
            user_id,
            amount
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('[useActivities] Expenses fetched:', expenses?.length || 0, 'Error:', expensesError);

      if (expenses) {
        for (const expense of expenses) {
          const payerName = expense.paid_by === user.id 
            ? 'You' 
            : (expense.profiles as any)?.display_name || 'Someone';
          
          // Calculate user's share
          const splits = expense.expense_splits || [];
          const userSplit = splits.find((s: any) => s.user_id === user.id);
          const isUserPayer = expense.paid_by === user.id;
          
          let userShare = 0;
          if (isUserPayer) {
            // User paid - they get back the sum of other people's splits
            userShare = splits
              .filter((s: any) => s.user_id !== user.id)
              .reduce((sum: number, s: any) => sum + Number(s.amount), 0);
          } else if (userSplit) {
            // User didn't pay but has a split - they owe this amount
            userShare = -Number(userSplit.amount);
          }
          
          activities.push({
            id: `expense-${expense.id}`,
            type: 'expense_added',
            description: `${payerName} added "${expense.description}"`,
            expenseDescription: expense.description,
            payerName,
            amount: Number(expense.amount),
            userShare,
            category: expense.category || 'general',
            groupName: (expense.groups as any)?.name,
            createdAt: new Date(expense.created_at),
            expenseId: expense.id,
            groupId: expense.group_id || undefined,
          });
        }
      }

      // Fetch settlements from the settlements table
      const { data: settlements } = await supabase
        .from('settlements')
        .select(`
          id,
          amount,
          created_at,
          payer_id,
          receiver_id,
          payer:payer_id (display_name),
          receiver:receiver_id (display_name)
        `)
        .or(`payer_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (settlements) {
        for (const settlement of settlements) {
          const payer = settlement.payer as any;
          const receiver = settlement.receiver as any;
          
          const payerName = settlement.payer_id === user.id 
            ? 'You' 
            : payer?.display_name || 'Someone';
          const receiverName = settlement.receiver_id === user.id 
            ? 'you' 
            : receiver?.display_name || 'someone';
          
          // If user is receiver, they received money (positive)
          // If user is payer, they paid (negative from their perspective for display)
          const userShare = settlement.receiver_id === user.id 
            ? Number(settlement.amount) 
            : -Number(settlement.amount);
          
          activities.push({
            id: `settlement-${settlement.id}`,
            type: 'payment_made',
            description: `${payerName} paid ${receiverName}`,
            payerName,
            amount: Number(settlement.amount),
            userShare,
            createdAt: new Date(settlement.created_at),
          });
        }
      }

      // Fetch groups created by the user
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name, created_at, created_by')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (groups) {
        for (const group of groups) {
          activities.push({
            id: `group-${group.id}`,
            type: 'group_created',
            description: `You created "${group.name}"`,
            payerName: 'You',
            groupName: group.name,
            createdAt: new Date(group.created_at),
          });
        }
      }

      // Sort all activities by date
      return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    enabled: !!user,
  });
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}
