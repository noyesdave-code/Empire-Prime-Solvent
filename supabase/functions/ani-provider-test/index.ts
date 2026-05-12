// Admin-only: pings each configured AI provider and reports latency + sample reply.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pingPerplexity() {
  const key = Deno.env.get("PERPLEXITY_API_KEY");
  if (!key) return { ok: false, configured: false, error: "PERPLEXITY_API_KEY not set" };
  const t0 = Date.now();
  try {
    const r = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: "Reply with a single word: ok" }],
        max_tokens: 10,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const txt = await r.text();
    if (!r.ok) return { ok: false, configured: true, status: r.status, error: txt.slice(0, 300), latency_ms: Date.now() - t0 };
    const j = JSON.parse(txt);
    return {
      ok: true,
      configured: true,
      latency_ms: Date.now() - t0,
      sample: j?.choices?.[0]?.message?.content ?? "",
      model: "sonar",
    };
  } catch (e) {
    return { ok: false, configured: true, error: String(e), latency_ms: Date.now() - t0 };
  }
}

async function pingLovable() {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { ok: false, configured: false, error: "LOVABLE_API_KEY not set" };
  const t0 = Date.now();
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: "Reply with a single word: ok" }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    const txt = await r.text();
    if (!r.ok) return { ok: false, configured: true, status: r.status, error: txt.slice(0, 300), latency_ms: Date.now() - t0 };
    const j = JSON.parse(txt);
    return {
      ok: true,
      configured: true,
      latency_ms: Date.now() - t0,
      sample: j?.choices?.[0]?.message?.content ?? "",
      model: "google/gemini-2.5-flash-lite",
    };
  } catch (e) {
    return { ok: false, configured: true, error: String(e), latency_ms: Date.now() - t0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Auth required" }, 401);
  const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "Auth required" }, 401);
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
  if (!roles?.some((r: { role: string }) => r.role === "admin")) return json({ error: "Admin only" }, 403);

  const [independent, lovable] = await Promise.all([pingPerplexity(), pingLovable()]);
  return json({ independent, lovable, ts: new Date().toISOString() });
});
