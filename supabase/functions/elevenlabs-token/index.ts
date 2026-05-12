// Mints a short-lived ElevenLabs WebRTC conversation token.
// Allowlists agent IDs so the public anon key cannot mint tokens for arbitrary agents.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Add new agents here as they're wired into the app.
const ALLOWED_AGENTS = new Set<string>([
  "agent_4801krcasm8tfmhsc03d57ecw11s", // Ani (homepage)
  "agent_4401krcad257fkat1jpqskm9209v", // Renewal & Expansion
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { agentId } = await req.json().catch(() => ({}));
    if (typeof agentId !== "string" || !ALLOWED_AGENTS.has(agentId)) {
      return new Response(
        JSON.stringify({ error: "agent_not_allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "missing_api_key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const r = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } },
    );

    if (!r.ok) {
      const text = await r.text();
      return new Response(
        JSON.stringify({ error: "elevenlabs_error", status: r.status, detail: text.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { token } = await r.json();
    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "server_error", detail: String(e).slice(0, 300) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
