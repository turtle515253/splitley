import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ExpenseSplit {
  userId: string;
  amount: number;
}

interface CreateExpenseParams {
  description: string;
  amount: number;
  category: string | null;
  groupId: string | null;
  paidBy: string;
  splits: ExpenseSplit[];
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      description,
      amount,
      category,
      groupId,
      paidBy,
      splits,
    }: CreateExpenseParams) => {
      if (!user) throw new Error('Must be logged in');

      // Create the expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description,
          amount,
          category,
          group_id: groupId,
          paid_by: paidBy,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create expense splits
      if (splits.length > 0) {
        const splitInserts = splits.map((split) => ({
          expense_id: expense.id,
          user_id: split.userId,
          amount: split.amount,
        }));

        const { error: splitsError } = await supabase
          .from('expense_splits')
          .insert(splitInserts);

        if (splitsError) throw splitsError;
      }

      return expense;
    },
    onSuccess: async (_, variables) => {
      // Use Promise.all to wait for all invalidations to complete
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['balances'] }),
        variables.groupId ? queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] }) : Promise.resolve(),
      ]);
      toast.success('Expense added successfully!');
    },
    onError: (error) => {
      console.error('Error creating expense:', error);
      toast.error('Failed to add expense');
    },
  });
}

interface UpdateExpenseParams {
  expenseId: string;
  description: string;
  amount: number;
  category: string | null;
  paidBy: string;
  splits: ExpenseSplit[];
  groupId: string | null;
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expenseId,
      description,
      amount,
      category,
      paidBy,
      splits,
      groupId,
    }: UpdateExpenseParams) => {
      // Update the expense
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({
          description,
          amount,
          category,
          paid_by: paidBy,
        })
        .eq('id', expenseId);

      if (expenseError) throw expenseError;

      // Delete existing splits - use select to verify deletion happened
      const { data: existingSplits } = await supabase
        .from('expense_splits')
        .select('id')
        .eq('expense_id', expenseId);

      if (existingSplits && existingSplits.length > 0) {
        const splitIds = existingSplits.map(s => s.id);
        const { error: deleteError } = await supabase
          .from('expense_splits')
          .delete()
          .in('id', splitIds);

        if (deleteError) throw deleteError;

        // Verify deletion actually happened by checking again
        const { data: remainingSplits } = await supabase
          .from('expense_splits')
          .select('id')
          .eq('expense_id', expenseId);

        if (remainingSplits && remainingSplits.length > 0) {
          throw new Error('Failed to delete existing splits - you may not have permission');
        }
      }

      // Create new expense splits with deduplication to prevent constraint violations
      if (splits.length > 0) {
        // Deduplicate splits by userId - keep the first occurrence of each user
        const seenUserIds = new Set<string>();
        const uniqueSplits = splits.filter(split => {
          if (seenUserIds.has(split.userId)) {
            console.warn(`Duplicate split detected for user ${split.userId}, skipping`);
            return false;
          }
          seenUserIds.add(split.userId);
          return true;
        });

        const splitInserts = uniqueSplits.map((split) => ({
          expense_id: expenseId,
          user_id: split.userId,
          amount: split.amount,
        }));

        const { error: splitsError } = await supabase
          .from('expense_splits')
          .insert(splitInserts);

        if (splitsError) throw splitsError;
      }

      return { expenseId };
    },
    onSuccess: async (_, variables) => {
      // Use Promise.all to wait for all invalidations to complete
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['balances'] }),
        variables.groupId ? queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] }) : Promise.resolve(),
      ]);
      toast.success('Expense updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, groupId }: { expenseId: string; groupId?: string | null }) => {
      // Delete expense splits first (cascade should handle this but being explicit)
      const { error: splitsError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId);

      if (splitsError) throw splitsError;

      // Delete the expense
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      
      return { groupId };
    },
    onSuccess: async (data) => {
      // Use Promise.all to wait for all invalidations to complete
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['balances'] }),
        data?.groupId ? queryClient.invalidateQueries({ queryKey: ['group', data.groupId] }) : Promise.resolve(),
      ]);
      toast.success('Expense deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    },
  });
}

export function useSettleUp() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ friendId, amount }: { friendId: string; amount: number }) => {
      if (!user) throw new Error('Must be logged in');

      console.log('[SettleUp] Starting settlement:', { friendId, amount, userId: user.id });

      // Get all unsettled expense splits between the current user and the friend
      // First, get splits where user owes friend (friend paid)
      const { data: owedToFriend, error: owedToFriendError } = await supabase
        .from('expense_splits')
        .select(`
          id,
          amount,
          expense_id,
          expenses!fk_expense_splits_expense_id (
            paid_by
          )
        `)
        .eq('user_id', user.id)
        .eq('is_settled', false);

      // Filter to only include splits where friend paid
      const filteredOwedToFriend = (owedToFriend || []).filter(
        (split: any) => split.expenses?.paid_by === friendId
      );

      console.log('[SettleUp] Splits user owes friend:', filteredOwedToFriend, owedToFriendError);

      // Get splits where friend owes user (user paid) - current user CAN settle these now
      const { data: owedByFriend, error: owedByFriendError } = await supabase
        .from('expense_splits')
        .select(`
          id,
          amount,
          expense_id,
          expenses!fk_expense_splits_expense_id (
            paid_by
          )
        `)
        .eq('user_id', friendId)
        .eq('is_settled', false);

      // Filter to only include splits where user paid
      const filteredOwedByFriend = (owedByFriend || []).filter(
        (split: any) => split.expenses?.paid_by === user.id
      );

      console.log('[SettleUp] Splits friend owes user:', filteredOwedByFriend, owedByFriendError);

      let remainingAmount = amount;
      const splitsToSettle: string[] = [];

      // Calculate net balance to determine which splits to settle
      const userOwesFriend = filteredOwedToFriend.reduce((sum, s) => sum + Number(s.amount), 0);
      const friendOwesUser = filteredOwedByFriend.reduce((sum, s) => sum + Number(s.amount), 0);
      const netBalance = friendOwesUser - userOwesFriend; // positive = friend owes user

      console.log('[SettleUp] Net balance calculation:', { userOwesFriend, friendOwesUser, netBalance });

      if (netBalance < 0) {
        // User owes friend - settle user's splits first
        for (const split of filteredOwedToFriend.sort((a, b) => Number(a.amount) - Number(b.amount))) {
          if (remainingAmount >= Number(split.amount)) {
            splitsToSettle.push(split.id);
            remainingAmount -= Number(split.amount);
          } else if (remainingAmount > 0) {
            splitsToSettle.push(split.id);
            remainingAmount = 0;
          }
          if (remainingAmount <= 0) break;
        }
      } else {
        // Friend owes user - settle their splits (user is the payer, so RLS allows it now)
        for (const split of filteredOwedByFriend.sort((a, b) => Number(a.amount) - Number(b.amount))) {
          if (remainingAmount >= Number(split.amount)) {
            splitsToSettle.push(split.id);
            remainingAmount -= Number(split.amount);
          } else if (remainingAmount > 0) {
            splitsToSettle.push(split.id);
            remainingAmount = 0;
          }
          if (remainingAmount <= 0) break;
        }
      }

      console.log('[SettleUp] Splits to settle:', splitsToSettle);

      // Settle the splits
      if (splitsToSettle.length > 0) {
        const { data: updateResult, error } = await supabase
          .from('expense_splits')
          .update({ 
            is_settled: true, 
            settled_at: new Date().toISOString() 
          })
          .in('id', splitsToSettle)
          .select();

        console.log('[SettleUp] Update result:', updateResult, error);

        if (error) throw error;
      } else {
        console.log('[SettleUp] No splits found to settle!');
      }

      return { settledCount: splitsToSettle.length, amount };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['balances'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
      ]);
    },
    onError: (error) => {
      console.error('Error settling up:', error);
      toast.error('Failed to record settlement');
    },
  });
}
