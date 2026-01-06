import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FriendBalance {
  oderId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  amount: number; // positive = they owe you, negative = you owe them
}

export function useBalances() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['balances', user?.id],
    queryFn: async (): Promise<FriendBalance[]> => {
      if (!user) return [];

      const balanceMap = new Map<string, { amount: number; name: string; avatar?: string }>();

      // Get expenses where the user paid (others owe them)
      const { data: paidExpenses, error: paidError } = await supabase
        .from('expenses')
        .select(`
          id,
          amount,
          expense_splits (
            user_id,
            amount,
            is_settled
          )
        `)
        .eq('paid_by', user.id);

      console.log('useBalances - paidExpenses:', paidExpenses, 'error:', paidError);

      if (paidExpenses) {
        for (const expense of paidExpenses) {
          for (const split of expense.expense_splits || []) {
            // Only count unsettled splits for other users (not the payer themselves)
            if (split.user_id !== user.id && split.is_settled !== true) {
              const current = balanceMap.get(split.user_id) || { amount: 0, name: '', avatar: undefined };
              current.amount += Number(split.amount); // They owe you
              balanceMap.set(split.user_id, current);
            }
          }
        }
      }

      // Get expense splits where user owes someone else
      const { data: owedSplits, error: owedError } = await supabase
        .from('expense_splits')
        .select(`
          amount,
          is_settled,
          expenses (
            paid_by
          )
        `)
        .eq('user_id', user.id)
        .or('is_settled.eq.false,is_settled.is.null');

      console.log('useBalances - owedSplits:', owedSplits, 'error:', owedError);

      if (owedSplits) {
        for (const split of owedSplits) {
          const expense = split.expenses as any;
          if (expense && expense.paid_by !== user.id) {
            const current = balanceMap.get(expense.paid_by) || { amount: 0, name: '', avatar: undefined };
            current.amount -= Number(split.amount); // You owe them
            balanceMap.set(expense.paid_by, current);
          }
        }
      }

      console.log('useBalances - balanceMap:', Object.fromEntries(balanceMap));

      // Get profiles for all users in the balance map
      const userIds = Array.from(balanceMap.keys());
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles_display')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      if (profiles) {
        for (const profile of profiles) {
          const balance = balanceMap.get(profile.id);
          if (balance) {
            balance.name = profile.display_name || 'Unknown';
            balance.avatar = profile.avatar_url || undefined;
          }
        }
      }

      // Convert map to array
      return Array.from(balanceMap.entries())
        .map(([oderId, data]) => ({
          oderId: oderId,
          user: {
            id: oderId,
            name: data.name,
            avatar: data.avatar,
          },
          amount: data.amount,
        }))
        .filter(b => Math.abs(b.amount) > 0.01); // Filter out near-zero balances
    },
    enabled: !!user,
  });
}
