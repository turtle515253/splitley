import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { simplifyDebts, SimplifiedDebt } from '@/lib/simplifyDebts';

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

      // Get all settlements
      const { data: settlements } = await supabase
        .from('settlements')
        .select('id, payer_id, receiver_id, amount');

      // Get all group settlements for groups the user is in
      const { data: groupSettlements } = await supabase
        .from('group_settlements')
        .select('id, payer_id, receiver_id, amount, group_id')
        .in('group_id', groupIds.length > 0 ? groupIds : ['00000000-0000-0000-0000-000000000000']);

      // Collect all unique user IDs involved
      const allUserIds = new Set<string>();
      allUserIds.add(user.id);
      
      for (const expense of allExpenses.values()) {
        allUserIds.add(expense.paid_by);
        for (const split of expense.expense_splits || []) {
          allUserIds.add(split.user_id);
        }
      }
      
      for (const s of settlements || []) {
        allUserIds.add(s.payer_id);
        allUserIds.add(s.receiver_id);
      }
      
      for (const gs of groupSettlements || []) {
        allUserIds.add(gs.payer_id);
        allUserIds.add(gs.receiver_id);
      }

      // Calculate NET BALANCE for each user across ALL expenses
      // Positive = they're owed money, Negative = they owe money
      const netBalances = new Map<string, number>();
      
      for (const userId of allUserIds) {
        netBalances.set(userId, 0);
      }

      for (const expense of allExpenses.values()) {
        const unsettledSplits = (expense.expense_splits || []).filter((s: any) => s.is_settled !== true);
        
        // Calculate total unsettled amount that others owe the payer
        const totalUnsettled = unsettledSplits
          .filter((s: any) => s.user_id !== expense.paid_by)
          .reduce((sum: number, s: any) => sum + Number(s.amount), 0);
        
        // Person who paid gets credit for what others still owe them
        const payerBalance = netBalances.get(expense.paid_by) || 0;
        netBalances.set(expense.paid_by, payerBalance + totalUnsettled);

        // Each person's unsettled share is their debt
        for (const split of unsettledSplits) {
          if (split.user_id !== expense.paid_by) {
            const current = netBalances.get(split.user_id) || 0;
            netBalances.set(split.user_id, current - Number(split.amount));
          }
        }
      }

      // Apply settlements
      for (const settlement of settlements || []) {
        const amount = Number(settlement.amount);
        // Payer's balance increases (less in debt), receiver's balance decreases
        const payerBalance = netBalances.get(settlement.payer_id) || 0;
        netBalances.set(settlement.payer_id, payerBalance + amount);
        
        const receiverBalance = netBalances.get(settlement.receiver_id) || 0;
        netBalances.set(settlement.receiver_id, receiverBalance - amount);
      }

      // Apply group settlements
      for (const settlement of groupSettlements || []) {
        const amount = Number(settlement.amount);
        const payerBalance = netBalances.get(settlement.payer_id) || 0;
        netBalances.set(settlement.payer_id, payerBalance + amount);
        
        const receiverBalance = netBalances.get(settlement.receiver_id) || 0;
        netBalances.set(settlement.receiver_id, receiverBalance - amount);
      }

      // Get profiles for all users
      const userIds = Array.from(allUserIds);
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

      // Build the balance map for simplification
      const balanceMap = new Map<string, { balance: number; member: { id: string; name?: string; avatar?: string } }>();
      
      netBalances.forEach((balance, oderId) => {
        const profile = profileMap.get(oderId) || { name: 'Unknown', avatar: undefined };
        balanceMap.set(oderId, {
          balance,
          member: {
            id: oderId,
            name: profile.name,
            avatar: profile.avatar,
          },
        });
      });

      // Use the same simplification algorithm as GroupDebtsCard
      const simplifiedDebts = simplifyDebts(balanceMap);

      // Filter to only debts that involve the current user
      const results: FriendBalance[] = [];
      
      for (const debt of simplifiedDebts) {
        if (debt.from.id === user.id) {
          // Current user owes someone
          results.push({
            oderId: debt.to.id,
            user: {
              id: debt.to.id,
              name: debt.to.name || 'Unknown',
              avatar: debt.to.avatar,
            },
            amount: -debt.amount, // negative = you owe them
          });
        } else if (debt.to.id === user.id) {
          // Someone owes current user
          results.push({
            oderId: debt.from.id,
            user: {
              id: debt.from.id,
              name: debt.from.name || 'Unknown',
              avatar: debt.from.avatar,
            },
            amount: debt.amount, // positive = they owe you
          });
        }
      }

      return results;
    },
    enabled: !!user,
  });
}
