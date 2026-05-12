// Computes daily growth metrics for Ani.
// Score (0-100) = weighted vs prior 7-day baseline:
//   +calls 30, +users 25, -latency 15, +success 15, +memory 15
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

function dayStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Optional auth (admin only when called from UI; cron passes service role)
  const auth = req.headers.get("Authorization");
  if (auth && !auth.includes(SERVICE_ROLE)) {
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (u?.user) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (!roles?.some((r: { role: string }) => r.role === "admin")) return json({ error: "Admin only" }, 403);
    }
  }

  const today = new Date();
  const todayStart = new Date(today.toISOString().slice(0, 10) + "T00:00:00Z").toISOString();

  // Today's stats
  const { data: rows } = await supabase
    .from("ani_usage_ledger")
    .select("user_id, latency_ms, success")
    .gte("created_at", todayStart);
  const total_calls = rows?.length ?? 0;
  const unique_users = new Set((rows ?? []).map((r) => r.user_id ?? "anon")).size;
  const lat = (rows ?? []).map((r) => r.latency_ms ?? 0).filter(Boolean);
  const avg_latency_ms = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0;
  const success_rate = total_calls ? +(((rows ?? []).filter((r) => r.success).length / total_calls) * 100).toFixed(2) : 0;

  const { count: memory_size } = await supabase
    .from("memory_vectors")
    .select("id", { count: "exact", head: true });

  const { data: skills } = await supabase
    .from("ani_usage_ledger")
    .select("model")
    .gte("created_at", todayStart);
  const distinct_skills = new Set((skills ?? []).map((s) => s.model)).size;

  // 7-day baseline
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: baseline } = await supabase
    .from("ani_growth_metrics")
    .select("total_calls, unique_users, avg_latency_ms, success_rate, memory_size")
    .gte("day", weekAgo.slice(0, 10));

  const avg = (k: keyof NonNullable<typeof baseline>[number]) => {
    const arr = (baseline ?? []).map((b) => Number(b[k] ?? 0));
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  };
  const baseCalls = avg("total_calls") || 1;
  const baseUsers = avg("unique_users") || 1;
  const baseLat = avg("avg_latency_ms") || avg_latency_ms || 1;
  const baseSucc = avg("success_rate") || success_rate || 1;
  const baseMem = avg("memory_size") || (memory_size ?? 0) || 1;

  const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
  const callsScore = clamp((total_calls / baseCalls) * 50, 0, 100);
  const usersScore = clamp((unique_users / baseUsers) * 50, 0, 100);
  const latencyScore = clamp((baseLat / Math.max(avg_latency_ms, 1)) * 50, 0, 100);
  const successScore = clamp((success_rate / Math.max(baseSucc, 1)) * 50, 0, 100);
  const memoryScore = clamp(((memory_size ?? 0) / baseMem) * 50, 0, 100);

  const growth_score = +(
    callsScore * 0.30 +
    usersScore * 0.25 +
    latencyScore * 0.15 +
    successScore * 0.15 +
    memoryScore * 0.15
  ).toFixed(2);

  const payload = {
    day: dayStr(today),
    total_calls,
    unique_users,
    avg_latency_ms,
    success_rate,
    memory_size: memory_size ?? 0,
    distinct_skills,
    growth_score,
    computed_at: new Date().toISOString(),
  };

  await supabase.from("ani_growth_metrics").upsert(payload, { onConflict: "day" });

  return json(payload);
});
