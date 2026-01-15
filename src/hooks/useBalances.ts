import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { simplifyDebts } from '@/lib/simplifyDebts';

export interface FriendBalance {
  oderId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  amount: number; // positive = they owe you, negative = you owe them
}

interface ExpenseSplit {
  user_id: string;
  amount: number;
  is_settled?: boolean | null;
}

interface Expense {
  id: string;
  amount: number;
  paid_by: string;
  group_id: string | null;
  expense_splits: ExpenseSplit[];
}

interface Settlement {
  payer_id: string;
  receiver_id: string;
  amount: number;
}

interface GroupMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Calculate simplified debts for a single group - SAME LOGIC as GroupDebtsCard
 */
function calculateGroupDebts(
  members: GroupMember[],
  expenses: Expense[],
  groupSettlements: Settlement[],
  regularSettlements: Settlement[]
): { from: string; to: string; amount: number }[] {
  const balances: Record<string, number> = {};
  const memberIds = new Set(members.map(m => m.user_id));

  // Initialize all members with 0
  members.forEach(m => {
    balances[m.user_id] = 0;
  });

  // Calculate from expenses - only unsettled splits
  for (const expense of expenses) {
    const unsettledSplits = (expense.expense_splits || []).filter(s => s.is_settled !== true);

    const totalUnsettled = unsettledSplits
      .filter(s => s.user_id !== expense.paid_by)
      .reduce((sum, s) => sum + Number(s.amount), 0);

    if (balances[expense.paid_by] !== undefined) {
      balances[expense.paid_by] += totalUnsettled;
    }

    for (const split of unsettledSplits) {
      if (split.user_id !== expense.paid_by && balances[split.user_id] !== undefined) {
        balances[split.user_id] -= Number(split.amount);
      }
    }
  }

  // Apply group settlements
  for (const settlement of groupSettlements) {
    if (balances[settlement.payer_id] !== undefined) {
      balances[settlement.payer_id] += Number(settlement.amount);
    }
    if (balances[settlement.receiver_id] !== undefined) {
      balances[settlement.receiver_id] -= Number(settlement.amount);
    }
  }

  // Apply regular settlements between group members
  for (const settlement of regularSettlements) {
    if (memberIds.has(settlement.payer_id) && memberIds.has(settlement.receiver_id)) {
      if (balances[settlement.payer_id] !== undefined) {
        balances[settlement.payer_id] += Number(settlement.amount);
      }
      if (balances[settlement.receiver_id] !== undefined) {
        balances[settlement.receiver_id] -= Number(settlement.amount);
      }
    }
  }

  // Build balance map for simplification
  const balanceMap = new Map<string, { balance: number; member: { id: string; name?: string; avatar?: string } }>();

  members.forEach(member => {
    const balance = balances[member.user_id] || 0;
    balanceMap.set(member.user_id, {
      balance,
      member: {
        id: member.user_id,
        name: member.display_name || undefined,
        avatar: member.avatar_url || undefined,
      },
    });
  });

  // Use the SAME simplification algorithm
  const debts = simplifyDebts(balanceMap);

  return debts.map(d => ({
    from: d.from.id,
    to: d.to.id,
    amount: d.amount,
  }));
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

      if (groupIds.length === 0) {
        return [];
      }

      // For each group, get members, expenses, and settlements
      // Then calculate debts per group and aggregate
      const allDebts: { from: string; to: string; amount: number; fromName?: string; toName?: string; fromAvatar?: string; toAvatar?: string }[] = [];
      const profileCache = new Map<string, { name: string; avatar?: string }>();

      for (const groupId of groupIds) {
        // Get group members with their profiles
        const { data: membersData } = await supabase
          .from('group_members')
          .select(`
            user_id,
            profiles:profiles_display!fk_group_members_user_id (
              display_name,
              avatar_url
            )
          `)
          .eq('group_id', groupId);

        const members: GroupMember[] = (membersData || []).map((m: any) => ({
          user_id: m.user_id,
          display_name: m.profiles?.display_name || null,
          avatar_url: m.profiles?.avatar_url || null,
        }));

        // Cache profiles
        members.forEach(m => {
          if (!profileCache.has(m.user_id)) {
            profileCache.set(m.user_id, {
              name: m.display_name || 'Unknown',
              avatar: m.avatar_url || undefined,
            });
          }
        });

        const memberIds = members.map(m => m.user_id);

        // Get group expenses with splits
        const { data: expensesData } = await supabase
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
          .eq('group_id', groupId);

        const expenses: Expense[] = (expensesData || []).map((e: any) => ({
          id: e.id,
          amount: e.amount,
          paid_by: e.paid_by,
          group_id: e.group_id,
          expense_splits: e.expense_splits || [],
        }));

        // Get group settlements
        const { data: groupSettlementsData } = await supabase
          .from('group_settlements')
          .select('payer_id, receiver_id, amount')
          .eq('group_id', groupId);

        const groupSettlements: Settlement[] = (groupSettlementsData || []).map((s: any) => ({
          payer_id: s.payer_id,
          receiver_id: s.receiver_id,
          amount: s.amount,
        }));

        // Get regular settlements between group members
        const { data: regularSettlementsData } = await supabase
          .from('settlements')
          .select('payer_id, receiver_id, amount');

        const regularSettlements: Settlement[] = (regularSettlementsData || [])
          .filter((s: any) => memberIds.includes(s.payer_id) && memberIds.includes(s.receiver_id))
          .map((s: any) => ({
            payer_id: s.payer_id,
            receiver_id: s.receiver_id,
            amount: s.amount,
          }));

        // Calculate debts for this group using SAME algorithm as GroupDebtsCard
        const groupDebts = calculateGroupDebts(members, expenses, groupSettlements, regularSettlements);

        // Add to all debts with profile info
        for (const debt of groupDebts) {
          const fromProfile = profileCache.get(debt.from);
          const toProfile = profileCache.get(debt.to);
          allDebts.push({
            ...debt,
            fromName: fromProfile?.name,
            toName: toProfile?.name,
            fromAvatar: fromProfile?.avatar,
            toAvatar: toProfile?.avatar,
          });
        }
      }

      console.log('[useBalances] All debts from all groups:', allDebts.map(d => ({
        from: d.fromName,
        to: d.toName,
        amount: d.amount
      })));

      // Filter to only debts involving the current user
      const userDebts = new Map<string, FriendBalance>();

      for (const debt of allDebts) {
        if (debt.from === user.id) {
          // User owes someone
          const existing = userDebts.get(debt.to);
          if (existing) {
            existing.amount -= debt.amount; // More negative = user owes more
          } else {
            userDebts.set(debt.to, {
              oderId: debt.to,
              user: {
                id: debt.to,
                name: debt.toName || 'Unknown',
                avatar: debt.toAvatar,
              },
              amount: -debt.amount, // Negative = user owes them
            });
          }
        } else if (debt.to === user.id) {
          // Someone owes the user
          const existing = userDebts.get(debt.from);
          if (existing) {
            existing.amount += debt.amount; // More positive = they owe user more
          } else {
            userDebts.set(debt.from, {
              oderId: debt.from,
              user: {
                id: debt.from,
                name: debt.fromName || 'Unknown',
                avatar: debt.fromAvatar,
              },
              amount: debt.amount, // Positive = they owe user
            });
          }
        }
      }

      const result = Array.from(userDebts.values()).filter(b => Math.abs(b.amount) >= 1);

      // Filter out zero balances and return
      return result;
    },
    enabled: !!user,
  });
}
