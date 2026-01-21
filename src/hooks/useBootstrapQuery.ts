import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BootstrapProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  currency: string;
}

export interface BootstrapGroup {
  id: string;
  name: string;
  emoji: string | null;
  member_count: number;
  total_expenses: number;
}

export interface BootstrapFriendBalance {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  amount: number; // positive = they owe you, negative = you owe them
}

export interface BootstrapActivity {
  id: string;
  type: 'expense_added' | 'payment_made' | 'group_created';
  description: string;
  amount: number | null;
  user_share: number | null;
  category: string | null;
  group_name: string | null;
  group_id: string | null;
  created_at: string;
}

export interface BootstrapData {
  profile: BootstrapProfile;
  groups: BootstrapGroup[];
  friend_balances: BootstrapFriendBalance[];
  totals: {
    you_are_owed: number;
    you_owe: number;
    net_balance: number;
  };
  recent_activity: BootstrapActivity[];
  unread_count: number;
}

async function fetchBootstrap(): Promise<BootstrapData> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  
  if (!session) {
    throw new Error('No session');
  }

  const { data, error } = await supabase.functions.invoke('bootstrap', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    console.error('[fetchBootstrap] Error:', error);
    throw error;
  }

  return data as BootstrapData;
}

/**
 * Bootstrap query hook for Home screen first paint.
 * 
 * Priority 1 query - renders instantly from cache if available.
 * Uses 60s staleTime to minimize network requests while staying fresh.
 * Never blocks UI rendering.
 */
export function useBootstrapQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bootstrap', user?.id],
    queryFn: fetchBootstrap,
    // Use cached data immediately while refetching
    placeholderData: (previousData) => previousData,
    // Keep data fresh for 60 seconds
    staleTime: 1000 * 60,
    // Never garbage collect bootstrap data
    gcTime: Infinity,
    // Only run when user is authenticated
    enabled: !!user,
    // Don't retry on failure - fallback gracefully
    retry: 1,
    retryDelay: 1000,
  });
}
