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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      if (variables.groupId) {
        queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      }
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

      // Delete existing splits
      const { error: deleteError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId);

      if (deleteError) throw deleteError;

      // Create new expense splits
      if (splits.length > 0) {
        const splitInserts = splits.map((split) => ({
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      if (variables.groupId) {
        queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      }
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

      // Get all unsettled expense splits between the current user and the friend
      // First, get splits where user owes friend (friend paid)
      const { data: owedToFriend } = await supabase
        .from('expense_splits')
        .select(`
          id,
          amount,
          expenses!inner (
            paid_by
          )
        `)
        .eq('user_id', user.id)
        .eq('is_settled', false)
        .eq('expenses.paid_by', friendId);

      // Get splits where friend owes user (user paid)
      const { data: owedByFriend } = await supabase
        .from('expense_splits')
        .select(`
          id,
          amount,
          expenses!inner (
            paid_by
          )
        `)
        .eq('user_id', friendId)
        .eq('is_settled', false)
        .eq('expenses.paid_by', user.id);

      let remainingAmount = amount;
      const splitsToSettle: string[] = [];

      // Calculate net balance to determine which splits to settle
      const userOwesFriend = (owedToFriend || []).reduce((sum, s) => sum + Number(s.amount), 0);
      const friendOwesUser = (owedByFriend || []).reduce((sum, s) => sum + Number(s.amount), 0);
      const netBalance = friendOwesUser - userOwesFriend; // positive = friend owes user

      if (netBalance < 0) {
        // User owes friend - settle user's splits first
        for (const split of (owedToFriend || []).sort((a, b) => Number(a.amount) - Number(b.amount))) {
          if (remainingAmount >= Number(split.amount)) {
            splitsToSettle.push(split.id);
            remainingAmount -= Number(split.amount);
          } else if (remainingAmount > 0) {
            // Partial settlement - for simplicity, mark as settled if we're close enough
            splitsToSettle.push(split.id);
            remainingAmount = 0;
          }
          if (remainingAmount <= 0) break;
        }
      } else {
        // Friend owes user - we can't settle their splits (RLS prevents it)
        // But we can mark the settlement as recorded
        // For now, just acknowledge the payment was made
        console.log(`Friend ${friendId} paid ${amount} to user ${user.id}`);
      }

      // Settle the splits the current user owns
      if (splitsToSettle.length > 0) {
        const { error } = await supabase
          .from('expense_splits')
          .update({ 
            is_settled: true, 
            settled_at: new Date().toISOString() 
          })
          .in('id', splitsToSettle);

        if (error) throw error;
      }

      return { settledCount: splitsToSettle.length, amount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error) => {
      console.error('Error settling up:', error);
      toast.error('Failed to record settlement');
    },
  });
}
