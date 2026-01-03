import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityType = 'expense_added' | 'expense_deleted' | 'payment_made' | 'group_created' | 'member_added';

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  amount?: number;
  createdAt: Date;
}

export function useActivities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['activities', user?.id],
    queryFn: async (): Promise<Activity[]> => {
      if (!user) return [];

      const activities: Activity[] = [];

      // Fetch expenses the user created or is part of (via splits)
      const { data: expenses } = await supabase
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          created_at,
          paid_by,
          profiles:paid_by (display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (expenses) {
        for (const expense of expenses) {
          const payerName = expense.paid_by === user.id 
            ? 'You' 
            : (expense.profiles as any)?.display_name || 'Someone';
          
          activities.push({
            id: `expense-${expense.id}`,
            type: 'expense_added',
            description: `${payerName} added "${expense.description}"`,
            amount: Number(expense.amount),
            createdAt: new Date(expense.created_at),
          });
        }
      }

      // Fetch settled payments
      const { data: settlements } = await supabase
        .from('expense_splits')
        .select(`
          id,
          amount,
          settled_at,
          user_id,
          expense_id,
          expenses (
            description,
            paid_by,
            profiles:paid_by (display_name)
          )
        `)
        .eq('is_settled', true)
        .not('settled_at', 'is', null)
        .order('settled_at', { ascending: false })
        .limit(20);

      if (settlements) {
        for (const settlement of settlements) {
          const expense = settlement.expenses as any;
          if (!expense) continue;
          
          const payerName = expense.paid_by === user.id 
            ? 'You' 
            : expense.profiles?.display_name || 'Someone';
          const payeeName = settlement.user_id === user.id ? 'You' : 'Someone';
          
          activities.push({
            id: `payment-${settlement.id}`,
            type: 'payment_made',
            description: `${payeeName} paid ${payerName} for "${expense.description}"`,
            amount: Number(settlement.amount),
            createdAt: new Date(settlement.settled_at!),
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
