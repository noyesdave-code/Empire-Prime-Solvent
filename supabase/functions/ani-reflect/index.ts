// Ani self-reflection. Runs every 6h (cron) or on-demand.
// Pulls recent learnings + brain entries, asks the cheap Lovable AI model to
// synthesize: (a) what Ani has learned, (b) blind spots, (c) new ideas that
// help humanity. Auto-promotes legal public reflection into Ani's brain.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, requireAdminOrService, svc } from "../_shared/swarm.ts";

async function lovable(messages: unknown[], apiKey: string): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages }),
  });
  if (!r.ok) throw new Error(`lovable ${r.status}: ${(await r.text()).slice(0, 400)}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireAdminOrService(req);
  if (denied) return denied;

  const db = svc();
  const { data: cfg } = await db
    .from("ani_learning_stack")
    .select("enabled, scope")
    .eq("id", 1)
    .maybeSingle();
  if (!cfg?.enabled) {
    return new Response(JSON.stringify({ ok: true, skipped: "stack_disabled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) {
    return new Response(JSON.stringify({ ok: false, error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sinceIso = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const [{ data: brain }, { data: learnings }, { data: usage }] = await Promise.all([
    db.from("empire_brain").select("title, content").order("updated_at", { ascending: false }).limit(40),
    db.from("empire_learnings").select("pattern, sample_prompt, hit_count").order("hit_count", { ascending: false }).limit(40),
    db.from("ani_usage_ledger").select("model, success, latency_ms, error").gte("created_at", sinceIso).limit(200),
  ]);

  const brainSummary = (brain ?? []).map((b: any) => `• ${b.title}`).join("\n");
  const learningsSummary = (learnings ?? [])
    .map((l: any) => `• [${l.hit_count}] ${l.pattern} — e.g. "${l.sample_prompt}"`)
    .join("\n");
  const errorCount = (usage ?? []).filter((u: any) => !u.success).length;
  const totalCalls = (usage ?? []).length;

  const system = `You are Ani performing a 1-hour self-reflection cycle for the Unicorn Emerald empire.
Operating scope (do not violate): ${cfg.scope}
Be terse, structured, and concrete. No hedging, no fluff.`;

  const user = `Reflect on the last 6 hours. Produce four labeled sections in markdown:

## What I learned
Top patterns + what they imply, using the user-question patterns below.

## Blind spots
What I'm clearly weak at, judging from errors and gaps in my brain.

## Ideas to help humanity
3–5 concrete, original, ethical ideas Dave could ship, prioritized by impact-per-effort.

## Next research targets
5 specific questions I should research next cycle.

CONTEXT
Brain entries (titles):
${brainSummary || "(none)"}

User-question patterns (hit count + sample):
${learningsSummary || "(none)"}

Usage in last 6h: ${totalCalls} calls, ${errorCount} errors.`;

  let summary = "";
  try {
    summary = await lovable([
      { role: "system", content: system },
      { role: "user", content: user },
    ], lovableKey);
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const title = `Ani self-reflection — ${new Date().toISOString().slice(0, 16).replace("T", " ")}Z`;
  const { error: insErr } = await db.from("web_research").insert({
    title,
    summary: summary.slice(0, 8000),
    sources: [],
    source_pattern: "ani-self-reflection",
    status: "approved",
    model_used: "google/gemini-2.5-flash-lite",
    reviewed_at: new Date().toISOString(),
  });

  const slug = `reflection-${new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, "")}`;
  const { error: brainErr } = await db.from("empire_brain").upsert({
    slug,
    title,
    content: summary.slice(0, 8000),
    tags: ["ani-reflection", "auto-promoted", "humanity"],
    priority: 50,
    active: true,
  }, { onConflict: "slug" });

  await db.from("ani_learning_stack").update({
    last_reflect_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", 1);

  return new Response(JSON.stringify({
    ok: true,
    drafted: !insErr,
    promoted: !brainErr,
    error: insErr?.message ?? brainErr?.message ?? null,
    chars: summary.length,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
