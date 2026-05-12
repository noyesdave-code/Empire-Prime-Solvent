// Nightly: Ani reviews last 24h of community_messages and posts a "Best Build of the Day".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  // Already posted today?
  const { data: existing } = await supabase
    .from("idea_board_posts").select("id").eq("for_date", today).maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ ok: true, skipped: "already posted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: msgs } = await supabase
    .from("community_messages")
    .select("id,user_id,content,image_url,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(500);

  if (!msgs || msgs.length === 0) {
    return new Response(JSON.stringify({ ok: true, skipped: "no messages" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const transcript = msgs
    .map((m) => `[${new Date(m.created_at).toISOString()}] user ${m.user_id.slice(0, 8)}: ${m.content}${m.image_url ? " [image]" : ""}`)
    .join("\n");

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  let title = "Best Build of the Day";
  let summary = "Ani is reviewing the room — check back tomorrow.";
  let winner: string | null = null;

  if (apiKey) {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are Ani, the Empire's friendly community moderator. Read the last 24h of builder chat and pick ONE standout idea or build. Reply as JSON: {\"title\":\"<8-12 words>\",\"summary\":\"<3-5 sentence celebration of the winner and one tip for everyone>\",\"winner_user_id\":\"<uuid prefix or null>\"}. Be warm, specific, and concise." },
          { role: "user", content: transcript.slice(0, 12000) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (r.ok) {
      const j = await r.json();
      try {
        const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
        title = parsed.title || title;
        summary = parsed.summary || summary;
        const wprefix = (parsed.winner_user_id || "").toString().slice(0, 8);
        if (wprefix) {
          const match = msgs.find((m) => m.user_id.startsWith(wprefix));
          winner = match?.user_id ?? null;
        }
      } catch { /* keep defaults */ }
    }
  }

  const { error } = await supabase.from("idea_board_posts").insert({
    for_date: today,
    title,
    summary,
    winner_user_id: winner,
    source: { message_count: msgs.length },
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, title, winner }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
