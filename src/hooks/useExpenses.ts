import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  generateTempId,
  applyOptimisticExpense,
  rollbackOptimisticExpense,
  applyOptimisticSettlement,
  rollbackOptimisticSettlement,
} from '@/lib/optimisticUpdates';

interface ExpenseSplit {
  userId: string;
  amount: number;
}

export interface CreateExpenseParams {
  description: string;
  amount: number;
  category: string | null;
  groupId: string | null;
  paidBy: string;
  paidByName?: string;
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
    onMutate: async (variables) => {
      if (!user) return {};
      
      const tempId = generateTempId();
      
      // Cancel related queries to prevent overwrite
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['bootstrap', user.id] }),
        variables.groupId ? queryClient.cancelQueries({ queryKey: ['group', variables.groupId] }) : Promise.resolve(),
      ]);

      // Apply optimistic updates
      const { previousBootstrap, previousGroup } = applyOptimisticExpense(queryClient, {
        tempId,
        description: variables.description,
        amount: variables.amount,
        category: variables.category,
        groupId: variables.groupId,
        paidBy: variables.paidBy,
        paidByName: variables.paidByName || 'You',
        splits: variables.splits,
        userId: user.id,
      });

      return { previousBootstrap, previousGroup, tempId };
    },
    onError: (error, variables, context) => {
      console.error('Error creating expense:', error);
      
      // Rollback on error
      if (context && user) {
        rollbackOptimisticExpense(
          queryClient,
          user.id,
          variables.groupId,
          context.previousBootstrap,
          context.previousGroup
        );
      }
      
      toast.error('Failed to add expense');
    },
    onSuccess: () => {
      toast.success('Expense added successfully!');
    },
    onSettled: async (_, __, variables) => {
      // Silent background refetch to reconcile with server
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bootstrap'] }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['balances'] }),
        variables.groupId ? queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] }) : Promise.resolve(),
      ]);
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

export interface SettleUpParams {
  friendId: string;
  amount: number;
  friendOwesUser: boolean;
  friendName?: string;
}

export function useSettleUp() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ friendId, amount, friendOwesUser }: SettleUpParams) => {
      if (!user) throw new Error('Must be logged in');

      console.log('[SettleUp] Starting settlement:', { friendId, amount, friendOwesUser, userId: user.id });

      // Insert a settlement record - the exact amount being settled
      // If friendOwesUser is true, friend is paying user (user is receiver)
      // If false, user is paying friend (friend is receiver, but we record from user's perspective)
      const { data: settlement, error } = await supabase
        .from('settlements')
        .insert({
          payer_id: friendOwesUser ? friendId : user.id,
          receiver_id: friendOwesUser ? user.id : friendId,
          amount: amount,
        })
        .select()
        .single();

      if (error) {
        console.error('[SettleUp] Error inserting settlement:', error);
        throw error;
      }

      console.log('[SettleUp] Settlement recorded:', settlement);

      return { settlementId: settlement.id, amount };
    },
    onMutate: async (variables) => {
      if (!user) return {};
      
      const tempId = generateTempId();
      const payerId = variables.friendOwesUser ? variables.friendId : user.id;
      const receiverId = variables.friendOwesUser ? user.id : variables.friendId;
      
      // Cancel related queries
      await queryClient.cancelQueries({ queryKey: ['bootstrap', user.id] });

      // Apply optimistic updates
      const { previousBootstrap } = applyOptimisticSettlement(queryClient, {
        tempId,
        payerId,
        receiverId,
        amount: variables.amount,
        userId: user.id,
        friendName: variables.friendName || 'Friend',
      });

      return { previousBootstrap, tempId };
    },
    onError: (error, _, context) => {
      console.error('Error settling up:', error);
      
      // Rollback on error
      if (context && user) {
        rollbackOptimisticSettlement(queryClient, user.id, context.previousBootstrap);
      }
      
      toast.error('Failed to record settlement');
    },
    onSuccess: () => {
      toast.success('Payment recorded!');
    },
    onSettled: async () => {
      // Silent background refetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bootstrap'] }),
        queryClient.invalidateQueries({ queryKey: ['balances'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['settlements'] }),
      ]);
    },
  });
}
