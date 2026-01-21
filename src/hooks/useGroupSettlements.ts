import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

export function useGroupSettle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payerId,
      receiverId,
      amount,
      groupId,
    }: {
      payerId: string;
      receiverId: string;
      amount: number;
      groupId: string;
    }) => {
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-settlements', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Payment recorded successfully!');
    },
    onError: (error) => {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    },
  });
}
