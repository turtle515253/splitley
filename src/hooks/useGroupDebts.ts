import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { simplifyDebts } from '@/lib/simplifyDebts';

export interface DebtMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface SimplifiedGroupDebt {
  from: DebtMember;
  to: DebtMember;
  amount: number;
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
  splits: ExpenseSplit[];
}

interface Settlement {
  payer_id: string;
  receiver_id: string;
  amount: number;
}

/**
 * Shared hook that calculates simplified debts for a group.
 * This is the SINGLE SOURCE OF TRUTH for debt calculations.
 * Used by both GroupDebtsCard and useBalances to ensure consistency.
 */
export function useGroupDebts(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-debts', groupId],
    queryFn: async (): Promise<SimplifiedGroupDebt[]> => {
      if (!groupId) return [];

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

      const members: DebtMember[] = (membersData || []).map((m: any) => ({
        user_id: m.user_id,
        display_name: m.profiles?.display_name || null,
        avatar_url: m.profiles?.avatar_url || null,
      }));

      if (members.length === 0) return [];

      const memberIds = members.map(m => m.user_id);

      // Get group expenses with splits
      const { data: expensesData } = await supabase
        .from('expenses')
        .select(`
          id,
          amount,
          paid_by,
          expense_splits!fk_expense_splits_expense_id (
            user_id,
            amount,
            is_settled
          )
        `)
        .eq('group_id', groupId);

      const expenses: Expense[] = (expensesData || []).map((e: any) => ({
        id: e.id,
        amount: Number(e.amount),
        paid_by: e.paid_by,
        splits: (e.expense_splits || []).map((s: any) => ({
          user_id: s.user_id,
          amount: Number(s.amount),
          is_settled: s.is_settled,
        })),
      }));

      // Get group settlements
      const { data: groupSettlementsData } = await supabase
        .from('group_settlements')
        .select('payer_id, receiver_id, amount')
        .eq('group_id', groupId);

      const groupSettlements: Settlement[] = (groupSettlementsData || []).map((s: any) => ({
        payer_id: s.payer_id,
        receiver_id: s.receiver_id,
        amount: Number(s.amount),
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
          amount: Number(s.amount),
        }));

      // Calculate balances
      return calculateDebtsFromData(members, expenses, groupSettlements, regularSettlements);
    },
    enabled: !!groupId,
  });
}

/**
 * Pure function to calculate debts from data.
 * Extracted for testability and reuse.
 */
export function calculateDebtsFromData(
  members: DebtMember[],
  expenses: Expense[],
  groupSettlements: Settlement[],
  regularSettlements: Settlement[]
): SimplifiedGroupDebt[] {
  const balances: Record<string, number> = {};
  const memberIds = new Set(members.map(m => m.user_id));

  // Initialize all members with 0
  members.forEach(m => {
    balances[m.user_id] = 0;
  });

  // Calculate from expenses - only unsettled splits
  for (const expense of expenses) {
    const unsettledSplits = (expense.splits || []).filter(s => s.is_settled !== true);

    // Calculate total that others owe the payer (excluding payer's own split)
    const totalOwedToPayer = unsettledSplits
      .filter(s => s.user_id !== expense.paid_by)
      .reduce((sum, s) => sum + s.amount, 0);

    // Payer gets credit for what others owe
    if (balances[expense.paid_by] !== undefined) {
      balances[expense.paid_by] += totalOwedToPayer;
    }

    // Each person's unsettled share is their debt (excluding payer)
    for (const split of unsettledSplits) {
      if (split.user_id !== expense.paid_by && balances[split.user_id] !== undefined) {
        balances[split.user_id] -= split.amount;
      }
    }
  }

  // Apply group settlements
  for (const settlement of groupSettlements) {
    if (balances[settlement.payer_id] !== undefined) {
      balances[settlement.payer_id] += settlement.amount;
    }
    if (balances[settlement.receiver_id] !== undefined) {
      balances[settlement.receiver_id] -= settlement.amount;
    }
  }

  // Apply regular settlements between group members
  for (const settlement of regularSettlements) {
    if (memberIds.has(settlement.payer_id) && memberIds.has(settlement.receiver_id)) {
      if (balances[settlement.payer_id] !== undefined) {
        balances[settlement.payer_id] += settlement.amount;
      }
      if (balances[settlement.receiver_id] !== undefined) {
        balances[settlement.receiver_id] -= settlement.amount;
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

  // Use the shared simplification algorithm
  const debts = simplifyDebts(balanceMap);

  // Convert to DebtMember format
  const memberMap = new Map(members.map(m => [m.user_id, m]));

  return debts.map(debt => ({
    from: memberMap.get(debt.from.id) || { user_id: debt.from.id, display_name: debt.from.name || null, avatar_url: debt.from.avatar || null },
    to: memberMap.get(debt.to.id) || { user_id: debt.to.id, display_name: debt.to.name || null, avatar_url: debt.to.avatar || null },
    amount: debt.amount,
  }));
}
