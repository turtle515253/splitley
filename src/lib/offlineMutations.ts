import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Offline-first write support.
 *
 * Mutation functions live here at module level (not inside hooks) so React
 * Query can re-attach them to mutations restored from IndexedDB via
 * setMutationDefaults. That is what lets a write made offline survive an app
 * restart and sync once the network returns:
 *
 *  - While offline, mutations pause (networkMode 'online') after their
 *    optimistic onMutate runs, so the UI updates instantly.
 *  - Paused mutations are persisted by PersistQueryClientProvider
 *    (shouldDehydrateMutation in App.tsx).
 *  - On reconnect React Query resumes them automatically; after a cold start
 *    resumePausedMutations() (App.tsx) replays them using the defaults
 *    registered below.
 *
 * Functions must not close over hook state - everything they need comes from
 * their (serializable) variables or from the supabase client at run time.
 */

export interface ExpenseSplit {
  userId: string;
  amount: number;
}

export interface CreateExpenseVars {
  description: string;
  amount: number;
  category: string | null;
  groupId: string | null;
  paidBy: string;
  splits: ExpenseSplit[];
}

export interface UpdateExpenseVars {
  expenseId: string;
  description: string;
  amount: number;
  category: string | null;
  paidBy: string;
  splits: ExpenseSplit[];
  groupId: string | null;
}

export interface DeleteExpenseVars {
  expenseId: string;
  groupId?: string | null;
}

export interface SettleUpVars {
  friendId: string;
  amount: number;
  friendOwesUser: boolean;
}

export interface GroupSettleVars {
  payerId: string;
  receiverId: string;
  amount: number;
  groupId: string;
}

/** Prefix for optimistic ids of rows that haven't reached the server yet. */
export const OFFLINE_ID_PREFIX = 'offline-';

export function isOfflineId(id: string | null | undefined): boolean {
  return !!id && id.startsWith(OFFLINE_ID_PREFIX);
}

export function makeOfflineId(): string {
  return `${OFFLINE_ID_PREFIX}${crypto.randomUUID()}`;
}

async function requireUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Must be logged in');
  return session.user.id;
}

/** Fire-and-forget push notification to affected users; failures are logged only. */
function notifyPush(body: { type: 'expense' | 'settlement' | 'group_settlement'; expenseId?: string; settlementId?: string }) {
  void supabase.functions.invoke('notify-push', { body }).catch((error) => {
    console.warn('notify-push failed:', error);
  });
}

export async function createExpenseFn(vars: CreateExpenseVars) {
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      description: vars.description,
      amount: vars.amount,
      category: vars.category,
      group_id: vars.groupId,
      paid_by: vars.paidBy,
    })
    .select()
    .single();

  if (expenseError) throw expenseError;

  if (vars.splits.length > 0) {
    const splitInserts = vars.splits.map((split) => ({
      expense_id: expense.id,
      user_id: split.userId,
      amount: split.amount,
    }));

    const { error: splitsError } = await supabase.from('expense_splits').insert(splitInserts);
    if (splitsError) throw splitsError;
  }

  notifyPush({ type: 'expense', expenseId: expense.id });
  return expense;
}

export async function updateExpenseFn(vars: UpdateExpenseVars) {
  const { expenseId, description, amount, category, paidBy, splits } = vars;
  if (isOfflineId(expenseId)) {
    throw new Error('This expense is still syncing. Please try again after it syncs.');
  }

  const { error: expenseError } = await supabase
    .from('expenses')
    .update({ description, amount, category, paid_by: paidBy })
    .eq('id', expenseId);

  if (expenseError) throw expenseError;

  // Delete existing splits - use select to verify deletion happened
  const { data: existingSplits } = await supabase
    .from('expense_splits')
    .select('id')
    .eq('expense_id', expenseId);

  if (existingSplits && existingSplits.length > 0) {
    const splitIds = existingSplits.map((s) => s.id);
    const { error: deleteError } = await supabase.from('expense_splits').delete().in('id', splitIds);
    if (deleteError) throw deleteError;

    const { data: remainingSplits } = await supabase
      .from('expense_splits')
      .select('id')
      .eq('expense_id', expenseId);

    if (remainingSplits && remainingSplits.length > 0) {
      throw new Error('Failed to delete existing splits - you may not have permission');
    }
  }

  if (splits.length > 0) {
    // Deduplicate splits by userId to prevent constraint violations
    const seenUserIds = new Set<string>();
    const uniqueSplits = splits.filter((split) => {
      if (seenUserIds.has(split.userId)) return false;
      seenUserIds.add(split.userId);
      return true;
    });

    const splitInserts = uniqueSplits.map((split) => ({
      expense_id: expenseId,
      user_id: split.userId,
      amount: split.amount,
    }));

    const { error: splitsError } = await supabase.from('expense_splits').insert(splitInserts);
    if (splitsError) throw splitsError;
  }

  return { expenseId };
}

export async function deleteExpenseFn(vars: DeleteExpenseVars) {
  const { expenseId, groupId } = vars;
  if (isOfflineId(expenseId)) {
    throw new Error('This expense is still syncing. Please try again after it syncs.');
  }

  const { error: splitsError } = await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
  if (splitsError) throw splitsError;

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;

  return { groupId };
}

export async function settleUpFn(vars: SettleUpVars) {
  const userId = await requireUserId();
  const { friendId, amount, friendOwesUser } = vars;

  const { data: settlement, error } = await supabase
    .from('settlements')
    .insert({
      payer_id: friendOwesUser ? friendId : userId,
      receiver_id: friendOwesUser ? userId : friendId,
      amount,
    })
    .select()
    .single();

  if (error) throw error;
  notifyPush({ type: 'settlement', settlementId: settlement.id });
  return { settlementId: settlement.id, amount };
}

export async function groupSettleFn(vars: GroupSettleVars) {
  const { data, error } = await supabase
    .from('group_settlements')
    .insert({
      payer_id: vars.payerId,
      receiver_id: vars.receiverId,
      amount: vars.amount,
      group_id: vars.groupId,
    })
    .select()
    .single();

  if (error) throw error;
  notifyPush({ type: 'group_settlement', settlementId: data.id });
  return data;
}

export const mutationKeys = {
  createExpense: ['expenses', 'create'] as const,
  updateExpense: ['expenses', 'update'] as const,
  deleteExpense: ['expenses', 'delete'] as const,
  settleUp: ['settlements', 'settle-up'] as const,
  groupSettle: ['group-settlements', 'settle'] as const,
};

/**
 * Registers mutationFns for every offline-capable write so that paused
 * mutations restored from the persisted cache can resume. Call once right
 * after creating the QueryClient.
 */
export function registerOfflineMutationDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults(mutationKeys.createExpense, { mutationFn: createExpenseFn, retry: 2 });
  queryClient.setMutationDefaults(mutationKeys.updateExpense, { mutationFn: updateExpenseFn, retry: 2 });
  queryClient.setMutationDefaults(mutationKeys.deleteExpense, { mutationFn: deleteExpenseFn, retry: 2 });
  queryClient.setMutationDefaults(mutationKeys.settleUp, { mutationFn: settleUpFn, retry: 2 });
  queryClient.setMutationDefaults(mutationKeys.groupSettle, { mutationFn: groupSettleFn, retry: 2 });
}
