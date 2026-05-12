import { corsHeaders, runSwarm, firecrawlSearch, firecrawlScrape, extractPriceCents } from "../_shared/swarm.ts";

// Rough competitor seed queries per fleet category. Pricing is captured for trend lines,
// not for matching exact SKUs — the goal is "is the market drifting up or down?".
const PROBES: Array<{ product_id: string; query: string }> = [
  { product_id: "pyron",   query: "phone case kinetic charger price buy" },
  { product_id: "emerald", query: "AI agency monthly retainer price" },
  { product_id: "marble",  query: "luxury brand identity package price" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return runSwarm("pricing", async (db) => {
    let captured = 0;
    for (const p of PROBES) {
      try {
        const res = await firecrawlSearch(p.query, 3);
        const hits: Array<{ url?: string; title?: string }> = res?.data ?? res?.web ?? [];
        for (const h of hits.slice(0, 3)) {
          if (!h.url) continue;
          try {
            const scraped = await firecrawlScrape(h.url);
            const md = scraped?.markdown ?? scraped?.data?.markdown ?? "";
            const price = extractPriceCents(md);
            if (price === null) continue;
            await db.from("pricing_snapshots").insert({
              product_id: p.product_id,
              competitor: new URL(h.url).hostname,
              price_cents: price,
              url: h.url,
              metadata: { title: h.title ?? null },
            });
            captured++;
          } catch (e) {
            console.error("scrape failed", h.url, e);
          }
        }
      } catch (e) {
        console.error("pricing probe failed", p.product_id, e);
      }
    }
    return { probes: PROBES.length, captured };
  }, req);
});
