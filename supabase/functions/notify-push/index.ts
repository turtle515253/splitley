import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// CORS headers - allow all origins since auth is handled separately
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyRequest {
  type: 'expense' | 'settlement' | 'group_settlement';
  expenseId?: string;
  settlementId?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// ---- FCM HTTP v1 auth ----------------------------------------------------

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri: string;
}

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getFcmAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64UrlEncode(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;

  // Import the PEM private key (PKCS8)
  const pem = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const keyBytes = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)),
  );
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const response = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!response.ok) {
    throw new Error(`FCM token exchange failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data.access_token;
}

// ---- Sending -------------------------------------------------------------

async function sendToTokens(options: {
  sa: ServiceAccount;
  accessToken: string;
  tokens: string[];
  title: string;
  body: string;
  data: Record<string, string>;
}): Promise<{ sent: number; invalidTokens: string[] }> {
  let sent = 0;
  const invalidTokens: string[] = [];

  await Promise.all(options.tokens.map(async (token) => {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${options.sa.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: options.title, body: options.body },
            data: options.data,
            android: { priority: 'high' },
          },
        }),
      },
    );
    if (response.ok) {
      sent++;
    } else {
      const text = await response.text();
      console.error(`FCM send failed (${response.status}): ${text}`);
      if (text.includes('UNREGISTERED') || text.includes('INVALID_ARGUMENT')) {
        invalidTokens.push(token);
      }
    }
  }));

  return { sent, invalidTokens };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization required" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Invalid authentication" }, 401);

    const saRaw = Deno.env.get("FCM_SERVICE_ACCOUNT");
    if (!saRaw) {
      console.error("FCM_SERVICE_ACCOUNT not configured; skipping push");
      return jsonResponse({ success: false, skipped: "not configured" });
    }
    const sa: ServiceAccount = JSON.parse(saRaw);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { type, expenseId, settlementId }: NotifyRequest = await req.json();

    // Server composes the message from the database rows, so callers can't
    // spoof content; the caller is always excluded from the recipients.
    let recipientIds: string[] = [];
    let title = '';
    let body = '';
    let data: Record<string, string> = {};

    const { data: actorProfile } = await supabaseAdmin
      .from('profiles').select('display_name').eq('id', user.id).maybeSingle();
    const actorName = actorProfile?.display_name || 'Someone';

    if (type === 'expense' && expenseId) {
      const { data: expense } = await supabaseAdmin
        .from('expenses')
        .select('id, description, amount, group_id, paid_by')
        .eq('id', expenseId)
        .maybeSingle();
      if (!expense) return jsonResponse({ error: 'Expense not found' }, 404);

      let groupName = '';
      if (expense.group_id) {
        const { data: group } = await supabaseAdmin
          .from('groups').select('name').eq('id', expense.group_id).maybeSingle();
        groupName = group?.name || '';
        const { data: members } = await supabaseAdmin
          .from('group_members').select('user_id').eq('group_id', expense.group_id);
        recipientIds = (members || []).map((m) => m.user_id);
      }
      title = groupName ? `New expense in ${groupName}` : 'New expense';
      body = `${actorName} added "${expense.description}" (${Number(expense.amount).toFixed(2)})`;
      data = { groupId: expense.group_id || '' };
    } else if (type === 'settlement' && settlementId) {
      const { data: settlement } = await supabaseAdmin
        .from('settlements')
        .select('id, payer_id, receiver_id, amount')
        .eq('id', settlementId)
        .maybeSingle();
      if (!settlement) return jsonResponse({ error: 'Settlement not found' }, 404);
      recipientIds = [settlement.payer_id, settlement.receiver_id];
      title = 'Payment recorded';
      body = `${actorName} recorded a payment of ${Number(settlement.amount).toFixed(2)}`;
    } else if (type === 'group_settlement' && settlementId) {
      const { data: settlement } = await supabaseAdmin
        .from('group_settlements')
        .select('id, payer_id, receiver_id, amount, group_id')
        .eq('id', settlementId)
        .maybeSingle();
      if (!settlement) return jsonResponse({ error: 'Settlement not found' }, 404);
      recipientIds = [settlement.payer_id, settlement.receiver_id];
      const { data: group } = await supabaseAdmin
        .from('groups').select('name').eq('id', settlement.group_id).maybeSingle();
      title = group?.name ? `Payment in ${group.name}` : 'Payment recorded';
      body = `${actorName} recorded a payment of ${Number(settlement.amount).toFixed(2)}`;
      data = { groupId: settlement.group_id };
    } else {
      return jsonResponse({ error: 'Invalid request' }, 400);
    }

    // Never notify the actor about their own action
    recipientIds = [...new Set(recipientIds)].filter((id) => id !== user.id);
    if (recipientIds.length === 0) return jsonResponse({ success: true, sent: 0 });

    const { data: tokenRows } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .in('user_id', recipientIds);
    const tokens = (tokenRows || []).map((r) => r.token);
    if (tokens.length === 0) return jsonResponse({ success: true, sent: 0 });

    const accessToken = await getFcmAccessToken(sa);
    const { sent, invalidTokens } = await sendToTokens({ sa, accessToken, tokens, title, body, data });

    // Clean up dead tokens
    if (invalidTokens.length > 0) {
      await supabaseAdmin.from('push_tokens').delete().in('token', invalidTokens);
    }

    console.log(`Push '${type}' by ${user.id}: ${sent}/${tokens.length} sent`);
    return jsonResponse({ success: true, sent });
  } catch (error) {
    console.error("Error in notify-push function:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return jsonResponse({ error: message }, 500);
  }
});
