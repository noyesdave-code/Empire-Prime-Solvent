// Pings each active uptime_targets URL, records latency + status to uptime_checks.
// Invoked by pg_cron every 5 minutes. No auth required (verify_jwt = false).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: targets, error } = await admin
      .from("uptime_targets")
      .select("id,url,label")
      .eq("active", true);
    if (error) throw error;

    const results = await Promise.all((targets ?? []).map(async (t) => {
      const start = Date.now();
      let status = 0;
      let ok = false;
      let err: string | null = null;
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 10_000);
        const r = await fetch(t.url, { method: "GET", signal: ctrl.signal, redirect: "follow" });
        clearTimeout(to);
        status = r.status;
        ok = r.ok;
      } catch (e) {
        err = e instanceof Error ? e.message : String(e);
      }
      const latency = Date.now() - start;
      await admin.from("uptime_checks").insert({
        target_id: t.id, status_code: status || null, latency_ms: latency, ok, error: err,
      });
      return { url: t.url, status, ok, latency_ms: latency, error: err };
    }));

    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
