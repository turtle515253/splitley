import { useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  createExpenseFn,
  updateExpenseFn,
  deleteExpenseFn,
  settleUpFn,
  makeOfflineId,
  mutationKeys,
  type CreateExpenseVars,
  type UpdateExpenseVars,
  type DeleteExpenseVars,
  type SettleUpVars,
  type ExpenseSplit,
} from '@/lib/offlineMutations';
import type { GroupWithDetails } from '@/hooks/useGroups';
import type { Group } from '@/hooks/useGroups';
import type { FriendBalance } from '@/hooks/useBalances';
import type { Activity } from '@/hooks/useActivities';

export type { ExpenseSplit };

/**
 * All writes in this file are offline-capable:
 * - onMutate applies the change to the cached data immediately (optimistic)
 * - while offline the server call pauses and is persisted (see offlineMutations.ts)
 * - on reconnect it syncs and the queries refetch
 */

function notifyQueuedIfOffline(message: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    toast.info(message);
  }
}

/** Balance delta per friend caused by an expense: positive = they owe you more. */
function expenseBalanceDeltas(paidBy: string, splits: ExpenseSplit[], meId: string): Map<string, number> {
  const deltas = new Map<string, number>();
  if (paidBy === meId) {
    for (const split of splits) {
      if (split.userId !== meId) {
        deltas.set(split.userId, (deltas.get(split.userId) ?? 0) + split.amount);
      }
    }
  } else {
    const mySplit = splits.find((s) => s.userId === meId);
    if (mySplit) {
      deltas.set(paidBy, (deltas.get(paidBy) ?? 0) - mySplit.amount);
    }
  }
  return deltas;
}

function applyBalanceDeltas(queryClient: QueryClient, deltas: Map<string, number>) {
  queryClient.setQueryData<FriendBalance[]>(['balances'], (old) => {
    if (!old) return old;
    return old.map((fb) =>
      deltas.has(fb.user.id) ? { ...fb, amount: fb.amount + (deltas.get(fb.user.id) ?? 0) } : fb
    );
  });
}

interface CacheSnapshot {
  group?: unknown;
  groups?: unknown;
  activities?: unknown;
  balances?: unknown;
  groupSettlements?: unknown;
}

async function snapshotCaches(queryClient: QueryClient, groupId?: string | null): Promise<CacheSnapshot> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: ['groups'] }),
    queryClient.cancelQueries({ queryKey: ['activities'] }),
    queryClient.cancelQueries({ queryKey: ['balances'] }),
    groupId ? queryClient.cancelQueries({ queryKey: ['group', groupId] }) : Promise.resolve(),
  ]);
  return {
    group: groupId ? queryClient.getQueryData(['group', groupId]) : undefined,
    groups: queryClient.getQueryData(['groups']),
    activities: queryClient.getQueryData(['activities']),
    balances: queryClient.getQueryData(['balances']),
  };
}

function restoreCaches(queryClient: QueryClient, snapshot: CacheSnapshot | undefined, groupId?: string | null) {
  if (!snapshot) return;
  if (groupId && snapshot.group !== undefined) queryClient.setQueryData(['group', groupId], snapshot.group);
  if (snapshot.groups !== undefined) queryClient.setQueryData(['groups'], snapshot.groups);
  if (snapshot.activities !== undefined) queryClient.setQueryData(['activities'], snapshot.activities);
  if (snapshot.balances !== undefined) queryClient.setQueryData(['balances'], snapshot.balances);
}

async function invalidateExpenseCaches(queryClient: QueryClient, groupId?: string | null) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['groups'] }),
    queryClient.invalidateQueries({ queryKey: ['activities'] }),
    queryClient.invalidateQueries({ queryKey: ['balances'] }),
    groupId ? queryClient.invalidateQueries({ queryKey: ['group', groupId] }) : Promise.resolve(),
  ]);
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationKey: mutationKeys.createExpense,
    mutationFn: createExpenseFn,
    onMutate: async (vars: CreateExpenseVars) => {
      const snapshot = await snapshotCaches(queryClient, vars.groupId);
      const tempId = makeOfflineId();
      const nowIso = new Date().toISOString();

      // Group detail: prepend the expense
      if (vars.groupId) {
        queryClient.setQueryData<GroupWithDetails | null>(['group', vars.groupId], (old) => {
          if (!old) return old;
          const payerMember = old.members.find((m) => m.user_id === vars.paidBy);
          return {
            ...old,
            totalExpenses: old.totalExpenses + vars.amount,
            expenses: [
              {
                id: tempId,
                description: vars.description,
                amount: vars.amount,
                category: vars.category,
                created_at: nowIso,
                paid_by: vars.paidBy,
                paidByProfile: payerMember
                  ? { display_name: payerMember.display_name, avatar_url: payerMember.avatar_url }
                  : null,
                splits: vars.splits.map((s) => ({ user_id: s.userId, amount: s.amount, is_settled: false })),
              },
              ...old.expenses,
            ],
          };
        });

        queryClient.setQueryData<Group[]>(['groups'], (old) =>
          old?.map((g) => (g.id === vars.groupId ? { ...g, totalExpenses: g.totalExpenses + vars.amount } : g))
        );
      }

      // Activity feed
      if (user) {
        const isUserPayer = vars.paidBy === user.id;
        const mySplit = vars.splits.find((s) => s.userId === user.id);
        const userShare = isUserPayer
          ? vars.splits.filter((s) => s.userId !== user.id).reduce((sum, s) => sum + s.amount, 0)
          : mySplit
            ? -mySplit.amount
            : 0;
        const groups = queryClient.getQueryData<Group[]>(['groups']);
        const groupName = groups?.find((g) => g.id === vars.groupId)?.name;

        queryClient.setQueryData<Activity[]>(['activities'], (old) => {
          if (!old) return old;
          const activity: Activity = {
            id: `expense-${tempId}`,
            type: 'expense_added',
            description: `You added "${vars.description}"`,
            expenseDescription: vars.description,
            payerName: isUserPayer ? 'You' : 'Someone',
            addedByName: 'You',
            amount: vars.amount,
            userShare,
            category: vars.category || 'general',
            groupName,
            createdAt: new Date(),
            expenseId: tempId,
            groupId: vars.groupId || undefined,
          };
          return [activity, ...old];
        });

        applyBalanceDeltas(queryClient, expenseBalanceDeltas(vars.paidBy, vars.splits, user.id));
      }

      notifyQueuedIfOffline("Expense saved offline — it will sync when you're back online");
      return snapshot;
    },
    onSuccess: async (_, variables) => {
      await invalidateExpenseCaches(queryClient, variables.groupId);
      toast.success('Expense added successfully!');
    },
    onError: (error, variables, snapshot) => {
      restoreCaches(queryClient, snapshot, variables.groupId);
      console.error('Error creating expense:', error);
      toast.error('Failed to add expense');
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateExpense,
    mutationFn: updateExpenseFn,
    onMutate: async (vars: UpdateExpenseVars) => {
      const snapshot = await snapshotCaches(queryClient, vars.groupId);

      if (vars.groupId) {
        queryClient.setQueryData<GroupWithDetails | null>(['group', vars.groupId], (old) => {
          if (!old) return old;
          const previous = old.expenses.find((e) => e.id === vars.expenseId);
          const amountDelta = previous ? vars.amount - previous.amount : 0;
          const payerMember = old.members.find((m) => m.user_id === vars.paidBy);
          return {
            ...old,
            totalExpenses: old.totalExpenses + amountDelta,
            expenses: old.expenses.map((e) =>
              e.id === vars.expenseId
                ? {
                    ...e,
                    description: vars.description,
                    amount: vars.amount,
                    category: vars.category,
                    paid_by: vars.paidBy,
                    paidByProfile: payerMember
                      ? { display_name: payerMember.display_name, avatar_url: payerMember.avatar_url }
                      : e.paidByProfile,
                    splits: vars.splits.map((s) => ({ user_id: s.userId, amount: s.amount, is_settled: false })),
                  }
                : e
            ),
          };
        });
      }

      queryClient.setQueryData<Activity[]>(['activities'], (old) =>
        old?.map((a) =>
          a.expenseId === vars.expenseId
            ? { ...a, expenseDescription: vars.description, amount: vars.amount, category: vars.category || 'general' }
            : a
        )
      );

      notifyQueuedIfOffline("Changes saved offline — they will sync when you're back online");
      return snapshot;
    },
    onSuccess: async (_, variables) => {
      await invalidateExpenseCaches(queryClient, variables.groupId);
      toast.success('Expense updated successfully!');
    },
    onError: (error, variables, snapshot) => {
      restoreCaches(queryClient, snapshot, variables.groupId);
      console.error('Error updating expense:', error);
      toast.error(error instanceof Error && error.message.includes('syncing')
        ? error.message
        : 'Failed to update expense');
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationKey: mutationKeys.deleteExpense,
    mutationFn: deleteExpenseFn,
    onMutate: async (vars: DeleteExpenseVars) => {
      const snapshot = await snapshotCaches(queryClient, vars.groupId);

      if (vars.groupId) {
        queryClient.setQueryData<GroupWithDetails | null>(['group', vars.groupId], (old) => {
          if (!old) return old;
          const removed = old.expenses.find((e) => e.id === vars.expenseId);
          if (!removed) return old;

          // Reverse the expense's effect on balances using its cached splits
          if (user) {
            const deltas = expenseBalanceDeltas(
              removed.paid_by,
              removed.splits.map((s) => ({ userId: s.user_id, amount: -Number(s.amount) })),
              user.id
            );
            applyBalanceDeltas(queryClient, deltas);
          }

          return {
            ...old,
            totalExpenses: old.totalExpenses - removed.amount,
            expenses: old.expenses.filter((e) => e.id !== vars.expenseId),
          };
        });

        queryClient.setQueryData<Group[]>(['groups'], (old) => {
          const removed = (snapshot.group as GroupWithDetails | null | undefined)?.expenses.find(
            (e) => e.id === vars.expenseId
          );
          if (!removed) return old;
          return old?.map((g) =>
            g.id === vars.groupId ? { ...g, totalExpenses: g.totalExpenses - removed.amount } : g
          );
        });
      }

      queryClient.setQueryData<Activity[]>(['activities'], (old) =>
        old?.filter((a) => a.expenseId !== vars.expenseId)
      );

      notifyQueuedIfOffline("Deletion saved offline — it will sync when you're back online");
      return snapshot;
    },
    onSuccess: async (data) => {
      await invalidateExpenseCaches(queryClient, data?.groupId);
      toast.success('Expense deleted successfully!');
    },
    onError: (error, variables, snapshot) => {
      restoreCaches(queryClient, snapshot, variables.groupId);
      console.error('Error deleting expense:', error);
      toast.error(error instanceof Error && error.message.includes('syncing')
        ? error.message
        : 'Failed to delete expense');
    },
  });
}

export function useSettleUp() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationKey: mutationKeys.settleUp,
    mutationFn: settleUpFn,
    onMutate: async (vars: SettleUpVars) => {
      const snapshot = await snapshotCaches(queryClient);

      // They paid you -> they owe you less; you paid them -> you owe them less
      const delta = vars.friendOwesUser ? -vars.amount : vars.amount;
      applyBalanceDeltas(queryClient, new Map([[vars.friendId, delta]]));

      if (user) {
        queryClient.setQueryData<Activity[]>(['activities'], (old) => {
          if (!old) return old;
          const activity: Activity = {
            id: `settlement-${makeOfflineId()}`,
            type: 'payment_made',
            description: vars.friendOwesUser ? 'They paid you' : 'You paid them',
            payerName: vars.friendOwesUser ? 'Someone' : 'You',
            amount: vars.amount,
            userShare: vars.friendOwesUser ? vars.amount : -vars.amount,
            createdAt: new Date(),
          };
          return [activity, ...old];
        });
      }

      notifyQueuedIfOffline("Payment saved offline — it will sync when you're back online");
      return snapshot;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['balances'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['settlements'] }),
      ]);
      toast.success('Payment recorded!');
    },
    onError: (error, _variables, snapshot) => {
      restoreCaches(queryClient, snapshot);
      console.error('Error settling up:', error);
      toast.error('Failed to record settlement');
    },
  });
}
