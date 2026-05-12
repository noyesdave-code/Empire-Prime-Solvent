// Shared helpers for swarm edge functions.
// All swarms log a row in `swarm_runs` and use service-role Supabase to write results.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function svc() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

// Authorize a swarm/admin trigger. Accepts:
//  - a Supabase service_role JWT (cron / server)
//  - an authenticated admin user JWT
// Returns null if allowed, or a 401/403 Response if not.
export async function requireAdminOrService(req: Request): Promise<Response | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // Allow direct service_role secret
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return null;

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  );
  const { data: claims, error } = await userClient.auth.getClaims(token);
  if (error || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (claims.claims.role === "service_role") return null;
  const uid = claims.claims.sub;
  const admin = svc();
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
  if (!roles?.some((r: { role: string }) => r.role === "admin")) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

export async function runSwarm(
  name: string,
  fn: (db: ReturnType<typeof svc>) => Promise<Record<string, unknown>>,
  req?: Request,
): Promise<Response> {
  if (req) {
    const denied = await requireAdminOrService(req);
    if (denied) return denied;
  }
  const db = svc();
  const { data: run } = await db
    .from("swarm_runs")
    .insert({ swarm_name: name, status: "running" })
    .select("id")
    .single();
  const runId = run?.id;
  try {
    const stats = await fn(db);
    await db.from("swarm_runs").update({
      status: "ok",
      finished_at: new Date().toISOString(),
      stats,
    }).eq("id", runId);
    return new Response(JSON.stringify({ ok: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await db.from("swarm_runs").update({
      status: "error",
      finished_at: new Date().toISOString(),
      error: err,
    }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: err }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Resend email via the connector gateway
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  const lov = Deno.env.get("LOVABLE_API_KEY");
  const resend = Deno.env.get("RESEND_API_KEY");
  if (!lov || !resend) return { ok: false, error: "missing keys" };
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "Unicorn Box <onboarding@resend.dev>";
  const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${lov}`,
      "X-Connection-Api-Key": resend,
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!r.ok) return { ok: false, error: `resend ${r.status}: ${await r.text()}` };
  return { ok: true };
}

// Firecrawl search via the connector gateway
export async function firecrawlSearch(query: string, limit = 10) {
  const lov = Deno.env.get("LOVABLE_API_KEY");
  const fc = Deno.env.get("FIRECRAWL_API_KEY");
  if (!lov || !fc) throw new Error("firecrawl keys missing");
  const r = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${lov}`,
      "X-Connection-Api-Key": fc,
    },
    body: JSON.stringify({ query, limit }),
  });
  if (!r.ok) throw new Error(`firecrawl search ${r.status}: ${await r.text()}`);
  return await r.json();
}

export async function firecrawlScrape(url: string) {
  const lov = Deno.env.get("LOVABLE_API_KEY");
  const fc = Deno.env.get("FIRECRAWL_API_KEY");
  if (!lov || !fc) throw new Error("firecrawl keys missing");
  const r = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${lov}`,
      "X-Connection-Api-Key": fc,
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!r.ok) throw new Error(`firecrawl scrape ${r.status}: ${await r.text()}`);
  return await r.json();
}

// Lovable AI gateway for cheap text generation
export async function lovableAI(prompt: string, model = "google/gemini-2.5-flash") {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) throw new Error(`ai ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

// Parse a Firecrawl markdown blob and pull the first $X.YY price found.
export function extractPriceCents(md: string): number | null {
  const m = md.match(/\$\s?(\d{1,5})(?:\.(\d{2}))?/);
  if (!m) return null;
  const dollars = parseInt(m[1], 10);
  const cents = m[2] ? parseInt(m[2], 10) : 0;
  return dollars * 100 + cents;
}
