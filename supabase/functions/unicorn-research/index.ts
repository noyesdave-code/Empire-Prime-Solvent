// Autonomous brain growth. Runs frequently, drafts AND auto-promotes new
// Empire Brain entries. To preserve Perplexity credits, we synthesize with
// the FREE Lovable AI gateway by default and only escalate to Perplexity
// when the source pattern looks time-sensitive (news, prices, "today" etc).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { perplexityAsk, needsLiveWeb } from "../_shared/perplexity.ts";
import { requireAdminOrService } from "../_shared/swarm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// No ceiling on free-AI growth — only Perplexity is budget-capped.
const MAX_PER_RUN = 500;
// Hard monthly Perplexity budget guard (sonar* rows in web_research this month).
const PERPLEXITY_MONTHLY_CAP = 200;

async function lovableSynthesize(question: string, apiKey: string): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content:
            "You are a research writer producing knowledge-base entries for the Unicorn Emerald Studio empire. Write a tight, factual, opinion-free brief (<=180 words) answering the question. Use markdown bullets when listing. No fluff, no hedging.",
        },
        { role: "user", content: question },
      ],
    }),
  });
  if (!r.ok) throw new Error(`lovable ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireAdminOrService(req);
  if (denied) return denied;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const perplexityOn = !!Deno.env.get("PERPLEXITY_API_KEY");

  // Pull top recurring patterns not already drafted/approved.
  const { data: learnings } = await supabase
    .from("empire_learnings")
    .select("id, pattern, sample_prompt, hit_count")
    .order("hit_count", { ascending: false })
    .limit(1000);

  const { data: existingDrafts } = await supabase
    .from("web_research")
    .select("source_pattern");
  const seen = new Set((existingDrafts ?? []).map((d) => d.source_pattern));

  const todo = (learnings ?? [])
    .filter((l) => !seen.has(l.pattern) && (l.hit_count ?? 0) >= 1)
    .slice(0, MAX_PER_RUN);

  // Perplexity monthly usage check
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count: pplxThisMonth } = await supabase
    .from("web_research")
    .select("id", { count: "exact", head: true })
    .gte("created_at", monthStart.toISOString())
    .like("model_used", "sonar%");
  const pplxBudgetLeft = PERPLEXITY_MONTHLY_CAP - (pplxThisMonth ?? 0);

  const drafted: string[] = [];
  const promoted: string[] = [];
  const errors: string[] = [];
  let pplxUsed = 0;

  for (const l of todo) {
    try {
      const question = l.sample_prompt || l.pattern;
      const usePplx = perplexityOn && needsLiveWeb(question) && pplxBudgetLeft - pplxUsed > 0;

      let summary = "";
      let sources: string[] = [];
      let modelUsed = "";

      if (usePplx) {
        const research = await perplexityAsk(
          `Research this question and produce a tight factual brief (<=180 words) suitable for a knowledge base entry. Question: "${question}"`,
          { system: "You are a research assistant. Be precise, cite sources, stay neutral.", recency: "month" },
        );
        summary = research.text;
        sources = research.citations ?? [];
        modelUsed = research.model;
        pplxUsed++;
      } else if (lovableKey) {
        summary = await lovableSynthesize(question, lovableKey);
        modelUsed = "google/gemini-2.5-flash-lite";
      } else {
        continue;
      }

      if (!summary) continue;

      const title = question.slice(0, 120);
      const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);

      // Strip instruction-like injection patterns from user-influenced summary
      // before it ever reaches the brain or any approval queue.
      const sanitize = (s: string) =>
        s
          .split("\n")
          .filter((line) => !/^\s*(ignore (all |previous )?instructions|you are |system:|assistant:|disregard )/i.test(line))
          .join("\n")
          .slice(0, 4000);
      const safeSummary = sanitize(summary);
      if (!safeSummary.trim()) continue;

      // Log draft as PENDING — admin must approve in BoardroomResearch UI before
      // anything reaches empire_brain. No auto-promotion of user-derived content.
      const { data: draftRow, error: draftErr } = await supabase
        .from("web_research")
        .insert({
          title,
          summary: safeSummary,
          sources,
          source_pattern: l.pattern,
          status: "pending",
          model_used: modelUsed,
        })
        .select("id")
        .single();

      if (draftErr) {
        errors.push(`draft insert: ${draftErr.message}`);
      }
      if (draftRow?.id) drafted.push(title);
    } catch (e) {
      errors.push(String(e));
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      considered: todo.length,
      drafted: drafted.length,
      promoted: 0,
      perplexity_used: pplxUsed,
      perplexity_budget_left: pplxBudgetLeft - pplxUsed,
      sample_titles: drafted.slice(0, 5),
      errors,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
