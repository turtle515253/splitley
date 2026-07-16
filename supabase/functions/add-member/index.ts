import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// CORS headers - allow all origins since auth is handled separately
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: 30 member additions per hour
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

interface AddMemberRequest {
  email: string;
  groupId: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendAddedToGroupEmail(options: {
  toEmail: string;
  inviterName: string;
  groupName: string;
  groupEmoji: string;
  groupLink: string;
  isNewUser: boolean;
  downloadUrl: string;
}): Promise<boolean> {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL");
  if (!apiKey || !fromEmail) {
    console.error("SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not configured; skipping email");
    return false;
  }

  const inviter = escapeHtml(options.inviterName);
  const group = escapeHtml(options.groupName);
  const emoji = escapeHtml(options.groupEmoji);
  const subject = `${options.inviterName} added you to "${options.groupName}" on Splitley`;

  const ctaBlock = options.isNewUser
    ? `
      <p style="margin:24px 0 8px;">You're new to Splitley — get the app to see your group and start splitting expenses:</p>
      <p style="margin:16px 0;">
        <a href="${options.downloadUrl}" style="background:#16a34a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Get Splitley</a>
      </p>
      <p style="color:#64748b;font-size:14px;">Sign in with Google using this email address (${escapeHtml(options.toEmail)}) and the group will already be there waiting for you.</p>`
    : `
      <p style="margin:24px 0 8px;">Open the group to see what's been shared:</p>
      <p style="margin:16px 0;">
        <a href="${options.groupLink}" style="background:#16a34a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">View group</a>
      </p>`;

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0b1220;">
      <h2 style="margin:0 0 16px;">You've been added to a group ${emoji}</h2>
      <p style="font-size:16px;line-height:1.6;">
        <strong>${inviter}</strong> added you to the group <strong>"${group}"</strong> on Splitley,
        the easy way to split expenses with friends.
      </p>
      ${ctaBlock}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="color:#94a3b8;font-size:12px;">You received this email because someone added you to a group on Splitley.</p>
    </div>`;

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.toEmail }] }],
      from: { email: fromEmail, name: "Splitley" },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`SendGrid error ${response.status}: ${errorBody}`);
    return false;
  }
  return true;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization required" }, 401);
    }

    // Client with the caller's token to identify the user
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return jsonResponse({ error: "Invalid authentication" }, 401);
    }

    // Admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Rate limit
    const { data: rateLimitAllowed, error: rateLimitError } = await supabaseAdmin.rpc(
      "check_rate_limit",
      {
        _user_id: user.id,
        _action: "add-member",
        _max_requests: RATE_LIMIT_MAX_REQUESTS,
        _window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      }
    );
    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    } else if (!rateLimitAllowed) {
      return jsonResponse({ error: "Too many requests. Please try again later." }, 429);
    }

    const { email, groupId }: AddMemberRequest = await req.json();

    if (!email || !groupId) {
      return jsonResponse({ error: "email and groupId are required" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return jsonResponse({ error: "Invalid email format" }, 400);
    }

    // Caller must be a member of the group
    const { data: callerMembership } = await supabaseAdmin
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!callerMembership) {
      return jsonResponse({ error: "You are not a member of this group" }, 403);
    }

    const { data: group, error: groupError } = await supabaseAdmin
      .from("groups")
      .select("id, name, emoji")
      .eq("id", groupId)
      .single();
    if (groupError || !group) {
      return jsonResponse({ error: "Group not found" }, 404);
    }

    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const inviterName = inviterProfile?.display_name || "A friend";

    // Find an existing account for this email
    const { data: matchingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .ilike("email", normalizedEmail)
      .limit(1);

    let memberUserId: string;
    let isNewUser = false;

    if (matchingProfiles && matchingProfiles.length > 0) {
      memberUserId = matchingProfiles[0].id;
    } else {
      // No account yet: create one immediately so the member shows up in the group.
      // The profile row is created by the on_auth_user_created trigger.
      const displayName = normalizedEmail.split("@")[0];
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: { full_name: displayName, invited_via_group: groupId },
      });
      if (createError || !created?.user) {
        console.error("Failed to create user:", createError);
        return jsonResponse({ error: createError?.message || "Failed to create user" }, 500);
      }
      memberUserId = created.user.id;
      isNewUser = true;
    }

    if (memberUserId === user.id) {
      return jsonResponse({ error: "You are already in this group" }, 400);
    }

    // Skip if already a member
    const { data: existingMembership } = await supabaseAdmin
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", memberUserId)
      .maybeSingle();
    if (existingMembership) {
      return jsonResponse({ success: true, alreadyMember: true, isNewUser: false, emailSent: false });
    }

    const { error: insertError } = await supabaseAdmin
      .from("group_members")
      .insert({ group_id: groupId, user_id: memberUserId });
    if (insertError) {
      console.error("Failed to add member:", insertError);
      return jsonResponse({ error: "Failed to add member to group" }, 500);
    }

    // Notify by email; membership already committed, so email failure is non-fatal
    const appUrl = (Deno.env.get("APP_URL") || req.headers.get("origin") || "").replace(/\/$/, "");
    const emailSent = await sendAddedToGroupEmail({
      toEmail: normalizedEmail,
      inviterName,
      groupName: group.name,
      groupEmoji: group.emoji || "",
      groupLink: `${appUrl}/groups/${groupId}`,
      isNewUser,
      downloadUrl: Deno.env.get("APP_DOWNLOAD_URL") || `${appUrl}/auth`,
    }).catch((err) => {
      console.error("Email send failed:", err);
      return false;
    });

    console.log(`User ${memberUserId} added to group ${groupId} by ${user.id} (new: ${isNewUser}, email: ${emailSent})`);
    return jsonResponse({ success: true, alreadyMember: false, isNewUser, emailSent });
  } catch (error: any) {
    console.error("Error in add-member function:", error);
    return jsonResponse({ error: error.message || "An unexpected error occurred" }, 500);
  }
});
