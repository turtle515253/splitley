import { QueryClient } from '@tanstack/react-query';
import type { BootstrapData } from '@/hooks/useBootstrapQuery';
import type { GroupWithDetails } from '@/hooks/useGroups';

/**
 * Generate a temporary client-side ID for optimistic entries.
 */
export function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if an ID is a temporary optimistic ID.
 */
export function isTempId(id: string): boolean {
  return id.startsWith('temp-');
}

interface OptimisticExpenseParams {
  tempId: string;
  description: string;
  amount: number;
  category: string | null;
  groupId: string | null;
  paidBy: string;
  paidByName: string;
  splits: { userId: string; amount: number }[];
  userId: string;
}

/**
 * Apply optimistic update for a new expense.
 * Updates bootstrap cache, group cache, and relevant balance caches.
 */
export function applyOptimisticExpense(
  queryClient: QueryClient,
  params: OptimisticExpenseParams
): {
  previousBootstrap: BootstrapData | undefined;
  previousGroup: GroupWithDetails | undefined;
} {
  const { tempId, description, amount, category, groupId, paidBy, paidByName, splits, userId } = params;
  
  // Snapshot previous states
  const previousBootstrap = queryClient.getQueryData<BootstrapData>(['bootstrap', userId]);
  const previousGroup = groupId 
    ? queryClient.getQueryData<GroupWithDetails>(['group', groupId])
    : undefined;

  // Calculate user's share of this expense
  const userSplit = splits.find(s => s.userId === userId);
  const userShare = userSplit ? userSplit.amount : 0;
  
  // Calculate balance impact:
  // If user paid: they are owed (amount - their share)
  // If someone else paid: user owes their share
  const userPaid = paidBy === userId;
  const balanceImpact = userPaid ? (amount - userShare) : -userShare;

  // Update bootstrap cache
  if (previousBootstrap) {
    queryClient.setQueryData<BootstrapData>(['bootstrap', userId], {
      ...previousBootstrap,
      // Update totals
      totals: {
        ...previousBootstrap.totals,
        you_are_owed: previousBootstrap.totals.you_are_owed + (balanceImpact > 0 ? balanceImpact : 0),
        you_owe: previousBootstrap.totals.you_owe + (balanceImpact < 0 ? Math.abs(balanceImpact) : 0),
        net_balance: previousBootstrap.totals.net_balance + balanceImpact,
      },
      // Update groups total if this is a group expense
      groups: groupId 
        ? previousBootstrap.groups.map(g => 
            g.id === groupId 
              ? { ...g, total_expenses: g.total_expenses + amount }
              : g
          )
        : previousBootstrap.groups,
      // Add to recent activity
      recent_activity: [
        {
          id: tempId,
          type: 'expense_added' as const,
          description,
          amount,
          user_share: userShare,
          category,
          group_name: groupId 
            ? previousBootstrap.groups.find(g => g.id === groupId)?.name || null
            : null,
          group_id: groupId,
          created_at: new Date().toISOString(),
        },
        ...previousBootstrap.recent_activity.slice(0, 4), // Keep last 5
      ],
    });
  }

  // Update group cache if this is a group expense
  if (groupId && previousGroup) {
    const payerMember = previousGroup.members.find(m => m.user_id === paidBy);
    
    queryClient.setQueryData<GroupWithDetails>(['group', groupId], {
      ...previousGroup,
      totalExpenses: previousGroup.totalExpenses + amount,
      expenses: [
        {
          id: tempId,
          description,
          amount,
          category,
          created_at: new Date().toISOString(),
          paid_by: paidBy,
          paidByProfile: payerMember 
            ? { display_name: payerMember.display_name, avatar_url: payerMember.avatar_url }
            : { display_name: paidByName, avatar_url: null },
          splits: splits.map(s => ({ user_id: s.userId, amount: s.amount })),
        },
        ...previousGroup.expenses,
      ],
    });
  }

  return { previousBootstrap, previousGroup };
}

/**
 * Rollback optimistic expense update.
 */
export function rollbackOptimisticExpense(
  queryClient: QueryClient,
  userId: string,
  groupId: string | null,
  previousBootstrap: BootstrapData | undefined,
  previousGroup: GroupWithDetails | undefined
): void {
  if (previousBootstrap) {
    queryClient.setQueryData(['bootstrap', userId], previousBootstrap);
  }
  if (groupId && previousGroup) {
    queryClient.setQueryData(['group', groupId], previousGroup);
  }
}

interface OptimisticSettlementParams {
  tempId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  userId: string;
  friendName: string;
}

/**
 * Apply optimistic update for a friend settlement.
 */
export function applyOptimisticSettlement(
  queryClient: QueryClient,
  params: OptimisticSettlementParams
): {
  previousBootstrap: BootstrapData | undefined;
} {
  const { tempId, payerId, receiverId, amount, userId, friendName } = params;
  
  const previousBootstrap = queryClient.getQueryData<BootstrapData>(['bootstrap', userId]);

  // Determine the balance impact
  // If user is payer: reduces what user owes (positive impact)
  // If user is receiver: reduces what user is owed (negative impact on you_are_owed)
  const userIsPayer = payerId === userId;
  
  if (previousBootstrap) {
    const friendId = userIsPayer ? receiverId : payerId;
    
    queryClient.setQueryData<BootstrapData>(['bootstrap', userId], {
      ...previousBootstrap,
      totals: {
        ...previousBootstrap.totals,
        you_owe: userIsPayer 
          ? Math.max(0, previousBootstrap.totals.you_owe - amount)
          : previousBootstrap.totals.you_owe,
        you_are_owed: !userIsPayer
          ? Math.max(0, previousBootstrap.totals.you_are_owed - amount)
          : previousBootstrap.totals.you_are_owed,
        net_balance: previousBootstrap.totals.net_balance + (userIsPayer ? amount : -amount),
      },
      // Update friend balances
      friend_balances: previousBootstrap.friend_balances.map(fb => {
        if (fb.user_id === friendId) {
          // If user is payer: they owed the friend, so reduce negative balance (add amount)
          // If user is receiver: friend owed them, so reduce positive balance (subtract amount)
          return {
            ...fb,
            amount: userIsPayer ? fb.amount + amount : fb.amount - amount,
          };
        }
        return fb;
      }),
      // Add settlement to recent activity
      recent_activity: [
        {
          id: tempId,
          type: 'payment_made' as const,
          description: userIsPayer 
            ? `You paid ${friendName}` 
            : `${friendName} paid you`,
          amount,
          user_share: null,
          category: null,
          group_name: null,
          group_id: null,
          created_at: new Date().toISOString(),
        },
        ...previousBootstrap.recent_activity.slice(0, 4),
      ],
    });
  }

  return { previousBootstrap };
}

/**
 * Rollback optimistic settlement update.
 */
export function rollbackOptimisticSettlement(
  queryClient: QueryClient,
  userId: string,
  previousBootstrap: BootstrapData | undefined
): void {
  if (previousBootstrap) {
    queryClient.setQueryData(['bootstrap', userId], previousBootstrap);
  }
}

interface OptimisticGroupSettlementParams {
  tempId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  groupId: string;
  userId: string;
  payerName: string;
  receiverName: string;
}

/**
 * Apply optimistic update for a group settlement.
 */
export function applyOptimisticGroupSettlement(
  queryClient: QueryClient,
  params: OptimisticGroupSettlementParams
): {
  previousBootstrap: BootstrapData | undefined;
  previousGroupSettlements: unknown;
} {
  const { tempId, payerId, receiverId, amount, groupId, userId, payerName, receiverName } = params;
  
  const previousBootstrap = queryClient.getQueryData<BootstrapData>(['bootstrap', userId]);
  const previousGroupSettlements = queryClient.getQueryData(['group-settlements', groupId]);

  // Update bootstrap for balance changes
  const userIsPayer = payerId === userId;
  const userIsReceiver = receiverId === userId;

  if (previousBootstrap && (userIsPayer || userIsReceiver)) {
    queryClient.setQueryData<BootstrapData>(['bootstrap', userId], {
      ...previousBootstrap,
      totals: {
        ...previousBootstrap.totals,
        you_owe: userIsPayer 
          ? Math.max(0, previousBootstrap.totals.you_owe - amount)
          : previousBootstrap.totals.you_owe,
        you_are_owed: userIsReceiver
          ? Math.max(0, previousBootstrap.totals.you_are_owed - amount)
          : previousBootstrap.totals.you_are_owed,
        net_balance: previousBootstrap.totals.net_balance + (userIsPayer ? amount : userIsReceiver ? -amount : 0),
      },
      recent_activity: [
        {
          id: tempId,
          type: 'payment_made' as const,
          description: userIsPayer 
            ? `You paid ${receiverName}` 
            : `${payerName} paid you`,
          amount,
          user_share: null,
          category: null,
          group_name: previousBootstrap.groups.find(g => g.id === groupId)?.name || null,
          group_id: groupId,
          created_at: new Date().toISOString(),
        },
        ...previousBootstrap.recent_activity.slice(0, 4),
      ],
    });
  }

  // Update group settlements cache
  if (previousGroupSettlements && Array.isArray(previousGroupSettlements)) {
    queryClient.setQueryData(['group-settlements', groupId], [
      {
        id: tempId,
        payer_id: payerId,
        receiver_id: receiverId,
        amount,
        group_id: groupId,
        created_at: new Date().toISOString(),
        payer_profile: { display_name: payerName, avatar_url: null },
        receiver_profile: { display_name: receiverName, avatar_url: null },
      },
      ...previousGroupSettlements,
    ]);
  }

  return { previousBootstrap, previousGroupSettlements };
}

/**
 * Rollback optimistic group settlement update.
 */
export function rollbackOptimisticGroupSettlement(
  queryClient: QueryClient,
  userId: string,
  groupId: string,
  previousBootstrap: BootstrapData | undefined,
  previousGroupSettlements: unknown
): void {
  if (previousBootstrap) {
    queryClient.setQueryData(['bootstrap', userId], previousBootstrap);
  }
  if (previousGroupSettlements) {
    queryClient.setQueryData(['group-settlements', groupId], previousGroupSettlements);
  }
}
