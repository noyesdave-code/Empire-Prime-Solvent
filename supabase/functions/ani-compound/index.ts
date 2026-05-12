// ani-compound — nightly job. Reads the last 24h of admin chats from `prompts`,
// asks the AI to extract 3-7 durable, reusable rules/lessons, and writes each as
// an INACTIVE empire_brain draft. Admin promotes the good ones from /boardroom.
// Schedule via pg_cron once daily.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "no key" }), { status: 500, headers: cors });
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Find admin user IDs
    const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (admins ?? []).map((a: any) => a.user_id);
    if (!adminIds.length) return new Response(JSON.stringify({ ok: true, note: "no admins" }), { headers: cors });

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: rows } = await supabase
      .from("prompts")
      .select("prompt, response")
      .in("user_id", adminIds)
      .gte("created_at", since)
      .not("response", "is", null)
      .order("created_at", { ascending: true })
      .limit(60);

    if (!rows?.length) return new Response(JSON.stringify({ ok: true, note: "nothing to compound" }), { headers: cors });

    const corpus = rows
      .map((r: any, i: number) => `#${i + 1}\nQ: ${(r.prompt ?? "").slice(0, 500)}\nA: ${(r.response ?? "").slice(0, 800)}`)
      .join("\n\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You compress operator chats into durable, reusable lessons for an AI brain. Output JSON only: {\"lessons\":[{\"title\":\"...\",\"content\":\"...\",\"tags\":[\"...\"]}]}. 3-7 lessons. Each title <= 90 chars. Each content <= 600 chars, written as a stable rule/fact, not a recap. Skip anything trivial or one-off." },
          { role: "user", content: `Extract durable lessons from these admin conversations:\n\n${corpus}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) return new Response(JSON.stringify({ error: await aiRes.text() }), { status: 502, headers: cors });
    const j = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}"); } catch {}
    const lessons: Array<{ title: string; content: string; tags?: string[] }> = parsed.lessons ?? [];

    let inserted = 0;
    for (const l of lessons) {
      if (!l?.title || !l?.content) continue;
      const slug = `compound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { error } = await supabase.from("empire_brain").insert({
        slug,
        title: l.title.slice(0, 120),
        content: l.content.slice(0, 1800),
        tags: Array.isArray(l.tags) ? l.tags.slice(0, 8) : [],
        priority: 150,
        active: false,
      });
      if (!error) inserted++;
    }

    return new Response(JSON.stringify({ ok: true, scanned: rows.length, lessons: lessons.length, inserted }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ani-compound error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
