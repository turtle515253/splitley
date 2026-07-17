import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { groupSettleFn, makeOfflineId, mutationKeys, type GroupSettleVars } from '@/lib/offlineMutations';
import type { GroupWithDetails } from '@/hooks/useGroups';
import type { FriendBalance } from '@/hooks/useBalances';

export interface GroupSettlement {
  id: string;
  payer_id: string;
  receiver_id: string;
  amount: number;
  group_id: string;
  note?: string;
  created_at: string;
  payer_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  receiver_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface GroupSettlementRow {
  id: string;
  payer_id: string;
  receiver_id: string;
  amount: number;
  group_id: string;
  note: string | null;
  created_at: string;
}

export function useGroupSettlements(groupId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group-settlements', groupId],
    queryFn: async (): Promise<GroupSettlement[]> => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('group_settlements')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as GroupSettlementRow[];

      // Fetch profiles for payers and receivers
      const settlements = await Promise.all(
        rows.map(async (settlement) => {
          const [payerProfile, receiverProfile] = await Promise.all([
            supabase
              .from('profiles_display')
              .select('display_name, avatar_url')
              .eq('id', settlement.payer_id)
              .maybeSingle(),
            supabase
              .from('profiles_display')
              .select('display_name, avatar_url')
              .eq('id', settlement.receiver_id)
              .maybeSingle(),
          ]);

          return {
            ...settlement,
            payer_profile: payerProfile.data,
            receiver_profile: receiverProfile.data,
          };
        })
      );

      return settlements;
    },
    enabled: !!groupId && !!user,
  });
}

export function useGroupSettle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationKey: mutationKeys.groupSettle,
    mutationFn: groupSettleFn,
    onMutate: async (vars: GroupSettleVars) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['group-settlements', vars.groupId] }),
        queryClient.cancelQueries({ queryKey: ['group-debts', vars.groupId] }),
        queryClient.cancelQueries({ queryKey: ['balances'] }),
      ]);

      const snapshot = {
        settlements: queryClient.getQueryData(['group-settlements', vars.groupId]),
        balances: queryClient.getQueryData(['balances']),
      };

      // Prepend to the group's settlement history, using cached member profiles
      const group = queryClient.getQueryData<GroupWithDetails | null>(['group', vars.groupId]);
      const profileOf = (id: string) => {
        const member = group?.members.find((m) => m.user_id === id);
        return member ? { display_name: member.display_name, avatar_url: member.avatar_url } : undefined;
      };
      queryClient.setQueryData<GroupSettlement[]>(['group-settlements', vars.groupId], (old) => {
        if (!old) return old;
        const settlement: GroupSettlement = {
          id: makeOfflineId(),
          payer_id: vars.payerId,
          receiver_id: vars.receiverId,
          amount: vars.amount,
          group_id: vars.groupId,
          created_at: new Date().toISOString(),
          payer_profile: profileOf(vars.payerId),
          receiver_profile: profileOf(vars.receiverId),
        };
        return [settlement, ...old];
      });

      // Overall balances: you paid a friend -> you owe them less; friend paid you -> they owe you less
      if (user) {
        const friendId = vars.payerId === user.id ? vars.receiverId : vars.payerId;
        const delta = vars.payerId === user.id ? vars.amount : -vars.amount;
        if (vars.payerId === user.id || vars.receiverId === user.id) {
          queryClient.setQueryData<FriendBalance[]>(['balances'], (old) =>
            old?.map((fb) => (fb.user.id === friendId ? { ...fb, amount: fb.amount + delta } : fb))
          );
        }
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast.info("Payment saved offline — it will sync when you're back online");
      }
      return snapshot;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-settlements', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-debts', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Payment recorded successfully!');
    },
    onError: (error, variables, snapshot) => {
      if (snapshot) {
        if (snapshot.settlements !== undefined) {
          queryClient.setQueryData(['group-settlements', variables.groupId], snapshot.settlements);
        }
        if (snapshot.balances !== undefined) {
          queryClient.setQueryData(['balances'], snapshot.balances);
        }
      }
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    },
  });
}
