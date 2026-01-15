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
  amount: number; // positive = they owe you (simplified), negative = you owe them (simplified)
}
export function useBalances() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['balances', user?.id],
    queryFn: async (): Promise<FriendBalance[]> => {
      if (!user) return [];

      // Get all groups the user is a member of
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const groupIds = userGroups?.map(g => g.group_id) || [];

      // Get all expenses from these groups
      const { data: groupExpenses } = await supabase
        .from('expenses')
        .select(`
          id,
          amount,
          paid_by,
          group_id,
          expense_splits!fk_expense_splits_expense_id (
            user_id,
            amount,
            is_settled
          )
        `)
        .in('group_id', groupIds.length > 0 ? groupIds : ['00000000-0000-0000-0000-000000000000']);

      // Also get non-group expenses where user paid or is in split
      const { data: userPaidExpenses } = await supabase
        .from('expenses')
        .select(`
          id,
          amount,
          paid_by,
          group_id,
          expense_splits!fk_expense_splits_expense_id (
            user_id,
            amount,
            is_settled
          )
        `)
        .is('group_id', null)
        .eq('paid_by', user.id);

      const { data: userSplitExpenses } = await supabase
        .from('expense_splits')
        .select(`
          expense_id,
          expenses!fk_expense_splits_expense_id (
            id,
            amount,
            paid_by,
            group_id,
            expense_splits!fk_expense_splits_expense_id (
              user_id,
              amount,
              is_settled
            )
          )
        `)
        .eq('user_id', user.id);

      // Combine all expenses, removing duplicates
      const allExpenses = new Map<string, any>();
      
      for (const expense of groupExpenses || []) {
        allExpenses.set(expense.id, expense);
      }
      
      for (const expense of userPaidExpenses || []) {
        allExpenses.set(expense.id, expense);
      }
      
      for (const split of userSplitExpenses || []) {
        const expense = split.expenses as any;
        if (expense && !expense.group_id) {
          allExpenses.set(expense.id, expense);
        }
      }

      // Get settlements between current user and others
      const { data: settlements } = await supabase
        .from('settlements')
        .select('id, payer_id, receiver_id, amount')
        .or(`payer_id.eq.${user.id},receiver_id.eq.${user.id}`);

      // Calculate PAIRWISE balances: what each friend owes YOU directly
      // Positive = they owe you, Negative = you owe them
      const pairwiseBalances = new Map<string, number>();

      for (const expense of allExpenses.values()) {
        const splits = expense.expense_splits || [];
        const unsettledSplits = splits.filter((s: any) => s.is_settled !== true);
        
        if (expense.paid_by === user.id) {
          // Current user paid - each person's unsettled split amount is what they owe you
          for (const split of unsettledSplits) {
            if (split.user_id !== user.id) {
              const current = pairwiseBalances.get(split.user_id) || 0;
              pairwiseBalances.set(split.user_id, current + Number(split.amount));
            }
          }
        } else {
          // Someone else paid - find current user's unsettled split (what you owe them)
          const myUnsettledSplit = unsettledSplits.find((s: any) => s.user_id === user.id);
          if (myUnsettledSplit) {
            const current = pairwiseBalances.get(expense.paid_by) || 0;
            pairwiseBalances.set(expense.paid_by, current - Number(myUnsettledSplit.amount));
          }
        }
      }

      // Apply settlements
      for (const settlement of settlements || []) {
        const amount = Number(settlement.amount);

        if (settlement.payer_id === user.id) {
          // Current user paid someone - reduce what you owe them (or increase what they owe you)
          const current = pairwiseBalances.get(settlement.receiver_id) || 0;
          pairwiseBalances.set(settlement.receiver_id, current + amount);
        } else if (settlement.receiver_id === user.id) {
          // Someone paid current user - reduce what they owe you
          const current = pairwiseBalances.get(settlement.payer_id) || 0;
          pairwiseBalances.set(settlement.payer_id, current - amount);
        }
      }

      // Get profiles for all users
      const userIds = Array.from(pairwiseBalances.keys());
      
      const profileMap = new Map<string, { name: string; avatar?: string }>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_display')
          .select('id, display_name, avatar_url')
          .in('id', userIds);

        if (profiles) {
          for (const profile of profiles) {
            profileMap.set(profile.id!, {
              name: profile.display_name || 'Unknown',
              avatar: profile.avatar_url || undefined,
            });
          }
        }
      }

      // Build results
      const results: FriendBalance[] = [];
      
      pairwiseBalances.forEach((amount, oderId) => {
        const roundedAmount = Math.round(amount);
        if (Math.abs(roundedAmount) > 0) {
          const profile = profileMap.get(oderId) || { name: 'Unknown', avatar: undefined };
          results.push({
            oderId,
            user: {
              id: oderId,
              name: profile.name,
              avatar: profile.avatar,
            },
            amount: roundedAmount,
          });
        }
      });

      return results;
    },
    enabled: !!user,
  });
}
