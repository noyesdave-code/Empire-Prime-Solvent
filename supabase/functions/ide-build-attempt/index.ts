// Build-attempt gate for the Empire IDE.
// Authenticated users get 100 free build attempts (run + Ani builds + deploys).
// Owner/admin and active subscribers are unlimited.
// Returns { allowed, used, limit, requires_payment, reason } so the client can show a paywall.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FREE_LIMIT = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({
        ok: true, allowed: false, used: 0, limit: FREE_LIMIT, requires_payment: true,
        reason: "sign in to start building",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({
        ok: true, allowed: false, used: 0, limit: FREE_LIMIT, requires_payment: true,
        reason: "session expired",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let env: "live" | "sandbox" = "live";
    let dryRun = false;
    try {
      const body = await req.json();
      if (body && typeof body === "object") {
        if (body.environment === "sandbox") env = "sandbox";
        if (body.dry_run === true) dryRun = true;
      }
    } catch { /* no body */ }

    const admin = createClient(supabaseUrl, serviceKey);

    if (dryRun) {
      // Read-only status: don't consume an attempt. Show admins/subscribers as unlimited.
      const [{ data: editor }, { data: paid }, { data: row }] = await Promise.all([
        admin.rpc("is_site_editor", { _user_id: user.id }),
        admin.rpc("has_active_subscription", { user_uuid: user.id, check_env: env }),
        admin.from("ide_build_usage").select("free_attempts_used").eq("user_id", user.id).maybeSingle(),
      ]);
      const used = Number(row?.free_attempts_used ?? 0);
      if (editor) {
        return new Response(JSON.stringify({ ok: true, allowed: true, used, limit: FREE_LIMIT, requires_payment: false, reason: "admin unlimited" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (paid) {
        return new Response(JSON.stringify({ ok: true, allowed: true, used, limit: FREE_LIMIT, requires_payment: false, reason: "paid unlimited" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const allowed = used < FREE_LIMIT;
      return new Response(JSON.stringify({
        ok: true, allowed, used, limit: FREE_LIMIT,
        requires_payment: !allowed,
        reason: allowed ? "free attempts available" : "free attempts exhausted",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await admin.rpc("service_consume_ide_build_attempt", {
      _user_id: user.id, _environment: env, _free_limit: FREE_LIMIT,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return new Response(JSON.stringify({
      ok: true,
      allowed: !!row?.allowed,
      used: Number(row?.free_attempts_used ?? 0),
      limit: Number(row?.free_attempts_limit ?? FREE_LIMIT),
      requires_payment: !!row?.requires_payment,
      reason: row?.reason ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
