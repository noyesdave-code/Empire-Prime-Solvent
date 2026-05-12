// Archives anonymous Unicorn Q&A into the public_answers table.
// Cheap: pulls up to 25 unprocessed anonymous prompts/run, generates a
// SEO title + 160-char summary via Gemini Flash (one call per item).
import { corsHeaders, runSwarm, lovableAI } from "../_shared/swarm.ts";

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return runSwarm("archive-answers", async (db) => {
    // Get the most recent IDs already archived to avoid duplicates.
    const { data: existing } = await db
      .from("public_answers")
      .select("prompt_id")
      .not("prompt_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    const seen = new Set((existing ?? []).map((r) => r.prompt_id));

    // Pull recent anonymous prompts with non-empty responses.
    const { data: prompts } = await db
      .from("prompts")
      .select("id, prompt, response, created_at")
      .is("user_id", null)
      .neq("source", "ip-tracker")
      .not("response", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    let archived = 0;
    let skipped = 0;
    const candidates = (prompts ?? []).filter((p) =>
      !seen.has(p.id) &&
      typeof p.response === "string" &&
      p.response.length > 80 &&
      typeof p.prompt === "string" &&
      p.prompt.length > 10 &&
      !/(test|hello|hi|hey|asdf)$/i.test(p.prompt.trim())
    ).slice(0, 25);

    for (const p of candidates) {
      try {
        const meta = await lovableAI(
          `You SEO-optimize Q&A pages. For this question, return ONLY JSON like {"title":"...","summary":"...","tags":["..."]}.\nRules: title <= 60 chars, descriptive, no clickbait. summary <= 155 chars. 2-4 lowercase tags.\nQuestion: ${p.prompt}\nAnswer (excerpt): ${p.response.slice(0, 600)}`,
          "google/gemini-2.5-flash-lite",
        );
        let title = p.prompt.slice(0, 60);
        let summary = p.response.slice(0, 155);
        let tags: string[] = [];
        try {
          const json = JSON.parse(meta.replace(/```json|```/g, "").trim());
          if (json.title) title = String(json.title).slice(0, 60);
          if (json.summary) summary = String(json.summary).slice(0, 155);
          if (Array.isArray(json.tags)) tags = json.tags.map((t: unknown) => String(t).toLowerCase()).slice(0, 4);
        } catch { /* fall back to defaults */ }

        let baseSlug = slugify(title) || `q-${p.id.slice(0, 8)}`;
        // Ensure unique slug
        let slug = baseSlug;
        let suffix = 1;
        while (true) {
          const { data: clash } = await db.from("public_answers").select("id").eq("slug", slug).maybeSingle();
          if (!clash) break;
          suffix++;
          slug = `${baseSlug}-${suffix}`;
          if (suffix > 5) { slug = `${baseSlug}-${p.id.slice(0, 6)}`; break; }
        }

        await db.from("public_answers").insert({
          prompt_id: p.id,
          slug,
          question: p.prompt,
          answer: p.response,
          ai_title: title,
          ai_summary: summary,
          tags,
          indexed: true,
        });
        archived++;
      } catch (e) {
        console.error("archive failed for", p.id, e);
        skipped++;
      }
    }
    return { archived, skipped, scanned: candidates.length };
  }, req);
});
