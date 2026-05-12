import { corsHeaders, runSwarm, firecrawlSearch } from "../_shared/swarm.ts";

const QUERIES = [
  "site:sam.gov AI automation small business set-aside",
  "site:sam.gov veteran owned software contract",
  "site:govwin.com new RFP AI compliance",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return runSwarm("defense-intel", async (db) => {
    let inserted = 0;
    for (const q of QUERIES) {
      try {
        const res = await firecrawlSearch(q, 8);
        const hits: Array<{ url?: string; title?: string; description?: string }> =
          res?.data ?? res?.web ?? [];
        for (const h of hits) {
          if (!h.url) continue;
          await db.from("brand_alerts").insert({
            term: `defense:${q}`,
            source_url: h.url,
            snippet: (h.title ?? "") + " — " + (h.description ?? ""),
            severity: "info",
            metadata: { kind: "defense", query: q },
          });
          inserted++;
        }
      } catch (e) {
        console.error("defense search failed", q, e);
      }
    }
    return { queries: QUERIES.length, inserted };
  }, req);
});
