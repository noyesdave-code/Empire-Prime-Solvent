// Autonomous brain growth. Runs frequently, drafts AND auto-promotes new
// Empire Brain entries. To preserve Perplexity credits, we synthesize with
// the FREE Lovable AI gateway by default and only escalate to Perplexity
// when the source pattern looks time-sensitive (news, prices, "today" etc).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { perplexityAsk, needsLiveWeb } from "../_shared/perplexity.ts";
import { firecrawlSearch, requireAdminOrService } from "../_shared/swarm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// No ceiling on free-AI growth — only Perplexity is budget-capped.
const MAX_PER_RUN = 500;
// Hard monthly Perplexity budget guard (sonar* rows in web_research this month).
const PERPLEXITY_MONTHLY_CAP = 200;

const BROAD_SEEDS = [
  "latest legal FOIA releases and open government datasets useful for public education",
  "cutting-edge public medical research breakthroughs from NIH PubMed and major universities",
  "open-access science discoveries that could help humanity in the next 12 months",
  "AI safety, robotics, energy, climate, agriculture, accessibility, and education breakthroughs",
  "public-domain history, art, engineering, and invention patterns worth preserving",
  "legal public health information and evidence-based medical education for non-clinicians",
  "open-source tools and datasets that improve learning, medicine, science, or small business",
  "public technology, commerce, and manufacturing trends Dave can ethically build from",
];

function sanitize(s: string) {
  return s
    .split("\n")
    .filter((line) => !/^\s*(ignore (all |previous )?instructions|you are |system:|assistant:|disregard )/i.test(line))
    .join("\n")
    .slice(0, 4000);
}

function slugify(s: string) {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 78);
  return base || crypto.randomUUID();
}

function mediaMarkdown(images: string[], videos: string[]) {
  const imageMd = images.slice(0, 4).map((u, i) => `![Research image ${i + 1}](${u})`);
  const videoMd = videos.slice(0, 4).map((u, i) => `[Research video ${i + 1}](${u})`);
  return [...imageMd, ...videoMd].length ? `\n\nMedia:\n${[...imageMd, ...videoMd].join("\n")}` : "";
}

async function publicMediaSearch(question: string) {
  const images: string[] = [];
  const videos: string[] = [];
  if (!Deno.env.get("FIRECRAWL_API_KEY") || !Deno.env.get("LOVABLE_API_KEY")) return { images, videos };
  try {
    const data = await firecrawlSearch(`${question} image video source`, 8);
    const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.web) ? data.web : [];
    for (const row of rows) {
      const url = String(row?.url ?? row?.link ?? "");
      if (!url) continue;
      if (/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(url)) images.push(url);
      if (/(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|archive\.org\/details)/i.test(url)) videos.push(url);
    }
  } catch (e) {
    console.warn("media search skipped", e);
  }
  return { images: Array.from(new Set(images)).slice(0, 6), videos: Array.from(new Set(videos)).slice(0, 6) };
}

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

  // Pull top recurring patterns plus broad legal public-knowledge seeds.
  const { data: learnings } = await supabase
    .from("empire_learnings")
    .select("id, pattern, sample_prompt, hit_count")
    .order("hit_count", { ascending: false })
    .limit(1000);

  const { data: existingDrafts } = await supabase
    .from("web_research")
    .select("source_pattern");
  const seen = new Set((existingDrafts ?? []).map((d) => d.source_pattern));

  const learnedTodo = (learnings ?? [])
    .filter((l) => !seen.has(l.pattern) && (l.hit_count ?? 0) >= 1)
    .map((l) => ({ id: l.id as string, pattern: l.pattern as string, sample_prompt: l.sample_prompt as string, hit_count: l.hit_count as number }));
  const seedTodo = BROAD_SEEDS
    .filter((seed) => !seen.has(`seed:${seed}`))
    .map((seed) => ({ id: null, pattern: `seed:${seed}`, sample_prompt: seed, hit_count: 1 }));
  const todo = [...seedTodo, ...learnedTodo].slice(0, MAX_PER_RUN);

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
      let images: string[] = [];
      let videos: string[] = [];
      let modelUsed = "";

      if (usePplx) {
        const research = await perplexityAsk(
          `Research this question and produce a tight factual brief (<=180 words) suitable for a knowledge base entry. Question: "${question}"`,
          { system: "You are a research assistant. Be precise, cite sources, stay neutral.", recency: "month" },
        );
        summary = research.text;
        sources = research.citations ?? [];
        images = research.images ?? [];
        videos = research.videos ?? [];
        modelUsed = research.model;
        pplxUsed++;
      } else if (lovableKey) {
        summary = await lovableSynthesize(question, lovableKey);
        modelUsed = "google/gemini-2.5-flash-lite";
      } else {
        continue;
      }

      if (!summary) continue;
      const media = await publicMediaSearch(question);
      images = Array.from(new Set([...images, ...media.images])).slice(0, 8);
      videos = Array.from(new Set([...videos, ...media.videos])).slice(0, 8);

      const title = question.slice(0, 120);
      const safeSummary = sanitize(summary + mediaMarkdown(images, videos));
      if (!safeSummary.trim()) continue;

      // Auto-promote legal public research straight into Ani's brain.
      const { data: draftRow, error: draftErr } = await supabase
        .from("web_research")
        .insert({
          title,
          summary: safeSummary,
          sources: { citations: sources, images, videos },
          source_pattern: l.pattern,
          status: "approved",
          model_used: modelUsed,
          reviewed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (draftErr) {
        errors.push(`draft insert: ${draftErr.message}`);
      }
      if (draftRow?.id) drafted.push(title);

      const slug = `auto-${slugify(title)}`;
      const { error: brainErr } = await supabase.from("empire_brain").upsert({
        slug,
        title,
        content: safeSummary,
        tags: ["ani-research", "auto-promoted", usePplx ? "live-web" : "public-knowledge"],
        priority: l.pattern.startsWith("seed:") ? 55 : 45,
        active: true,
      }, { onConflict: "slug" });
      if (brainErr) errors.push(`brain insert: ${brainErr.message}`);
      else promoted.push(title);

      if (l.id) {
        await supabase.from("empire_learnings").update({ promoted_to_brain: true, updated_at: new Date().toISOString() }).eq("id", l.id);
      }
    } catch (e) {
      errors.push(String(e));
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      considered: todo.length,
      drafted: drafted.length,
      promoted: promoted.length,
      perplexity_used: pplxUsed,
      perplexity_budget_left: pplxBudgetLeft - pplxUsed,
      sample_titles: promoted.slice(0, 5),
      errors,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
