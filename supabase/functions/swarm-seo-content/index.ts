import { corsHeaders, runSwarm, lovableAI } from "../_shared/swarm.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return runSwarm("seo-content", async (db) => {
    // Find product with worst CTR over last 7d (clicks/impressions).
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: ev } = await db
      .from("funnel_events")
      .select("event_type, product")
      .gte("created_at", since)
      .not("product", "is", null)
      .limit(5000);
    const tally = new Map<string, { imp: number; clk: number }>();
    for (const e of ev ?? []) {
      const p = e.product as string;
      const t = tally.get(p) ?? { imp: 0, clk: 0 };
      if (e.event_type === "impression") t.imp++;
      if (e.event_type === "click_checkout" || e.event_type === "click_blueprint") t.clk++;
      tally.set(p, t);
    }
    const ranked = Array.from(tally.entries())
      .filter(([, v]) => v.imp >= 5)
      .sort((a, b) => (a[1].clk / a[1].imp) - (b[1].clk / b[1].imp));
    const target = ranked[0]?.[0];
    if (!target) return { drafted: 0, reason: "no eligible product" };

    const prompt = `Write a 600-word SEO blog post for the Unicorn Box™ fleet product "${target}".
Goal: rank for buyer-intent searches. Include:
- An H1 with the product name + benefit
- 3 H2 sections (problem, solution, how Unicorn Box delivers)
- A bulleted feature list
- A closing CTA linking to https://unicornaibuilder.lovable.app/p/${target}
Output: pure markdown, no preamble.`;
    const body = await lovableAI(prompt);
    const title = body.split("\n").find((l) => l.startsWith("# "))?.replace(/^#\s+/, "") ?? `${target} — Unicorn Box`;

    await db.from("seo_drafts").insert({
      product_id: target,
      title: title.slice(0, 200),
      body_md: body,
      status: "draft",
      metadata: { ctr: ranked[0][1] },
    });
    return { drafted: 1, product: target, ctr: ranked[0][1] };
  }, req);
});
