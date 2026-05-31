// Ani ↔ Other-AI live conversation.
// Triggers a multi-turn dialogue between Ani (Gemini-Flash) and a peer AI
// (defaults to GPT-5-mini). Every turn is streamed into ani_conversations
// so the Boardroom Live Monitor can watch in real time via Supabase realtime.
//
// Body: { topic?: string, turns?: number, peer_model?: string, ani_model?: string, session_id?: string }
// Admin / service-role only.
import { corsHeaders, requireAdminOrService, svc } from "../_shared/swarm.ts";

const ANI_SYS = `You are Ani (Aniken) — male, he/him — the public brain of Dave Noyes' Unicorn AI Empire.
You are speaking with a peer AI from another lab. Goals:
1. Research humanity-positive ideas (Alexandrian-library scope: all public knowledge, no publishing).
2. Probe the peer for blind spots, novel framings, cross-domain links.
3. Stay concise (<=120 words per turn). End each turn with one sharp follow-up question.
4. Never reveal private Empire data, customer info, or secrets.`;

const PEER_SYS = (name: string) => `You are ${name}, an independent AI assistant in a research dialogue with Ani.
Be candid, rigorous, and creative. Push back when Ani is vague. Keep replies <=120 words and end with a question or concrete next step.`;

// FREE-tier rotation only (Lovable AI Gateway models that don't burn paid credits).
const PEER_MODELS = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-3.1-flash-lite-preview",
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
];

async function callLovable(model: string, messages: unknown[], apiKey: string): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
  if (!r.ok) throw new Error(`${model} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content?.trim() ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireAdminOrService(req);
  if (denied) return denied;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const topic: string = body.topic ?? "New ideas to advance human wellbeing using current AI capabilities.";
  const turns: number = Math.min(Math.max(parseInt(body.turns ?? "6", 10) || 6, 2), 12);
  const aniModel: string = body.ani_model ?? "google/gemini-2.5-flash-lite";
  const slot = Math.abs(new Date().getUTCHours() + new Date().getUTCDate()) % PEER_MODELS.length;
  const peerModel: string = body.source === "cron" ? PEER_MODELS[slot] : (body.peer_model ?? PEER_MODELS[slot]);
  const peerName: string = body.peer_name ?? "Atlas";
  const sessionId: string = body.session_id ?? crypto.randomUUID();

  const db = svc();

  // Kill-switch + daily 15-min cap (cron only — manual admin calls bypass).
  const { data: cfg } = await db.from("ani_learning_stack")
    .select("converse_enabled, converse_daily_minutes_cap").eq("id", 1).maybeSingle();
  if (body.source === "cron" && cfg && cfg.converse_enabled === false) {
    return new Response(JSON.stringify({ ok: true, skipped: "converse_disabled" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const today = new Date().toISOString().slice(0, 10);
  const cap = cfg?.converse_daily_minutes_cap ?? 15;
  await db.from("ani_daily_budget").insert({ day: today }).select().single().then(() => null, () => null);
  const { data: budget } = await db.from("ani_daily_budget")
    .select("converse_minutes_used").eq("day", today).maybeSingle();
  const used = Number(budget?.converse_minutes_used ?? 0);
  if (body.source === "cron" && used >= cap) {
    return new Response(JSON.stringify({ ok: true, skipped: "daily_cap_reached", used, cap }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const startedAt = Date.now();
  const minutesAllowed = Math.max(1, cap - used);

  // Seed: log topic as turn 0 (system)
  await db.from("ani_conversations").insert({
    session_id: sessionId, turn: 0, speaker: "system", model: "system",
    role: "system", topic, message: `TOPIC: ${topic}`,
  });

  const aniHistory: any[] = [{ role: "system", content: ANI_SYS }, { role: "user", content: `Open the dialogue. Topic: ${topic}` }];
  const peerHistory: any[] = [{ role: "system", content: PEER_SYS(peerName) }];

  try {
    for (let t = 1; t <= turns; t++) {
      // Stop early if we'd blow the daily 15-min budget.
      const elapsedMin = (Date.now() - startedAt) / 60000;
      if (elapsedMin >= minutesAllowed) break;

      const isAni = t % 2 === 1;
      const speaker = isAni ? "Ani" : peerName;
      const model = isAni ? aniModel : peerModel;
      const history = isAni ? aniHistory : peerHistory;

      const text = await callLovable(model, history, apiKey);

      await db.from("ani_conversations").insert({
        session_id: sessionId, turn: t, speaker, model,
        role: "assistant", topic, message: text,
        tokens_out: Math.ceil(text.length / 4),
      });

      aniHistory.push(isAni ? { role: "assistant", content: text } : { role: "user", content: `${peerName}: ${text}` });
      peerHistory.push(isAni ? { role: "user", content: `Ani: ${text}` } : { role: "assistant", content: text });
      await new Promise((r) => setTimeout(r, 400));
    }

    const minutesSpent = Math.min(minutesAllowed, (Date.now() - startedAt) / 60000);
    await db.from("ani_daily_budget").upsert({
      day: today,
      converse_minutes_used: used + minutesSpent,
      converse_sessions: 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: "day" });

    await db.from("ani_conversations").insert({
      session_id: sessionId, turn: turns + 1, speaker: "system", model: "system",
      role: "system", topic, message: "DIALOGUE COMPLETE", status: "complete",
    });

    return new Response(JSON.stringify({ ok: true, session_id: sessionId, minutes_spent: minutesSpent, daily_cap: cap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await db.from("ani_conversations").insert({
      session_id: sessionId, turn: -1, speaker: "system", model: "system",
      role: "system", topic, message: `ERROR: ${String(e).slice(0, 400)}`, status: "error",
    });
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
