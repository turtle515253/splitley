import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Settlement {
  id: string;
  payerId: string;
  payerName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  createdAt: Date;
}

export function useSettlements(friendId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['settlements', user?.id, friendId],
    queryFn: async (): Promise<Settlement[]> => {
      if (!user) return [];

      let query = supabase
        .from('settlements')
        .select(`
          id,
          payer_id,
          receiver_id,
          amount,
          created_at,
          payer:payer_id (display_name),
          receiver:receiver_id (display_name)
        `)
        .or(`payer_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // If friendId is provided, filter to only settlements with that friend
      if (friendId) {
        query = supabase
          .from('settlements')
          .select(`
            id,
            payer_id,
            receiver_id,
            amount,
            created_at,
            payer:payer_id (display_name),
            receiver:receiver_id (display_name)
          `)
          .or(`and(payer_id.eq.${user.id},receiver_id.eq.${friendId}),and(payer_id.eq.${friendId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching settlements:', error);
        return [];
      }

      return (data || []).map((s: any) => ({
        id: s.id,
        payerId: s.payer_id,
        payerName: s.payer_id === user.id ? 'You' : s.payer?.display_name || 'Unknown',
        receiverId: s.receiver_id,
        receiverName: s.receiver_id === user.id ? 'you' : s.receiver?.display_name || 'Unknown',
        amount: Number(s.amount),
        createdAt: new Date(s.created_at),
      }));
    },
    enabled: !!user,
  });
}