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

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      toast.success('Expense deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    },
  });
}
