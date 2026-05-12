// Lightweight health endpoint for UptimeRobot / external monitors.
// Returns 200 if Supabase round-trip works, 503 otherwise.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const started = Date.now();
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await sb.from("skills_registry").select("slug", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, ms: Date.now() - started, ts: new Date().toISOString() }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), ms: Date.now() - started }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
