import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  generateTempId,
  applyOptimisticGroupSettlement,
  rollbackOptimisticGroupSettlement,
} from '@/lib/optimisticUpdates';

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

      // Use type assertion since the table is newly created
      const { data, error } = await (supabase as any)
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

export interface GroupSettleParams {
  payerId: string;
  receiverId: string;
  amount: number;
  groupId: string;
  payerName?: string;
  receiverName?: string;
}

export function useGroupSettle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      payerId,
      receiverId,
      amount,
      groupId,
    }: GroupSettleParams) => {
      // Use type assertion since the table is newly created
      const { data, error } = await (supabase as any)
        .from('group_settlements')
        .insert({
          payer_id: payerId,
          receiver_id: receiverId,
          amount,
          group_id: groupId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      if (!user) return {};
      
      const tempId = generateTempId();
      
      // Cancel related queries
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['bootstrap', user.id] }),
        queryClient.cancelQueries({ queryKey: ['group-settlements', variables.groupId] }),
      ]);

      // Apply optimistic updates
      const { previousBootstrap, previousGroupSettlements } = applyOptimisticGroupSettlement(queryClient, {
        tempId,
        payerId: variables.payerId,
        receiverId: variables.receiverId,
        amount: variables.amount,
        groupId: variables.groupId,
        userId: user.id,
        payerName: variables.payerName || 'Someone',
        receiverName: variables.receiverName || 'Someone',
      });

      return { previousBootstrap, previousGroupSettlements, tempId };
    },
    onError: (error, variables, context) => {
      console.error('Error recording payment:', error);
      
      // Rollback on error
      if (context && user) {
        rollbackOptimisticGroupSettlement(
          queryClient,
          user.id,
          variables.groupId,
          context.previousBootstrap,
          context.previousGroupSettlements
        );
      }
      
      toast.error('Failed to record payment');
    },
    onSuccess: () => {
      toast.success('Payment recorded successfully!');
    },
    onSettled: async (_, __, variables) => {
      // Silent background refetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bootstrap'] }),
        queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] }),
        queryClient.invalidateQueries({ queryKey: ['group-settlements', variables.groupId] }),
        queryClient.invalidateQueries({ queryKey: ['balances'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
      ]);
    },
  });
}
