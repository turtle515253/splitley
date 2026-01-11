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

interface UserNetBalance {
  id: string;
  name: string;
  avatar?: string;
  netBalance: number; // total paid - total share (positive = creditor, negative = debtor)
}

/**
 * Splitwise-style debt simplification algorithm
 * 1. Calculate net balance for each user (total paid - total share)
 * 2. Creditors (positive balance) should receive money
 * 3. Debtors (negative balance) should pay money
 * 4. Match creditors with debtors to minimize transactions
 */
function simplifyDebts(
  userNetBalances: Map<string, UserNetBalance>,
  currentUserId: string
): FriendBalance[] {
  const results: FriendBalance[] = [];
  
  // Separate creditors and debtors
  const creditors: { id: string; amount: number; name: string; avatar?: string }[] = [];
  const debtors: { id: string; amount: number; name: string; avatar?: string }[] = [];
  
  userNetBalances.forEach((balance) => {
    if (balance.netBalance > 0.01) {
      creditors.push({ 
        id: balance.id, 
        amount: balance.netBalance,
        name: balance.name,
        avatar: balance.avatar
      });
    } else if (balance.netBalance < -0.01) {
      debtors.push({ 
        id: balance.id, 
        amount: Math.abs(balance.netBalance),
        name: balance.name,
        avatar: balance.avatar
      });
    }
  });
  
  // Sort by amount (greedy algorithm - larger amounts first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  
  // Match debtors to creditors
  const transactions: { from: typeof debtors[0]; to: typeof creditors[0]; amount: number }[] = [];
  
  let i = 0; // creditor index
  let j = 0; // debtor index
  
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    
    const transferAmount = Math.min(creditor.amount, debtor.amount);
    
    if (transferAmount > 0.01) {
      transactions.push({
        from: debtor,
        to: creditor,
        amount: transferAmount
      });
    }
    
    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;
    
    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }
  
  // Filter transactions involving the current user
  for (const tx of transactions) {
    if (tx.from.id === currentUserId) {
      // Current user owes tx.to
      results.push({
        oderId: tx.to.id,
        user: {
          id: tx.to.id,
          name: tx.to.name,
          avatar: tx.to.avatar,
        },
        amount: -tx.amount, // negative = you owe them
      });
    } else if (tx.to.id === currentUserId) {
      // tx.from owes current user
      results.push({
        oderId: tx.from.id,
        user: {
          id: tx.from.id,
          name: tx.from.name,
          avatar: tx.from.avatar,
        },
        amount: tx.amount, // positive = they owe you
      });
    }
  }
  
  return results;
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

      // Get all expenses from these groups (including non-group expenses where user is involved)
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

      // Calculate net balance for each user: total_paid - total_share
      // Only consider unsettled splits
      const userNetBalances = new Map<string, UserNetBalance>();
      
      // Initialize current user
      userNetBalances.set(user.id, {
        id: user.id,
        name: 'You',
        avatar: undefined,
        netBalance: 0,
      });

      for (const expense of allExpenses.values()) {
        const splits = expense.expense_splits || [];
        const unsettledSplits = splits.filter((s: any) => s.is_settled !== true);
        
        // Add what the payer paid
        const payer = userNetBalances.get(expense.paid_by) || {
          id: expense.paid_by,
          name: '',
          avatar: undefined,
          netBalance: 0,
        };
        
        // Payer's contribution = sum of unsettled splits (what others owe)
        const totalUnsettled = unsettledSplits
          .filter((s: any) => s.user_id !== expense.paid_by)
          .reduce((sum: number, s: any) => sum + Number(s.amount), 0);
        
        payer.netBalance += totalUnsettled;
        userNetBalances.set(expense.paid_by, payer);
        
        // Subtract each person's share
        for (const split of unsettledSplits) {
          if (split.user_id !== expense.paid_by) {
            const splitUser = userNetBalances.get(split.user_id) || {
              id: split.user_id,
              name: '',
              avatar: undefined,
              netBalance: 0,
            };
            splitUser.netBalance -= Number(split.amount);
            userNetBalances.set(split.user_id, splitUser);
          }
        }
      }

      // Get profiles for all users
      const userIds = Array.from(userNetBalances.keys()).filter(id => id !== user.id);
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_display')
          .select('id, display_name, avatar_url')
          .in('id', userIds);

        if (profiles) {
          for (const profile of profiles) {
            const balance = userNetBalances.get(profile.id);
            if (balance) {
              balance.name = profile.display_name || 'Unknown';
              balance.avatar = profile.avatar_url || undefined;
            }
          }
        }
      }

      // Remove current user from the map before simplification (we'll add back via transactions)
      const currentUserBalance = userNetBalances.get(user.id);
      userNetBalances.delete(user.id);
      
      // Re-add current user for debt simplification
      if (currentUserBalance) {
        userNetBalances.set(user.id, currentUserBalance);
      }

      // Apply debt simplification algorithm
      const simplifiedBalances = simplifyDebts(userNetBalances, user.id);

      return simplifiedBalances.filter(b => Math.abs(b.amount) > 0.01);
    },
    enabled: !!user,
  });
}
