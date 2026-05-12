// Site edit guard: validates caller is Dave (admin owner) and logs every attempt.
// Any other site-edit edge function should POST to this guard or call checkSiteEditor() inline.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OWNER_EMAIL = "noyes.dave@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;

  let body: { intent?: string; endpoint?: string; metadata?: unknown } = {};
  try {
    body = await req.json();
  } catch (_) {}
  const intent = (body.intent ?? "unknown").toString().slice(0, 200);
  const endpoint = (body.endpoint ?? "site-edit-guard").toString().slice(0, 200);
  const metadata = (body.metadata ?? {}) as Record<string, unknown>;

  const log = async (
    outcome: "allowed" | "denied" | "error",
    reason: string,
    user_id: string | null,
    user_email: string | null,
  ) => {
    await admin.from("site_edit_audit").insert({
      user_id,
      user_email,
      intent,
      endpoint,
      outcome,
      reason,
      metadata,
      ip_address: ip,
      user_agent: ua,
    });
  };

  // 0) IP denylist check (before anything else)
  if (ip) {
    const { data: deny } = await admin
      .from("site_edit_ip_denylist")
      .select("id")
      .eq("ip_address", ip)
      .maybeSingle();
    if (deny) {
      await log("denied", "ip_denylisted", null, null);
      return new Response(
        JSON.stringify({ allowed: false, reason: "ip_denylisted" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    await log("denied", "missing_auth", null, null);
    return new Response(
      JSON.stringify({ allowed: false, reason: "missing_auth" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    await log("denied", "invalid_token", null, null);
    return new Response(
      JSON.stringify({ allowed: false, reason: "invalid_token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userId = claimsData.claims.sub as string;
  const email = (claimsData.claims.email as string | undefined)?.toLowerCase() ?? null;

  if (email !== OWNER_EMAIL) {
    await log("denied", "not_owner_email", userId, email);
    return new Response(
      JSON.stringify({ allowed: false, reason: "not_owner" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: isEditor, error: rpcErr } = await admin.rpc("is_site_editor", {
    _user_id: userId,
  });
  if (rpcErr) {
    await log("error", `rpc_error:${rpcErr.message}`, userId, email);
    return new Response(
      JSON.stringify({ allowed: false, reason: "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (!isEditor) {
    await log("denied", "not_admin_role", userId, email);
    return new Response(
      JSON.stringify({ allowed: false, reason: "not_admin" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  await log("allowed", "owner_admin_verified", userId, email);
  return new Response(
    JSON.stringify({ allowed: true, user_id: userId, email }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
