import { corsHeaders, runSwarm, firecrawlSearch } from "../_shared/swarm.ts";

const TERMS = ["unicorn box", "unicorn ai builder", "PGVA Ventures", "unicorn empire LLC"];

function severity(snippet: string): string {
  const s = snippet.toLowerCase();
  if (s.includes("trademark") || s.includes("registered") || s.includes("uspto")) return "high";
  if (s.includes("similar") || s.includes("clone")) return "medium";
  return "low";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return runSwarm("brand-defense", async (db) => {
    let inserted = 0;
    for (const t of TERMS) {
      try {
        const res = await firecrawlSearch(t, 10);
        const hits: Array<{ url?: string; title?: string; description?: string }> =
          res?.data ?? res?.web ?? [];
        for (const h of hits) {
          if (!h.url) continue;
          // Skip our own domains
          if (/unicornaibuilder|pgvaventures|lovable\.app/.test(h.url)) continue;
          const snip = `${h.title ?? ""} — ${h.description ?? ""}`;
          await db.from("brand_alerts").insert({
            term: t,
            source_url: h.url,
            snippet: snip.slice(0, 1000),
            severity: severity(snip),
            metadata: { kind: "brand" },
          });
          inserted++;
        }
      } catch (e) {
        console.error("brand search failed", t, e);
      }
    }
    return { terms: TERMS.length, inserted };
  }, req);
});
