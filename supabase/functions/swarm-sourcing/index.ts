// Sourcing swarm: for every product_sourcing row in 'pending' or 'needs_refresh',
// 1) AI estimates supplier + cost
// 2) (optional) Firecrawl verifies against supplier URL or Printful catalog
// 3) Computes tiered-margin suggested price via DB function
// 4) Sets status = 'ready_for_review'
import { runSwarm, lovableAI, firecrawlSearch, extractPriceCents, corsHeaders } from "../_shared/swarm.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return runSwarm("sourcing", async (db) => {
    const { data: rows } = await db.from("product_sourcing")
      .select("*").in("status", ["pending", "needs_refresh"]).limit(15);

    let ai_estimated = 0, verified = 0, priced = 0;
    for (const row of rows ?? []) {
      // 1) AI estimate
      let est = row.ai_estimated_cost_cents as number | null;
      let supplier = row.supplier as string | null;
      let supplierUrl = row.supplier_url as string | null;
      let isPod = !!row.is_pod;

      if (est == null) {
        const prompt = `Estimate the realistic wholesale supplier cost (in USD cents, integer) for this product:
NAME: ${row.name}
CATEGORY: ${row.category ?? "unknown"}
DESCRIPTION: ${row.description ?? ""}

Return STRICT JSON only:
{"cost_cents": <int>, "supplier": "<best supplier name>", "supplier_url": "<https://...>", "is_pod": <true if print-on-demand apparel/mug/poster, else false>, "confidence": "<low|med|high>"}`;
        try {
          const out = await lovableAI(prompt, "google/gemini-2.5-flash-lite");
          const m = out.match(/\{[\s\S]*\}/);
          if (m) {
            const j = JSON.parse(m[0]);
            est = Number(j.cost_cents) || null;
            supplier = j.supplier ?? null;
            supplierUrl = j.supplier_url ?? null;
            isPod = !!j.is_pod;
            ai_estimated++;
          }
        } catch (_) { /* ignore */ }
      }

      // 2) Firecrawl verify (best-effort, skip on credit/error)
      let verifiedCost = row.verified_cost_cents as number | null;
      if (!verifiedCost && supplier) {
        try {
          const q = `${row.name} wholesale price ${supplier}`;
          const sr = await firecrawlSearch(q, 3);
          const md = (sr?.data ?? sr?.web ?? []).map((r: { markdown?: string; description?: string }) => r.markdown ?? r.description ?? "").join("\n");
          const c = extractPriceCents(md);
          if (c) { verifiedCost = c; verified++; }
        } catch (_) { /* firecrawl credit cap or net error - log only */ }
      }

      // 3) Tiered margin
      const cost = verifiedCost ?? est;
      let suggested: number | null = null, marginPct: number | null = null;
      if (cost) {
        const { data: pr } = await db.rpc("suggest_price_cents", { _cost_cents: cost });
        const r0 = Array.isArray(pr) ? pr[0] : pr;
        suggested = r0?.price_cents ?? null;
        marginPct = r0?.margin_pct ?? null;
        priced++;
      }

      await db.from("product_sourcing").update({
        ai_estimated_cost_cents: est,
        verified_cost_cents: verifiedCost,
        supplier, supplier_url: supplierUrl, is_pod: isPod,
        suggested_price_cents: suggested,
        margin_pct: marginPct,
        status: cost ? "ready_for_review" : "needs_data",
      }).eq("id", row.id);
    }

    return { processed: rows?.length ?? 0, ai_estimated, verified, priced };
  }, req);
});
