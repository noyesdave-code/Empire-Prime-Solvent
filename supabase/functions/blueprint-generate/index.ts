// Unicorn Box Blueprint Generator
// Accepts intake, calls Lovable AI, stores result, returns blueprint.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIER_DEPTH: Record<string, { listings: number; calendar: string; blogs: number; social: number; model: string }> = {
  spark:   { listings: 1,  calendar: "7-day",  blogs: 1,  social: 5,  model: "google/gemini-3-flash-preview" },
  founder: { listings: 10, calendar: "30-day", blogs: 10, social: 30, model: "google/gemini-2.5-flash" },
  studio:  { listings: 30, calendar: "90-day", blogs: 30, social: 60, model: "google/gemini-2.5-pro" },
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { tier, intake, email } = await req.json();
    if (!tier || !TIER_DEPTH[tier]) return json({ error: "Invalid tier" }, 400);
    if (!email || typeof email !== "string") return json({ error: "Email required" }, 400);
    const emailNorm = email.trim().toLowerCase();
    const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
    if (emailNorm.length > 254 || !EMAIL_RE.test(emailNorm)) {
      return json({ error: "Invalid email" }, 400);
    }
    if (!intake || typeof intake !== "object" || Array.isArray(intake)) {
      return json({ error: "Intake required" }, 400);
    }
    // Server-side caps on every intake field to prevent token-bombing the AI gateway.
    const FIELD_MAX = 500;
    const sanitized: Record<string, string> = {};
    for (const [k, v] of Object.entries(intake as Record<string, unknown>)) {
      if (typeof v !== "string") continue;
      if (k.length > 64) continue;
      sanitized[k] = v.slice(0, FIELD_MAX);
    }
    Object.assign(intake, sanitized);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE);

    // Per-email rate limit (max 3 blueprints / 24h) to prevent credit drain
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recent } = await sb
      .from("blueprints")
      .select("id", { count: "exact", head: true })
      .eq("email", emailNorm)
      .gte("created_at", since);
    if ((recent ?? 0) >= 3) {
      return json({ error: "Daily blueprint limit reached for this email. Try again tomorrow." }, 429);
    }

    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (auth) {
      const { data } = await sb.auth.getUser(auth.replace("Bearer ", ""));
      userId = data?.user?.id ?? null;
    }

    const { data: row, error: insErr } = await sb.from("blueprints").insert({
      user_id: userId, email: emailNorm, tier, intake, status: "generating",
    }).select("id").single();
    if (insErr || !row) return json({ error: "Could not save intake" }, 500);

    const t = TIER_DEPTH[tier];
    const sys = `You are Unicorn AI Builder. Produce a complete, deliverable launch Blueprint for a one-product micro-business. Be concrete, specific, and useful — no fluff, no generic advice. Use markdown with clear H2 sections. The customer paid for this and will execute it themselves on Shopify + Printful (Paddle is the merchant of record for their Unicorn Box subscription, but their store sales go through their own Shopify).`;
    const user = `Tier: ${tier.toUpperCase()}. Deliver: ${t.listings} listings, ${t.calendar} content calendar, ${t.blogs} blog drafts, ${t.social} social captions.

Customer intake:
- Name: ${intake.name}
- Email: ${emailNorm}
- Product idea: ${intake.product_idea}
- Product type: ${intake.product_type}
- Audience: ${intake.audience}
- Vibe (3 words): ${intake.vibe}
- Brand name: ${intake.brand_name || "AI suggest 5 options"}
- Price range: ${intake.price_range}
- Goal: ${intake.goal}

Output sections (use these exact H2 headings):
## Brand Pack (name, tagline, 1-paragraph story, 5 brand voice rules, color palette suggestion)
## Product Line (${t.listings} concrete product variants with title, 1-line description, suggested Printful blank, suggested retail price)
## Shopify Listings (full product titles + 80-word SEO descriptions for each — match the Product Line count)
## Content Calendar (${t.calendar}, day-by-day topics)
## Blog Drafts (${t.blogs} drafts, 250+ words each, SEO-keyworded titles)
## Social Captions (${t.social} captions, mix of platforms)
## Launch Checklist (numbered, executable next 7 days)
${tier === "studio" ? "## Video Script Pack (3 short-form video scripts: hook, body, CTA)\n" : ""}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: t.model, messages: [{ role: "system", content: sys }, { role: "user", content: user }] }),
    });

    if (!aiRes.ok) {
      await sb.from("blueprints").update({ status: "failed" }).eq("id", row.id);
      return json({ error: "AI generation failed", id: row.id }, 502);
    }
    const aiJson = await aiRes.json();
    const output: string = aiJson.choices?.[0]?.message?.content ?? "";

    await sb.from("blueprints").update({ output, status: "complete" }).eq("id", row.id);
    return json({ id: row.id, output, tier });
  } catch (e) {
    console.error("blueprint-generate error", e);
    return json({ error: "Generator unavailable" }, 500);
  }
});
