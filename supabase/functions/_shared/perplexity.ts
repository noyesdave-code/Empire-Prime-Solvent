// Shared Perplexity helper. Uses sonar (cheap+fast). Returns text, citations,
// and any media links surfaced by the provider.
export interface PerplexityResult {
  text: string;
  citations: string[];
  images: string[];
  videos: string[];
  model: string;
}

export async function perplexityAsk(
  prompt: string,
  opts: { system?: string; model?: string; recency?: "day" | "week" | "month" | "year" } = {},
): Promise<PerplexityResult> {
  const key = Deno.env.get("PERPLEXITY_API_KEY");
  if (!key) throw new Error("PERPLEXITY_API_KEY missing");
  const model = opts.model ?? "sonar";
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: opts.system ?? "Be precise, cite sources, no fluff." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  };
  if (opts.recency) body.search_recency_filter = opts.recency;
  const r = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`perplexity ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return {
    text: j?.choices?.[0]?.message?.content ?? "",
    citations: Array.isArray(j?.citations) ? j.citations : [],
    images: Array.isArray(j?.images)
      ? j.images.map((x: unknown) => typeof x === "string" ? x : (x as { url?: string })?.url).filter(Boolean).slice(0, 8)
      : [],
    videos: Array.isArray(j?.videos)
      ? j.videos.map((x: unknown) => typeof x === "string" ? x : (x as { url?: string })?.url).filter(Boolean).slice(0, 8)
      : [],
    model,
  };
}

// Heuristic: should we route this question through live web search?
const LIVE_TRIGGERS = [
  "today", "tonight", "this week", "this month", "right now", "currently",
  "latest", "newest", "recent", "news", "headline", "headlines", "trending",
  "price of", "stock", "score", "weather", "forecast",
  "who won", "who is winning", "live", "breaking",
  "2025", "2026", "this year",
];
export function needsLiveWeb(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return LIVE_TRIGGERS.some((t) => p.includes(t));
}
