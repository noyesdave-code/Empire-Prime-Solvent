// Unicorn AI Image Generation — calls Lovable AI Gateway image model
// and returns a data URL the chat can render inline.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PROMPT_LEN = 2000;
const MIN_PROMPT_LEN = 3;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 4;
const FREE_IMAGES_PER_IP = 6;

const DEFAULT_MODEL = "google/gemini-3-flash-image-preview";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashIp(ip: string): Promise<string> {
  const enc = new TextEncoder().encode(`unicorn-img:${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function extractImages(aiJson: unknown): string[] {
  const out: string[] = [];
  const push = (s: unknown) => {
    if (typeof s !== "string" || !s) return;
    if (s.startsWith("data:image")) out.push(s);
    else if (s.startsWith("http")) out.push(s);
    else if (/^[A-Za-z0-9+/=]+$/.test(s) && s.length > 200) out.push(`data:image/png;base64,${s}`);
  };
  try {
    const choices = (aiJson as any)?.choices ?? [];
    for (const c of choices) {
      const msg = c?.message ?? {};
      // Lovable gateway returns images on message.images[*].image_url.url
      const imgs = msg?.images ?? [];
      for (const i of imgs) {
        push(i?.image_url?.url ?? i?.url ?? i?.b64_json);
      }
      // Some models embed in content as parts
      const content = msg?.content;
      if (Array.isArray(content)) {
        for (const p of content) push(p?.image_url?.url ?? p?.url ?? p?.image ?? p?.b64_json);
      }
    }
    // Top-level data array
    const data = (aiJson as any)?.data;
    if (Array.isArray(data)) for (const d of data) push(d?.url ?? d?.b64_json ?? d?.image_url?.url);
  } catch (_) { /* noop */ }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: { prompt?: unknown; session_id?: unknown };
    try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const sessionId = typeof body.session_id === "string" ? body.session_id.slice(0, 200) : "";
    if (!prompt || prompt.length < MIN_PROMPT_LEN || prompt.length > MAX_PROMPT_LEN) {
      return jsonResponse({ error: `Prompt must be ${MIN_PROMPT_LEN}-${MAX_PROMPT_LEN} characters` }, 400);
    }

    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || ua.length < 10) return jsonResponse({ error: "Request blocked." }, 403);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "Service misconfigured." }, 500);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth (optional) — admins skip caps
    let userId: string | null = null;
    let isAdmin = false;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) {
        userId = data.user.id;
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
        isAdmin = !!roles?.some((r: { role: string }) => r.role === "admin");
      }
    }

    const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("cf-connecting-ip")
      ?? req.headers.get("x-real-ip")
      ?? "unknown";
    const ipHash = await hashIp(rawIp);
    const ipSession = `imgip_${ipHash}`;

    if (!isAdmin) {
      const windowAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
      const { count: recent } = await supabase
        .from("prompts")
        .select("id", { count: "exact", head: true })
        .eq("session_id", ipSession)
        .gte("created_at", windowAgo);
      if ((recent ?? 0) >= RATE_LIMIT_MAX) {
        return jsonResponse({ error: "Slow down — too many image requests. Try again in a minute." }, 429);
      }

      if (!userId) {
        const { count: lifetime } = await supabase
          .from("prompts")
          .select("id", { count: "exact", head: true })
          .eq("session_id", ipSession)
          .is("user_id", null);
        if ((lifetime ?? 0) >= FREE_IMAGES_PER_IP) {
          return jsonResponse({
            error: `You've used your ${FREE_IMAGES_PER_IP} free image generations. Sign in for more.`,
            paywall: true,
          }, 402);
        }
      }
    }

    const t0 = Date.now();
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        modalities: ["image", "text"],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      const errText = await aiRes.text();
      console.error("image gateway error:", status, errText);
      if (status === 429) return jsonResponse({ error: "Rate limit reached, try again in a moment." }, 429);
      if (status === 402) return jsonResponse({ error: "AI credits exhausted. Add credits in workspace settings." }, 402);
      return jsonResponse({ error: "Image brain unreachable." }, 502);
    }

    const aiJson = await aiRes.json();
    const images = extractImages(aiJson);
    const latency = Date.now() - t0;

    if (!images.length) {
      console.error("no images extracted", JSON.stringify(aiJson).slice(0, 500));
      return jsonResponse({ error: "Image generation returned no image. Try a different prompt." }, 502);
    }

    // Log
    await supabase.from("prompts").insert({
      user_id: userId,
      session_id: sessionId || ipSession,
      skill: "image",
      prompt: `[image] ${prompt}`,
      response: `[generated ${images.length} image(s)]`,
      model_used: DEFAULT_MODEL,
      latency_ms: latency,
      source: "image",
    });
    if (!userId) {
      await supabase.from("prompts").insert({
        user_id: null,
        session_id: ipSession,
        skill: "image",
        prompt: "[ip-img-tracker]",
        response: null,
        model_used: null,
        source: "ip-img-tracker",
      });
    }

    return jsonResponse({
      images,
      model: DEFAULT_MODEL,
      latency_ms: latency,
      prompt,
    });
  } catch (e) {
    console.error("unicorn-image error:", e);
    return jsonResponse({ error: "Image generation temporarily unavailable." }, 500);
  }
});
