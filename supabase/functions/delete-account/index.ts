import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// Allowed origins for CORS - restrict to known domains
const allowedOrigins = [
  'https://zlmmflrlkvzvcaxuokhx.lovableproject.com',
  'https://id-preview--zlmmflrlkvzvcaxuokhx.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  // Check if origin matches allowed list or is a preview subdomain
  const isAllowed = allowedOrigins.includes(origin) || 
    origin.match(/^https:\/\/[a-z0-9-]+--zlmmflrlkvzvcaxuokhx\.lovableproject\.com$/);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Rate limit: 1 request per hour for account deletion
const RATE_LIMIT_MAX_REQUESTS = 1;
const RATE_LIMIT_WINDOW_SECONDS = 3600; // 1 hour

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT is automatically verified by Supabase - get the auth header to extract user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header present");
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token to get their ID
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user (JWT already verified by Supabase)
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check rate limit
    const { data: rateLimitAllowed, error: rateLimitError } = await supabaseAdmin.rpc(
      'check_rate_limit',
      {
        _user_id: user.id,
        _action: 'delete-account',
        _max_requests: RATE_LIMIT_MAX_REQUESTS,
        _window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      }
    );

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      // Continue without rate limiting if there's an error
    } else if (!rateLimitAllowed) {
      console.log(`Rate limit exceeded for user ${user.id} on delete-account`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting account for user ${user.id}`);

    // Delete user's data first (cascade should handle most, but being explicit)
    // Delete expense splits where user is involved
    await supabaseAdmin.from('expense_splits').delete().eq('user_id', user.id);
    
    // Delete expenses created by user
    await supabaseAdmin.from('expenses').delete().eq('paid_by', user.id);
    
    // Delete group memberships
    await supabaseAdmin.from('group_members').delete().eq('user_id', user.id);
    
    // Delete groups created by user
    await supabaseAdmin.from('groups').delete().eq('created_by', user.id);
    
    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', user.id);

    // Delete rate limit records for this user
    await supabaseAdmin.from('rate_limits').delete().eq('user_id', user.id);

    // Finally, delete the user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted account for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
