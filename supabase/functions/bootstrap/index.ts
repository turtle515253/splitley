import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BootstrapResponse {
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    currency: string;
  };
  groups: Array<{
    id: string;
    name: string;
    emoji: string | null;
    member_count: number;
    total_expenses: number;
  }>;
  friend_balances: Array<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    amount: number; // positive = they owe you, negative = you owe them
  }>;
  totals: {
    you_are_owed: number;
    you_owe: number;
    net_balance: number;
  };
  recent_activity: Array<{
    id: string;
    type: 'expense_added' | 'payment_made' | 'group_created';
    description: string;
    amount: number | null;
    user_share: number | null;
    category: string | null;
    group_name: string | null;
    group_id: string | null;
    created_at: string;
  }>;
  unread_count: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[bootstrap] Fetching data for user:', user.id);

    // Parallel fetch all data needed for home screen
    const [
      profileResult,
      groupMembersResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url, currency')
        .eq('id', user.id)
        .single(),
      supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id),
    ]);

    const profile = profileResult.data;
    const userGroupIds = groupMembersResult.data?.map(g => g.group_id) || [];

    console.log('[bootstrap] User has', userGroupIds.length, 'groups');

    // Prepare empty response structure
    const response: BootstrapResponse = {
      profile: {
        id: user.id,
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
        currency: profile?.currency || 'USD',
      },
      groups: [],
      friend_balances: [],
      totals: { you_are_owed: 0, you_owe: 0, net_balance: 0 },
      recent_activity: [],
      unread_count: 0,
    };

    if (userGroupIds.length === 0) {
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch groups, expenses, settlements in parallel
    const [
      groupsResult,
      expensesResult,
      groupSettlementsResult,
      settlementsResult,
      recentExpensesResult,
    ] = await Promise.all([
      // Groups with member counts
      supabase
        .from('groups')
        .select('id, name, emoji')
        .in('id', userGroupIds),
      // All expenses for user's groups (for balance calculation)
      supabase
        .from('expenses')
        .select(`
          id, amount, paid_by, group_id,
          expense_splits!fk_expense_splits_expense_id (user_id, amount, is_settled)
        `)
        .in('group_id', userGroupIds),
      // Group settlements
      supabase
        .from('group_settlements')
        .select('payer_id, receiver_id, amount, group_id')
        .in('group_id', userGroupIds),
      // Regular settlements
      supabase
        .from('settlements')
        .select('payer_id, receiver_id, amount'),
      // Recent expenses for activity (limited)
      supabase
        .from('expenses')
        .select(`
          id, description, amount, category, created_at, paid_by, group_id,
          groups!fk_expenses_group_id (name),
          expense_splits!fk_expense_splits_expense_id (user_id, amount)
        `)
        .in('group_id', userGroupIds)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const groups = groupsResult.data || [];
    const expenses = expensesResult.data || [];
    const groupSettlements = groupSettlementsResult.data || [];
    const settlements = settlementsResult.data || [];
    const recentExpenses = recentExpensesResult.data || [];

    // Get all group members for profile info
    const { data: allMembers } = await supabase
      .from('group_members')
      .select(`
        group_id, user_id,
        profiles:profiles_display!fk_group_members_user_id (display_name, avatar_url)
      `)
      .in('group_id', userGroupIds);

    const members = allMembers || [];

    // Build member profile map
    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    for (const m of members) {
      const profile = (m as any).profiles;
      if (profile && !profileMap.has(m.user_id)) {
        profileMap.set(m.user_id, {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        });
      }
    }

    // Count members per group
    const groupMemberCounts = new Map<string, number>();
    for (const m of members) {
      groupMemberCounts.set(m.group_id, (groupMemberCounts.get(m.group_id) || 0) + 1);
    }

    // Calculate total expenses per group
    const groupExpenseTotals = new Map<string, number>();
    for (const e of expenses) {
      if (e.group_id) {
        groupExpenseTotals.set(e.group_id, (groupExpenseTotals.get(e.group_id) || 0) + Number(e.amount));
      }
    }

    // Build groups response
    response.groups = groups.map(g => ({
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      member_count: groupMemberCounts.get(g.id) || 0,
      total_expenses: groupExpenseTotals.get(g.id) || 0,
    }));

    // Calculate friend balances using simplified debt algorithm
    const userDebts = new Map<string, number>();

    for (const expense of expenses) {
      const splits = (expense as any).expense_splits || [];
      const payerId = expense.paid_by;
      const amount = Number(expense.amount);

      for (const split of splits) {
        if (split.is_settled) continue;
        const splitAmount = Number(split.amount);
        const splitUserId = split.user_id;

        if (payerId === user.id && splitUserId !== user.id) {
          // User paid, someone else owes
          userDebts.set(splitUserId, (userDebts.get(splitUserId) || 0) + splitAmount);
        } else if (payerId !== user.id && splitUserId === user.id) {
          // Someone else paid, user owes
          userDebts.set(payerId, (userDebts.get(payerId) || 0) - splitAmount);
        }
      }
    }

    // Apply group settlements
    for (const s of groupSettlements) {
      if (s.payer_id === user.id) {
        // User paid receiver
        userDebts.set(s.receiver_id, (userDebts.get(s.receiver_id) || 0) + Number(s.amount));
      } else if (s.receiver_id === user.id) {
        // Someone paid user
        userDebts.set(s.payer_id, (userDebts.get(s.payer_id) || 0) - Number(s.amount));
      }
    }

    // Apply regular settlements
    for (const s of settlements) {
      if (s.payer_id === user.id) {
        userDebts.set(s.receiver_id, (userDebts.get(s.receiver_id) || 0) + Number(s.amount));
      } else if (s.receiver_id === user.id) {
        userDebts.set(s.payer_id, (userDebts.get(s.payer_id) || 0) - Number(s.amount));
      }
    }

    // Build friend balances
    let youAreOwed = 0;
    let youOwe = 0;

    for (const [friendId, amount] of userDebts) {
      if (Math.abs(amount) < 1) continue; // Skip negligible amounts
      
      const friendProfile = profileMap.get(friendId);
      response.friend_balances.push({
        user_id: friendId,
        display_name: friendProfile?.display_name || 'Unknown',
        avatar_url: friendProfile?.avatar_url || null,
        amount: amount,
      });

      if (amount > 0) {
        youAreOwed += amount;
      } else {
        youOwe += Math.abs(amount);
      }
    }

    // Sort by absolute amount descending
    response.friend_balances.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    response.totals = {
      you_are_owed: youAreOwed,
      you_owe: youOwe,
      net_balance: youAreOwed - youOwe,
    };

    // Build recent activity (limited to 5)
    for (const expense of recentExpenses) {
      const splits = (expense as any).expense_splits || [];
      const userSplit = splits.find((s: any) => s.user_id === user.id);
      const isUserPayer = expense.paid_by === user.id;

      let userShare = 0;
      if (isUserPayer) {
        userShare = splits
          .filter((s: any) => s.user_id !== user.id)
          .reduce((sum: number, s: any) => sum + Number(s.amount), 0);
      } else if (userSplit) {
        userShare = -Number(userSplit.amount);
      }

      const payerProfile = profileMap.get(expense.paid_by);
      const payerName = expense.paid_by === user.id ? 'You' : (payerProfile?.display_name || 'Someone');

      response.recent_activity.push({
        id: expense.id,
        type: 'expense_added',
        description: `${payerName} added "${expense.description}"`,
        amount: Number(expense.amount),
        user_share: userShare,
        category: expense.category,
        group_name: (expense as any).groups?.name || null,
        group_id: expense.group_id,
        created_at: expense.created_at,
      });
    }

    console.log('[bootstrap] Response ready with', response.friend_balances.length, 'balances,', response.groups.length, 'groups');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[bootstrap] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
